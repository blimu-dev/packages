import { IROperation, IRSchema, IRSchemaKind } from "../../ir/ir.types";
import { Client } from "../../config/config.schema";
import { toPascalCase, toCamelCase } from "../../utils/string.utils";

/**
 * Convert an IR schema to TypeScript type string
 */
/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x60;/g, "`")
    .replace(/&#96;/g, "`")
    .replace(/&amp;/g, "&");
}

export function schemaToTSType(
  s: IRSchema,
  predefinedTypes?: Array<{ type: string; package: string }>,
  modelDefs?: Array<{ name: string; schema: IRSchema }>,
  isSameFile: boolean = false
): string {
  // Base type string without nullability; append null later
  let t: string;
  switch (s.kind) {
    case IRSchemaKind.String:
      if (s.format === "binary") {
        t = "Blob";
      } else {
        t = "string";
      }
      break;
    case IRSchemaKind.Number:
    case IRSchemaKind.Integer:
      t = "number";
      break;
    case IRSchemaKind.Boolean:
      t = "boolean";
      break;
    case IRSchemaKind.Null:
      t = "null";
      break;
    case IRSchemaKind.Ref:
      if (s.ref) {
        // Check if this is a predefined type
        if (predefinedTypes?.some((pt) => pt.type === s.ref)) {
          t = s.ref; // Use type name directly for predefined types
        } else if (isSameFile && modelDefs) {
          // Only check for local types if we're in the same file (schema.ts)
          // Check if this type is defined locally in the same file
          const localType = modelDefs.find((md) => md.name === s.ref);
          if (localType) {
            // Type is defined in the same file, use it directly without Schema. prefix
            t = s.ref;
          } else {
            // Type is not defined locally, use Schema. prefix
            t = "Schema." + s.ref;
          }
        } else {
          // Not in same file or no modelDefs, use Schema. prefix
          t = "Schema." + s.ref;
        }
      } else {
        t = "unknown";
      }
      break;
    case IRSchemaKind.Array:
      if (s.items) {
        const inner = schemaToTSType(s.items, predefinedTypes, modelDefs);
        // Wrap unions/intersections in parentheses inside Array<>
        if (inner.includes(" | ") || inner.includes(" & ")) {
          t = `Array<(${inner})>`;
        } else {
          t = `Array<${inner}>`;
        }
      } else {
        t = "Array<unknown>";
      }
      break;
    case IRSchemaKind.OneOf:
      if (s.oneOf) {
        const parts = s.oneOf.map((sub) =>
          schemaToTSType(sub, predefinedTypes, modelDefs)
        );
        t = parts.join(" | ");
      } else {
        t = "unknown";
      }
      break;
    case IRSchemaKind.AnyOf:
      if (s.anyOf) {
        const parts = s.anyOf.map((sub) =>
          schemaToTSType(sub, predefinedTypes, modelDefs)
        );
        t = parts.join(" | ");
      } else {
        t = "unknown";
      }
      break;
    case IRSchemaKind.AllOf:
      if (s.allOf) {
        const parts = s.allOf.map((sub) =>
          schemaToTSType(sub, predefinedTypes, modelDefs)
        );
        t = parts.join(" & ");
      } else {
        t = "unknown";
      }
      break;
    case IRSchemaKind.Enum:
      if (s.enumValues && s.enumValues.length > 0) {
        const vals: string[] = [];
        switch (s.enumBase) {
          case IRSchemaKind.Number:
          case IRSchemaKind.Integer:
            for (const v of s.enumValues) {
              vals.push(v);
            }
            break;
          case IRSchemaKind.Boolean:
            for (const v of s.enumValues) {
              if (v === "true" || v === "false") {
                vals.push(v);
              } else {
                vals.push(`"${v}"`);
              }
            }
            break;
          default:
            for (const v of s.enumValues) {
              vals.push(`"${v}"`);
            }
        }
        t = vals.join(" | ");
      } else {
        t = "unknown";
      }
      break;
    case IRSchemaKind.Object:
      if (!s.properties || s.properties.length === 0) {
        t = "Record<string, unknown>";
      } else {
        // Inline object shape for rare cases; nested ones should be refs
        const parts: string[] = [];
        for (const f of s.properties) {
          const ft = schemaToTSType(
            f.type,
            predefinedTypes,
            modelDefs,
            isSameFile
          );
          if (f.required) {
            parts.push(`${f.name}: ${ft}`);
          } else {
            parts.push(`${f.name}?: ${ft}`);
          }
        }
        t = "{ " + parts.join("; ") + " }";
      }
      break;
    default:
      t = "unknown";
  }
  if (s.nullable && t !== "null") {
    t += " | null";
  }
  // Decode any HTML entities that might be in the type string
  return decodeHtmlEntities(t);
}

/**
 * Derive method name using basic REST-style heuristics
 */
export function deriveMethodName(op: IROperation): string {
  // Basic REST-style heuristics
  const path = op.path;
  const hasID = path.includes("{") && path.includes("}");

  if (op.operationID) {
    return toCamelCase(op.operationID);
  }

  switch (op.method) {
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
      return op.method.toLowerCase();
  }
}

/**
 * Resolve method name using optional parser function, then operationId, then heuristic
 */
export async function resolveMethodName(
  client: Client,
  op: IROperation
): Promise<string> {
  // Try function-based parser if provided
  if (client.operationIdParser) {
    try {
      const name = await client.operationIdParser(
        op.operationID,
        op.method,
        op.path
      );
      if (name) {
        return toCamelCase(name);
      }
    } catch {
      // Parser failed, continue with defaults
    }
  }

  // Default parse of operationId
  const defaultParsed = defaultParseOperationID(op.operationID);
  if (defaultParsed) {
    return toCamelCase(defaultParsed);
  }

  return deriveMethodName(op);
}

/**
 * Default parse operation ID
 */
function defaultParseOperationID(opID: string): string {
  if (!opID) {
    return "";
  }
  // Strip any prefix up to and including "Controller_"
  const idx = opID.indexOf("Controller_");
  if (idx >= 0) {
    return opID.substring(idx + "Controller_".length);
  }
  return opID;
}

/**
 * Build path template converts OpenAPI path to TypeScript template literal
 */
export function buildPathTemplate(op: IROperation): string {
  // Convert /foo/{id}/bar/{slug} -> `/foo/${encodeURIComponent(id)}/bar/${encodeURIComponent(slug)}`
  let path = op.path;
  let result = "`";
  for (let i = 0; i < path.length; i++) {
    if (path[i] === "{") {
      // read name
      let j = i + 1;
      while (j < path.length && path[j] !== "}") {
        j++;
      }
      if (j < path.length) {
        const name = path.substring(i + 1, j);
        result += `\${encodeURIComponent(${name})}`;
        i = j;
        continue;
      }
    }
    result += path[i];
  }
  result += "`";
  return result;
}

/**
 * Build query key base returns a TS string literal for the base of a react-query key
 */
export function buildQueryKeyBase(op: IROperation): string {
  const path = op.path;
  // Split by '/'; skip parameter placeholders like {id}
  const parts = path.split("/");
  const baseParts: string[] = [];
  for (const p of parts) {
    if (p === "") {
      // leading slash
      continue;
    }
    if (p.startsWith("{") && p.endsWith("}")) {
      continue;
    }
    baseParts.push(p);
  }
  const base = baseParts.join("/");
  return `'${base}'`;
}

/**
 * Order path params extracts path parameter order as they appear in the path
 */
export function orderPathParams(op: IROperation) {
  const ordered: typeof op.pathParams = [];
  const index = new Map<string, number>();
  for (let i = 0; i < op.pathParams.length; i++) {
    index.set(op.pathParams[i].name, i);
  }
  const path = op.path;
  for (let i = 0; i < path.length; i++) {
    if (path[i] === "{") {
      let j = i + 1;
      while (j < path.length && path[j] !== "}") {
        j++;
      }
      if (j < path.length) {
        const name = path.substring(i + 1, j);
        const idx = index.get(name);
        if (idx !== undefined) {
          ordered.push(op.pathParams[idx]);
        }
        i = j;
        continue;
      }
    }
  }
  return ordered;
}

/**
 * Build method signature constructs the TS parameter list
 */
/**
 * Convert schema to TypeScript type, handling simple type refs
 * Simple types are now exported directly from schema.ts (not in SchemaTypes namespace)
 * So we just use Schema.TypeName for all types
 */
export function schemaToTSTypeWithSimpleTypes(
  s: IRSchema,
  modelDefs?: Array<{ name: string; schema: IRSchema }>,
  predefinedTypes?: Array<{ type: string; package: string }>,
  isSameFile: boolean = false
): string {
  // Use schemaToTSType with predefined types and modelDefs
  // isSameFile should be true when generating schema.ts, false for service files
  return schemaToTSType(s, predefinedTypes, modelDefs, isSameFile);
}

export function buildMethodSignature(
  op: IROperation,
  methodName: string,
  modelDefs?: Array<{ name: string; schema: IRSchema }>,
  predefinedTypes?: Array<{ type: string; package: string }>,
  isSameFile: boolean = false
): string[] {
  const parts: string[] = [];
  // path params as positional args
  for (const p of orderPathParams(op)) {
    parts.push(
      `${p.name}: ${schemaToTSTypeWithSimpleTypes(p.schema, modelDefs, predefinedTypes, isSameFile)}`
    );
  }
  // query object
  if (op.queryParams.length > 0) {
    // Reference named interface defined in schema.ts
    const queryType = toPascalCase(op.tag) + toPascalCase(methodName) + "Query";
    parts.push(`query?: Schema.${queryType}`);
  }
  // body
  if (op.requestBody) {
    const opt = op.requestBody.required === true ? "" : "?";
    parts.push(
      `body${opt}: ${schemaToTSTypeWithSimpleTypes(op.requestBody.schema, modelDefs, predefinedTypes, isSameFile)}`
    );
  }
  // init
  parts.push('init?: Omit<RequestInit, "method" | "body">');

  return parts;
}

/**
 * Collect predefined types used in a schema file
 * Checks all model definitions (interfaces, types, etc.) to find which predefined types are referenced
 */
export function collectPredefinedTypesUsedInSchema(
  modelDefs: Array<{ name: string; schema: IRSchema }>,
  predefinedTypes?: Array<{ type: string; package: string }>
): Array<{ type: string; package: string }> {
  if (!predefinedTypes || predefinedTypes.length === 0) {
    return [];
  }

  const usedTypes = new Set<string>();

  // Helper to resolve a ref to its actual schema
  const resolveRef = (ref: string): IRSchema | null => {
    const modelDef = modelDefs.find((md) => md.name === ref);
    return modelDef ? modelDef.schema : null;
  };

  // Helper to check if a schema uses a predefined type
  const checkSchema = (schema: IRSchema) => {
    if (schema.kind === "ref" && schema.ref) {
      // Check if the ref itself is a predefined type
      const isPredefined = predefinedTypes.some((pt) => pt.type === schema.ref);
      if (isPredefined) {
        usedTypes.add(schema.ref);
      } else {
        // Resolve the ref and check its contents
        const resolved = resolveRef(schema.ref);
        if (resolved) {
          checkSchema(resolved);
        }
      }
    } else if (schema.kind === "array" && schema.items) {
      checkSchema(schema.items);
    } else if (schema.kind === "object" && schema.properties) {
      for (const prop of schema.properties) {
        checkSchema(prop.type);
      }
    } else if (schema.kind === "oneOf" && schema.oneOf) {
      for (const sub of schema.oneOf) {
        checkSchema(sub);
      }
    } else if (schema.kind === "anyOf" && schema.anyOf) {
      for (const sub of schema.anyOf) {
        checkSchema(sub);
      }
    } else if (schema.kind === "allOf" && schema.allOf) {
      for (const sub of schema.allOf) {
        checkSchema(sub);
      }
    }
  };

  // Check all model definitions in the schema file
  for (const modelDef of modelDefs) {
    checkSchema(modelDef.schema);
  }

  // Return only the predefined types that were actually used
  return predefinedTypes.filter((pt) => usedTypes.has(pt.type));
}

/**
 * Collect predefined types used in a service's operations
 * Checks path parameters, query parameters, request body, and response types
 */
export function collectPredefinedTypesUsedInService(
  service: { operations: IROperation[] },
  predefinedTypes?: Array<{ type: string; package: string }>,
  modelDefs?: Array<{ name: string; schema: IRSchema }>
): Array<{ type: string; package: string }> {
  if (!predefinedTypes || predefinedTypes.length === 0) {
    return [];
  }

  const usedTypes = new Set<string>();

  // Helper to resolve a ref to its actual schema
  const resolveRef = (ref: string): IRSchema | null => {
    if (!modelDefs) return null;
    const modelDef = modelDefs.find((md) => md.name === ref);
    return modelDef ? modelDef.schema : null;
  };

  // Helper to check if a schema uses a predefined type
  const checkSchema = (schema: IRSchema) => {
    if (schema.kind === "ref" && schema.ref) {
      // Check if the ref itself is a predefined type
      const isPredefined = predefinedTypes.some((pt) => pt.type === schema.ref);
      if (isPredefined) {
        usedTypes.add(schema.ref);
      } else {
        // Resolve the ref and check its contents
        const resolved = resolveRef(schema.ref);
        if (resolved) {
          checkSchema(resolved);
        }
      }
    } else if (schema.kind === "array" && schema.items) {
      checkSchema(schema.items);
    } else if (schema.kind === "object" && schema.properties) {
      for (const prop of schema.properties) {
        checkSchema(prop.type);
      }
    } else if (schema.kind === "oneOf" && schema.oneOf) {
      for (const sub of schema.oneOf) {
        checkSchema(sub);
      }
    } else if (schema.kind === "anyOf" && schema.anyOf) {
      for (const sub of schema.anyOf) {
        checkSchema(sub);
      }
    } else if (schema.kind === "allOf" && schema.allOf) {
      for (const sub of schema.allOf) {
        checkSchema(sub);
      }
    }
  };

  // Check all operations in the service
  // Note: We only check path parameters because:
  // - Query parameters use Schema.QueryType interfaces (defined in schema.ts which already imports predefined types)
  // - Request body uses Schema.BodyType interfaces (defined in schema.ts which already imports predefined types)
  // - Response uses Schema.ResponseType (defined in schema.ts which already imports predefined types)
  // Only path parameters use predefined types directly in the method signature
  for (const op of service.operations) {
    // Check path parameters (these are used directly in method signatures)
    for (const param of op.pathParams) {
      checkSchema(param.schema);
    }
    // Note: We don't check query params, request body, or response because:
    // - Query params use Schema.QueryType interfaces
    // - Request body uses Schema.BodyType interfaces
    // - Response uses Schema.ResponseType
    // These Schema types are defined in schema.ts which already imports the predefined types.
    // The service file only needs to import predefined types used directly in method signatures (path params).
  }

  // Return only the predefined types that were actually used
  return predefinedTypes.filter((pt) => usedTypes.has(pt.type));
}

/**
 * Query key args returns the parameter names (no types) in the same order as the method parameters
 */
export function queryKeyArgs(op: IROperation): string[] {
  const out: string[] = [];
  for (const p of orderPathParams(op)) {
    out.push(p.name);
  }
  if (op.queryParams.length > 0) {
    out.push("query");
  }
  if (op.requestBody) {
    out.push("body");
  }
  return out;
}

/**
 * Quote TS property name quotes TypeScript property names that contain special characters
 */
export function quoteTSPropertyName(name: string): string {
  // Check if the name contains characters that require quoting
  let needsQuoting = false;
  for (const char of name) {
    if (
      !(
        (char >= "a" && char <= "z") ||
        (char >= "A" && char <= "Z") ||
        (char >= "0" && char <= "9") ||
        char === "_" ||
        char === "$"
      )
    ) {
      needsQuoting = true;
      break;
    }
  }

  // Also quote if the name starts with a number
  if (name.length > 0 && name[0] >= "0" && name[0] <= "9") {
    needsQuoting = true;
  }

  if (needsQuoting) {
    return `"${name}"`;
  }
  return name;
}

// Re-export schemaToSchema from dedicated file (backward compatible)
export { schemaToSchema, schemaToZodSchema } from "./schema-converter";

/**
 * Check if an operation has a streaming response
 */
export function isStreamingOperation(op: IROperation): boolean {
  return op.response.isStreaming === true;
}

/**
 * Get the item type for a streaming response
 * For streaming, we typically want the item type from an array schema
 */
export function getStreamingItemType(op: IROperation): string {
  const schema = op.response.schema;

  // If it's an array, return the item type
  if (schema.kind === IRSchemaKind.Array && schema.items) {
    return schemaToTSType(schema.items);
  }

  // For SSE, the data field is typically a string
  if (op.response.streamingFormat === "sse") {
    return "string";
  }

  // Default: return the schema type itself
  return schemaToTSType(schema);
}
