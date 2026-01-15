import { Injectable } from "@nestjs/common";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import {
  IR,
  IRService,
  IROperation,
  IRParam,
  IRRequestBody,
  IRResponse,
  IRSecurityScheme,
  IRModelDef,
  IRSchema,
} from "../ir/ir.types";
import { SchemaConverterService } from "./schema-converter.service";
import { Client } from "../config/config.schema";
import { toPascalCase, toCamelCase } from "../utils/string.utils";
import { IRSchemaKind } from "../ir/ir.types";
import { OpenAPIDocument } from "../openapi/openapi.types";

@Injectable()
export class IrBuilderService {
  constructor(private readonly schemaConverter: SchemaConverterService) {}

  /**
   * Build IR from an OpenAPI document
   * Supports both OpenAPI 3.0 and 3.1
   */
  buildIR(doc: OpenAPIDocument): IR {
    const tags = this.collectTags(doc);
    const securitySchemes = this.collectSecuritySchemes(doc);
    const modelDefs = this.buildStructuredModels(doc);

    // For now, include all tags - filtering will be done per client
    const allowed: Record<string, boolean> = {};
    for (const tag of tags) {
      allowed[tag] = true;
    }

    // Build IR with all operations (this includes extracted inline types in result.modelDefs)
    const result = this.buildIRFromDoc(doc, allowed);
    result.securitySchemes = securitySchemes;
    // Merge component schemas with extracted inline types from operations
    result.modelDefs = [...modelDefs, ...result.modelDefs];
    // Store the OpenAPI document for later use (e.g., saving to SDK package)
    result.openApiDocument = doc;

    return result;
  }

  /**
   * Filter IR based on client configuration
   */
  filterIR(fullIR: IR, client: Client): IR {
    const include = this.compileTagFilters(client.includeTags || []);
    const exclude = this.compileTagFilters(client.excludeTags || []);

    // Filter services and operations based on their original tags
    const filteredServices: IRService[] = [];
    for (const service of fullIR.services) {
      const filteredOps: IROperation[] = [];
      for (const op of service.operations) {
        if (this.shouldIncludeOperation(op.originalTags, include, exclude)) {
          filteredOps.push(op);
        }
      }
      // Only include the service if it has at least one operation after filtering
      if (filteredOps.length > 0) {
        filteredServices.push({
          ...service,
          operations: filteredOps,
        });
      }
    }

    // Filter ModelDefs to only include those referenced by filtered operations
    const filteredIR: IR = {
      services: filteredServices,
      models: fullIR.models,
      securitySchemes: fullIR.securitySchemes,
      modelDefs: fullIR.modelDefs,
      openApiDocument: fullIR.openApiDocument, // Preserve OpenAPI document for spec saving
    };
    filteredIR.modelDefs = this.filterUnusedModelDefs(
      filteredIR,
      fullIR.modelDefs
    );

    return filteredIR;
  }

  /**
   * Detect if a content type indicates streaming
   */
  private detectStreamingContentType(contentType: string): {
    isStreaming: boolean;
    format?: "sse" | "ndjson" | "chunked";
  } {
    const normalized = contentType.toLowerCase().split(";")[0].trim();

    if (normalized === "text/event-stream") {
      return { isStreaming: true, format: "sse" };
    }

    if (
      normalized === "application/x-ndjson" ||
      normalized === "application/x-jsonlines" ||
      normalized === "application/jsonl"
    ) {
      return { isStreaming: true, format: "ndjson" };
    }

    // Check for other streaming indicators
    if (normalized.includes("stream") || normalized.includes("chunked")) {
      return { isStreaming: true, format: "chunked" };
    }

    return { isStreaming: false };
  }

  /**
   * Collect all tags from the OpenAPI document
   */
  private collectTags(doc: OpenAPIDocument): string[] {
    const uniq = new Set<string>();
    // consider untagged as "misc"
    uniq.add("misc");

    if (doc.paths) {
      for (const [path, pathItem] of Object.entries(doc.paths)) {
        if (!pathItem) continue;
        const operations = [
          pathItem.get,
          pathItem.post,
          pathItem.put,
          pathItem.patch,
          pathItem.delete,
          pathItem.options,
          pathItem.head,
          pathItem.trace,
        ];

        for (const op of operations) {
          if (!op || !op.tags) continue;
          for (const tag of op.tags) {
            uniq.add(tag);
          }
        }
      }
    }

    return Array.from(uniq).sort();
  }

  /**
   * Compile regex patterns for tag filtering
   */
  private compileTagFilters(patterns: string[]): RegExp[] {
    return patterns.map((p) => {
      try {
        return new RegExp(p);
      } catch (error) {
        throw new Error(
          `Invalid tag filter pattern "${p}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Determine if an operation should be included based on its original tags
   */
  private shouldIncludeOperation(
    originalTags: string[],
    include: RegExp[],
    exclude: RegExp[]
  ): boolean {
    // If no include patterns, assume all tags are initially included
    let included = include.length === 0;

    // Check include patterns - operation is included if ANY of its tags match ANY include pattern
    if (include.length > 0) {
      for (const tag of originalTags) {
        for (const r of include) {
          if (r.test(tag)) {
            included = true;
            break;
          }
        }
        if (included) {
          break;
        }
      }
    }

    // If not included by include patterns, exclude it
    if (!included) {
      return false;
    }

    // Check exclude patterns - operation is excluded if ANY of its tags match ANY exclude pattern
    if (exclude.length > 0) {
      for (const tag of originalTags) {
        for (const r of exclude) {
          if (r.test(tag)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Build IR structures from OpenAPI document
   */
  private buildIRFromDoc(
    doc: OpenAPIDocument,
    allowed: Record<string, boolean>
  ): IR {
    const servicesMap: Record<string, IRService> = {};
    // Always prepare misc
    servicesMap["misc"] = { tag: "misc", operations: [] };

    // Collect extracted inline types from request bodies and responses
    const extractedTypes: IRModelDef[] = [];
    const seenTypeNames = new Set<string>();

    // Pre-populate seenTypeNames with component schema names to prevent duplicates
    if (doc.components?.schemas) {
      for (const name of Object.keys(doc.components.schemas)) {
        seenTypeNames.add(name);
      }
    }

    const addOp = (
      tag: string,
      op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject,
      method: string,
      path: string
    ) => {
      if (!servicesMap[tag]) {
        servicesMap[tag] = { tag, operations: [] };
      }
      const id = op.operationId || "";
      const { pathParams, queryParams } = this.collectParams(doc, op);
      const { requestBody: reqBody, extractedTypes: reqBodyTypes } =
        this.extractRequestBodyWithTypes(
          doc,
          op,
          tag,
          id,
          method,
          seenTypeNames
        );
      extractedTypes.push(...reqBodyTypes);
      const { response: resp, extractedTypes: respTypes } =
        this.extractResponseWithTypes(doc, op, tag, id, method, seenTypeNames);
      extractedTypes.push(...respTypes);

      // Copy original tags, defaulting to ["misc"] if no tags
      const originalTags =
        op.tags && op.tags.length > 0 ? [...op.tags] : ["misc"];

      servicesMap[tag].operations.push({
        operationID: id,
        method,
        path,
        tag,
        originalTags,
        summary: op.summary || "",
        description: op.description || "",
        deprecated: op.deprecated || false,
        pathParams,
        queryParams,
        requestBody: reqBody,
        response: resp,
      });
    };

    if (doc.paths) {
      for (const [path, pathItem] of Object.entries(doc.paths)) {
        if (!pathItem) continue;
        const operations = [
          { op: pathItem.get, method: "GET" },
          { op: pathItem.post, method: "POST" },
          { op: pathItem.put, method: "PUT" },
          { op: pathItem.patch, method: "PATCH" },
          { op: pathItem.delete, method: "DELETE" },
          { op: pathItem.options, method: "OPTIONS" },
          { op: pathItem.head, method: "HEAD" },
          { op: pathItem.trace, method: "TRACE" },
        ];

        for (const { op, method } of operations) {
          if (!op) continue;
          const t = this.firstAllowedTag(op.tags || [], allowed);
          if (t) {
            addOp(t, op, method, path);
          }
        }
      }
    }

    // Sort services and operations for determinism
    const services = Object.values(servicesMap);
    for (const service of services) {
      service.operations.sort((a, b) => {
        if (a.path === b.path) {
          return a.method.localeCompare(b.method);
        }
        return a.path.localeCompare(b.path);
      });
    }
    services.sort((a, b) => a.tag.localeCompare(b.tag));

    return {
      services,
      models: [],
      securitySchemes: [],
      modelDefs: extractedTypes,
    };
  }

  /**
   * Get the first allowed tag from a list
   */
  /**
   * Derive method name from operation ID, method, and path
   */
  private deriveMethodName(
    operationId: string,
    method: string,
    path: string
  ): string {
    if (operationId) {
      // Strip any prefix up to and including "Controller_"
      const idx = operationId.indexOf("Controller_");
      const cleanedId =
        idx >= 0
          ? operationId.substring(idx + "Controller_".length)
          : operationId;
      // Convert to camelCase
      return toCamelCase(cleanedId);
    }

    // Basic REST-style heuristics
    const hasID = path.includes("{") && path.includes("}");

    switch (method) {
      case "GET":
        return hasID ? "get" : "list";
      case "POST":
        return "create";
      case "PUT":
      case "PATCH":
        return "update";
      case "DELETE":
        return "delete";
      default:
        return method.toLowerCase();
    }
  }

  private firstAllowedTag(
    tags: string[],
    allowed: Record<string, boolean>
  ): string {
    for (const t of tags) {
      if (allowed[t]) {
        return t;
      }
    }
    if (tags.length === 0 && allowed["misc"]) {
      return "misc";
    }
    return "";
  }

  /**
   * Collect security schemes
   */
  private collectSecuritySchemes(doc: OpenAPIDocument): IRSecurityScheme[] {
    if (!doc.components?.securitySchemes) {
      return [];
    }
    // Deterministic order
    const names = Object.keys(doc.components.securitySchemes).sort();
    const out: IRSecurityScheme[] = [];
    for (const name of names) {
      const scheme = doc.components.securitySchemes[name];
      if (!scheme || "$ref" in scheme) continue;

      const sc: IRSecurityScheme = { key: name, type: scheme.type };
      switch (scheme.type) {
        case "http":
          sc.scheme = scheme.scheme;
          sc.bearerFormat = scheme.bearerFormat;
          break;
        case "apiKey":
          sc.in = scheme.in;
          sc.name = scheme.name;
          break;
        case "oauth2":
        case "openIdConnect":
          // Keep minimal; flows are not modeled yet
          break;
      }
      out.push(sc);
    }
    return out;
  }

  /**
   * Collect parameters from an operation
   */
  private collectParams(
    doc: OpenAPIDocument,
    op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ): {
    pathParams: IRParam[];
    queryParams: IRParam[];
  } {
    const pathParams: IRParam[] = [];
    const queryParams: IRParam[] = [];

    if (op.parameters) {
      for (const pr of op.parameters) {
        if (!pr || "$ref" in pr) continue;
        const p = pr as OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
        const schema = this.schemaConverter.schemaRefToIR(doc, p.schema);
        const param: IRParam = {
          name: p.name,
          required: p.required || false,
          schema,
          description: p.description || "",
        };
        if (p.in === "path") {
          pathParams.push(param);
        } else if (p.in === "query") {
          queryParams.push(param);
        }
      }
    }

    // Deterministic order
    pathParams.sort((a, b) => a.name.localeCompare(b.name));
    queryParams.sort((a, b) => a.name.localeCompare(b.name));

    return { pathParams, queryParams };
  }

  /**
   * Extract request body information with inline type extraction
   */
  /**
   * Find if a schema matches a component schema (useful after dereferencing)
   * Returns the component schema name if found, null otherwise
   */
  private findMatchingComponentSchema(
    doc: OpenAPIDocument,
    schema:
      | OpenAPIV3.ReferenceObject
      | OpenAPIV3.SchemaObject
      | OpenAPIV3_1.ReferenceObject
      | OpenAPIV3_1.SchemaObject
      | undefined
  ): string | null {
    if (!schema || !doc.components?.schemas) {
      return null;
    }

    // If it's still a $ref (not dereferenced), extract the name directly
    if ("$ref" in schema && schema.$ref) {
      const ref = schema.$ref;
      if (ref.startsWith("#/components/schemas/")) {
        const name = ref.replace("#/components/schemas/", "");
        if (doc.components.schemas[name]) {
          return name;
        }
      }
    }

    // After dereferencing, compare schema structures
    // Convert the schema to IR for comparison
    const schemaIR = this.schemaConverter.schemaRefToIR(doc, schema);

    // Compare with each component schema
    for (const [name, componentSchema] of Object.entries(
      doc.components.schemas
    )) {
      const componentIR = this.schemaConverter.schemaRefToIR(
        doc,
        componentSchema
      );
      if (this.compareSchemas(schemaIR, componentIR)) {
        return name;
      }
    }

    return null;
  }

  /**
   * Compare two IR schemas for structural equality
   */
  private compareSchemas(schema1: IRSchema, schema2: IRSchema): boolean {
    // Quick check: if kinds don't match, they're different
    if (schema1.kind !== schema2.kind) {
      return false;
    }

    // For refs, compare the ref name
    if (
      schema1.kind === IRSchemaKind.Ref &&
      schema2.kind === IRSchemaKind.Ref
    ) {
      return schema1.ref === schema2.ref;
    }

    // For objects, compare properties
    if (
      schema1.kind === IRSchemaKind.Object &&
      schema2.kind === IRSchemaKind.Object
    ) {
      const props1 = schema1.properties || [];
      const props2 = schema2.properties || [];

      if (props1.length !== props2.length) {
        return false;
      }

      // Compare each property (including required flags)
      const props1Map = new Map(
        props1.map((p) => [p.name, { type: p.type, required: p.required }])
      );
      const props2Map = new Map(
        props2.map((p) => [p.name, { type: p.type, required: p.required }])
      );

      if (props1Map.size !== props2Map.size) {
        return false;
      }

      for (const [name, prop1] of props1Map) {
        const prop2 = props2Map.get(name);
        if (
          !prop2 ||
          prop1.required !== prop2.required ||
          !this.compareSchemas(prop1.type, prop2.type)
        ) {
          return false;
        }
      }

      return true;
    }

    // For arrays, compare items
    if (
      schema1.kind === IRSchemaKind.Array &&
      schema2.kind === IRSchemaKind.Array
    ) {
      if (!schema1.items || !schema2.items) {
        return schema1.items === schema2.items; // Both undefined or both defined
      }
      return this.compareSchemas(schema1.items, schema2.items);
    }

    // For other types, consider them equal if kind matches
    // (This is a simplified comparison - may need refinement)
    return true;
  }

  /**
   * Extract model name from schema if it's a reference, otherwise return null
   * Handles direct refs and arrays of refs
   */
  private extractModelNameFromSchema(schema: IRSchema): string | null {
    if (schema.kind === IRSchemaKind.Ref && schema.ref) {
      return schema.ref;
    }
    // Handle arrays of refs (e.g., Array<SomeModel>)
    if (schema.kind === IRSchemaKind.Array && schema.items) {
      if (schema.items.kind === IRSchemaKind.Ref && schema.items.ref) {
        return schema.items.ref;
      }
    }
    return null;
  }

  /**
   * Generate type name for request/response body
   * Prefers model name from schema reference, falls back to operation-based naming
   */
  private generateTypeName(
    schema: IRSchema,
    tag: string,
    operationId: string,
    method: string,
    path: string,
    suffix: "RequestBody" | "Response"
  ): string {
    // Try to use model name from schema reference first
    const modelName = this.extractModelNameFromSchema(schema);
    if (modelName) {
      return modelName;
    }

    // Fallback to operation-based naming for inline schemas
    const methodName = this.deriveMethodName(operationId, method, path);
    return `${toPascalCase(tag)}${toPascalCase(methodName)}${suffix}`;
  }

  private extractRequestBodyWithTypes(
    doc: OpenAPIDocument,
    op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject,
    tag: string,
    operationId: string,
    method: string,
    seenTypeNames: Set<string>
  ): { requestBody: IRRequestBody | null; extractedTypes: IRModelDef[] } {
    const extractedTypes: IRModelDef[] = [];

    if (!op.requestBody || "$ref" in op.requestBody) {
      return { requestBody: null, extractedTypes: [] };
    }
    const rb = op.requestBody as
      | OpenAPIV3.RequestBodyObject
      | OpenAPIV3_1.RequestBodyObject;

    // Prefer application/json
    if (rb.content?.["application/json"]) {
      const media = rb.content["application/json"];
      const schema = this.schemaConverter.schemaRefToIR(doc, media.schema);

      // Check if this schema matches a component schema (even after dereferencing)
      const componentSchemaName = this.findMatchingComponentSchema(
        doc,
        media.schema
      );

      if (componentSchemaName) {
        // Use the component schema name instead of generating a new one
        return {
          requestBody: {
            contentType: "application/json",
            typeTS: "",
            schema: {
              kind: IRSchemaKind.Ref,
              ref: componentSchemaName,
              nullable: false,
            },
            required: rb.required || false,
          },
          extractedTypes: [],
        };
      }

      // Generate type name: prefer model name, fallback to operation-based
      const typeName = this.generateTypeName(
        schema,
        tag,
        operationId,
        method,
        (op as unknown as { path: string }).path,
        "RequestBody"
      );

      // If schema is an inline object type, extract it
      if (schema.kind === IRSchemaKind.Object && !seenTypeNames.has(typeName)) {
        seenTypeNames.add(typeName);
        extractedTypes.push({
          name: typeName,
          schema,
          annotations: this.schemaConverter.extractAnnotations(media.schema),
        });
        return {
          requestBody: {
            contentType: "application/json",
            typeTS: "",
            schema: { kind: IRSchemaKind.Ref, ref: typeName, nullable: false },
            required: rb.required || false,
          },
          extractedTypes,
        };
      }

      return {
        requestBody: {
          contentType: "application/json",
          typeTS: "",
          schema,
          required: rb.required || false,
        },
        extractedTypes: [],
      };
    }

    // Fallback to original extractRequestBody for other content types
    const reqBody = this.extractRequestBody(doc, op);
    return { requestBody: reqBody, extractedTypes: [] };
  }

  /**
   * Extract request body information (legacy method, kept for fallback)
   */
  private extractRequestBody(
    doc: OpenAPIDocument,
    op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ): IRRequestBody | null {
    if (!op.requestBody || "$ref" in op.requestBody) {
      return null;
    }
    const rb = op.requestBody as
      | OpenAPIV3.RequestBodyObject
      | OpenAPIV3_1.RequestBodyObject;
    // Prefer application/json
    if (rb.content?.["application/json"]) {
      const media = rb.content["application/json"];
      return {
        contentType: "application/json",
        typeTS: "",
        schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
        required: rb.required || false,
      };
    }
    if (rb.content?.["application/x-www-form-urlencoded"]) {
      const media = rb.content["application/x-www-form-urlencoded"];
      return {
        contentType: "application/x-www-form-urlencoded",
        typeTS: "",
        schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
        required: rb.required || false,
      };
    }
    if (rb.content?.["multipart/form-data"]) {
      return {
        contentType: "multipart/form-data",
        typeTS: "",
        schema: { kind: "unknown" as any, nullable: false },
        required: rb.required || false,
      };
    }
    // Fallback to the first available media type
    if (rb.content) {
      const firstContentType = Object.keys(rb.content)[0];
      const media = rb.content[firstContentType];
      return {
        contentType: firstContentType,
        typeTS: "",
        schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
        required: rb.required || false,
      };
    }
    return null;
  }

  /**
   * Extract response information with inline type extraction
   */
  private extractResponseWithTypes(
    doc: OpenAPIDocument,
    op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject,
    tag: string,
    operationId: string,
    method: string,
    seenTypeNames: Set<string>
  ): { response: IRResponse; extractedTypes: IRModelDef[] } {
    const extractedTypes: IRModelDef[] = [];

    if (!op.responses) {
      return {
        response: {
          typeTS: "unknown",
          schema: { kind: IRSchemaKind.Unknown, nullable: false },
          description: "",
          isStreaming: false,
          contentType: "",
        },
        extractedTypes: [],
      };
    }

    // Choose 200, 201, or any 2xx; 204 => void
    const tryCodes = ["200", "201"];
    for (const code of tryCodes) {
      const response = op.responses[code];
      if (response && !("$ref" in response)) {
        const resp = response as
          | OpenAPIV3.ResponseObject
          | OpenAPIV3_1.ResponseObject;

        // Check all content types for streaming
        if (resp.content) {
          for (const [contentType, media] of Object.entries(resp.content)) {
            const streaming = this.detectStreamingContentType(contentType);
            const schema = this.schemaConverter.schemaRefToIR(
              doc,
              media.schema
            );

            // If streaming, return immediately with streaming flags
            if (streaming.isStreaming) {
              return {
                response: {
                  typeTS: "",
                  schema,
                  description: resp.description || "",
                  isStreaming: true,
                  contentType,
                  streamingFormat: streaming.format,
                },
                extractedTypes: [],
              };
            }

            // For non-streaming JSON, check if we should extract inline types
            if (contentType === "application/json") {
              // Check if this schema matches a component schema (even after dereferencing)
              const componentSchemaName = this.findMatchingComponentSchema(
                doc,
                media.schema
              );

              if (componentSchemaName) {
                // Use the component schema name instead of generating a new one
                return {
                  response: {
                    typeTS: "",
                    schema: {
                      kind: IRSchemaKind.Ref,
                      ref: componentSchemaName,
                      nullable: false,
                    },
                    description: resp.description || "",
                    isStreaming: false,
                    contentType,
                  },
                  extractedTypes: [],
                };
              }

              // Generate type name: prefer model name, fallback to operation-based
              const typeName = this.generateTypeName(
                schema,
                tag,
                operationId,
                method,
                (op as unknown as { path: string }).path,
                "Response"
              );

              // If schema is an inline object type, extract it
              if (
                schema.kind === IRSchemaKind.Object &&
                !seenTypeNames.has(typeName)
              ) {
                seenTypeNames.add(typeName);
                extractedTypes.push({
                  name: typeName,
                  schema,
                  annotations: this.schemaConverter.extractAnnotations(
                    media.schema
                  ),
                });
                return {
                  response: {
                    typeTS: "",
                    schema: {
                      kind: IRSchemaKind.Ref,
                      ref: typeName,
                      nullable: false,
                    },
                    description: resp.description || "",
                    isStreaming: false,
                    contentType,
                  },
                  extractedTypes,
                };
              }

              return {
                response: {
                  typeTS: "",
                  schema,
                  description: resp.description || "",
                  isStreaming: false,
                  contentType,
                },
                extractedTypes: [],
              };
            }
          }

          // Fallback: use first content type
          const firstContentType = Object.keys(resp.content)[0];
          const firstMedia = resp.content[firstContentType];
          const firstSchema = this.schemaConverter.schemaRefToIR(
            doc,
            firstMedia.schema
          );
          const firstStreaming =
            this.detectStreamingContentType(firstContentType);

          return {
            response: {
              typeTS: "",
              schema: firstSchema,
              description: resp.description || "",
              isStreaming: firstStreaming.isStreaming,
              contentType: firstContentType,
              streamingFormat: firstStreaming.format,
            },
            extractedTypes: [],
          };
        }

        // No content
        return {
          response: {
            typeTS: "void",
            schema: { kind: IRSchemaKind.Unknown, nullable: false },
            description: resp.description || "",
            isStreaming: false,
            contentType: "",
          },
          extractedTypes: [],
        };
      }
    }

    // Fallback to original extractResponse
    const resp = this.extractResponse(doc, op);
    return { response: resp, extractedTypes: [] };
  }

  /**
   * Extract response information (legacy method, kept for fallback)
   */
  private extractResponse(
    doc: OpenAPIDocument,
    op: OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject
  ): IRResponse {
    if (!op.responses) {
      return {
        typeTS: "unknown",
        schema: { kind: IRSchemaKind.Unknown, nullable: false },
        description: "",
        isStreaming: false,
        contentType: "",
      };
    }

    // Choose 200, 201, or any 2xx; 204 => void
    const tryCodes = ["200", "201"];
    for (const code of tryCodes) {
      const response = op.responses[code];
      if (response && !("$ref" in response)) {
        const resp = response as
          | OpenAPIV3.ResponseObject
          | OpenAPIV3_1.ResponseObject;

        // Check for streaming content types first
        if (resp.content) {
          for (const [contentType, media] of Object.entries(resp.content)) {
            const streaming = this.detectStreamingContentType(contentType);
            if (streaming.isStreaming) {
              return {
                typeTS: "",
                schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
                description: resp.description || "",
                isStreaming: true,
                contentType,
                streamingFormat: streaming.format,
              };
            }
          }

          // Non-streaming JSON
          if (resp.content["application/json"]) {
            const media = resp.content["application/json"];
            return {
              typeTS: "",
              schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
              description: resp.description || "",
              isStreaming: false,
              contentType: "application/json",
            };
          }

          // Fallback to any content
          const firstContentType = Object.keys(resp.content)[0];
          const media = resp.content[firstContentType];
          const streaming = this.detectStreamingContentType(firstContentType);
          return {
            typeTS: "",
            schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
            description: resp.description || "",
            isStreaming: streaming.isStreaming,
            contentType: firstContentType,
            streamingFormat: streaming.format,
          };
        }

        return {
          typeTS: "void",
          schema: { kind: IRSchemaKind.Unknown, nullable: false },
          description: resp.description || "",
          isStreaming: false,
          contentType: "",
        };
      }
    }

    // any 2xx
    for (const [code, response] of Object.entries(op.responses)) {
      if (
        code.length === 3 &&
        code[0] === "2" &&
        response &&
        !("$ref" in response)
      ) {
        const resp = response as
          | OpenAPIV3.ResponseObject
          | OpenAPIV3_1.ResponseObject;
        if (code === "204") {
          return {
            typeTS: "void",
            schema: { kind: IRSchemaKind.Unknown, nullable: false },
            description: resp.description || "",
            isStreaming: false,
            contentType: "",
          };
        }

        if (resp.content) {
          // Check for streaming
          for (const [contentType, media] of Object.entries(resp.content)) {
            const streaming = this.detectStreamingContentType(contentType);
            if (streaming.isStreaming) {
              return {
                typeTS: "",
                schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
                description: resp.description || "",
                isStreaming: true,
                contentType,
                streamingFormat: streaming.format,
              };
            }
          }

          // Non-streaming JSON
          if (resp.content["application/json"]) {
            const media = resp.content["application/json"];
            return {
              typeTS: "",
              schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
              description: resp.description || "",
              isStreaming: false,
              contentType: "application/json",
            };
          }

          // Fallback to first content type
          const firstContentType = Object.keys(resp.content)[0];
          const media = resp.content[firstContentType];
          const streaming = this.detectStreamingContentType(firstContentType);
          return {
            typeTS: "",
            schema: this.schemaConverter.schemaRefToIR(doc, media.schema),
            description: resp.description || "",
            isStreaming: streaming.isStreaming,
            contentType: firstContentType,
            streamingFormat: streaming.format,
          };
        }
      }
    }

    return {
      typeTS: "unknown",
      schema: { kind: IRSchemaKind.Unknown, nullable: false },
      description: "",
      isStreaming: false,
      contentType: "",
    };
  }

  /**
   * Build structured models from components.schemas
   */
  private buildStructuredModels(doc: OpenAPIDocument): IRModelDef[] {
    const out: IRModelDef[] = [];
    if (!doc.components?.schemas) {
      return out;
    }
    const names = Object.keys(doc.components.schemas).sort();
    const seen = new Set<string>();

    // Pre-populate seen with component names to prevent inline duplicates
    for (const name of names) {
      seen.add(name);
    }

    for (const name of names) {
      const sr = doc.components.schemas[name];
      // For component schemas, use schemaRefToIR to get the actual schema without creating inline models
      const schema = this.schemaConverter.schemaRefToIR(doc, sr);
      out.push({
        name,
        schema,
        annotations: this.schemaConverter.extractAnnotations(sr),
      });
    }
    return out;
  }

  /**
   * Filter unused ModelDefs
   */
  private filterUnusedModelDefs(
    filteredIR: IR,
    allModelDefs: IRModelDef[]
  ): IRModelDef[] {
    // Build a map of all ModelDefs for quick lookup
    const modelDefMap = new Map<string, IRModelDef>();
    for (const md of allModelDefs) {
      modelDefMap.set(md.name, md);
    }

    // Collect all schema references from filtered operations
    const referenced = new Set<string>();
    const visited = new Set<string>(); // Track visited refs to avoid cycles

    // Helper function to collect references from a schema recursively
    const collectRefs = (schema: IRSchema) => {
      if (schema.kind === "ref" && schema.ref) {
        const refName = schema.ref;
        referenced.add(refName);
        // If this ref points to a ModelDef and we haven't visited it, collect its transitive references
        if (!visited.has(refName)) {
          visited.add(refName);
          const md = modelDefMap.get(refName);
          if (md) {
            collectRefs(md.schema);
          }
        }
      }
      if (schema.items) {
        collectRefs(schema.items);
      }
      if (schema.additionalProperties) {
        collectRefs(schema.additionalProperties);
      }
      if (schema.oneOf) {
        for (const sub of schema.oneOf) {
          collectRefs(sub);
        }
      }
      if (schema.anyOf) {
        for (const sub of schema.anyOf) {
          collectRefs(sub);
        }
      }
      if (schema.allOf) {
        for (const sub of schema.allOf) {
          collectRefs(sub);
        }
      }
      if (schema.not) {
        collectRefs(schema.not);
      }
      if (schema.properties) {
        for (const field of schema.properties) {
          collectRefs(field.type);
        }
      }
    };

    // Collect references from all operations
    for (const service of filteredIR.services) {
      for (const op of service.operations) {
        // Collect from path params
        for (const param of op.pathParams) {
          collectRefs(param.schema);
        }
        // Collect from query params
        for (const param of op.queryParams) {
          collectRefs(param.schema);
        }
        // Collect from request body
        if (op.requestBody) {
          collectRefs(op.requestBody.schema);
        }
        // Collect from response
        collectRefs(op.response.schema);
      }
    }

    // Filter ModelDefs to only include referenced ones
    return allModelDefs.filter((md) => referenced.has(md.name));
  }
}
