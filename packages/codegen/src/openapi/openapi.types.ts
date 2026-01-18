import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import {
  type OpenAPIDocument,
  isOpenAPI31,
  isOpenAPI30,
} from "./openapi-version.utils";

// Re-export the union type and type guards for convenience
export type { OpenAPIDocument };
export { isOpenAPI31, isOpenAPI30 };

/**
 * Normalized interface for accessing common OpenAPI document properties
 * regardless of version (3.0 or 3.1)
 */
export interface NormalizedOpenAPIDocument {
  openapi: string;
  info: OpenAPIV3.InfoObject | OpenAPIV3_1.InfoObject;
  paths: OpenAPIV3.PathsObject | OpenAPIV3_1.PathsObject | undefined;
  components?: OpenAPIV3.ComponentsObject | OpenAPIV3_1.ComponentsObject | undefined;
  servers?: (OpenAPIV3.ServerObject | OpenAPIV3_1.ServerObject)[] | undefined;
}

/**
 * Normalize an OpenAPI document to a common interface
 * This allows accessing common properties without version-specific checks
 */
export function normalizeDocument(
  doc: OpenAPIDocument
): NormalizedOpenAPIDocument {
  return {
    openapi: doc.openapi,
    info: doc.info,
    paths: doc.paths,
    components: doc.components,
    servers: doc.servers,
  };
}

/**
 * Get the schema object from a reference or direct schema
 * Works with both OpenAPI 3.0 and 3.1
 */
export function getSchemaFromRef(
  doc: OpenAPIDocument,
  schemaRef:
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.SchemaObject
    | OpenAPIV3_1.ReferenceObject
    | OpenAPIV3_1.SchemaObject
    | undefined
): OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject | undefined {
  if (!schemaRef || typeof schemaRef !== "object") {
    return undefined;
  }

  // Handle $ref
  if ("$ref" in schemaRef && schemaRef.$ref) {
    const ref = schemaRef.$ref;
    if (ref.startsWith("#/components/schemas/")) {
      const name = ref.replace("#/components/schemas/", "");
      if (doc.components?.schemas?.[name]) {
        const schema = doc.components.schemas[name];
        if ("$ref" in schema) {
          // Recursive reference
          return getSchemaFromRef(doc, schema);
        }
        return schema as OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
      }
    }
    return undefined;
  }

  return schemaRef as OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
}

/**
 * Check if a schema is nullable (works for both 3.0 and 3.1)
 */
export function isSchemaNullable(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject | undefined
): boolean {
  if (!schema) {
    return false;
  }

  // OpenAPI 3.0: uses nullable property
  if ("nullable" in schema && schema.nullable === true) {
    return true;
  }

  // OpenAPI 3.1: uses type array with 'null'
  if ("type" in schema && Array.isArray(schema.type)) {
    return schema.type.includes("null");
  }

  return false;
}

/**
 * Get the type from a schema (normalized for both versions)
 */
export function getSchemaType(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject | undefined
): string | string[] | undefined {
  if (!schema || !("type" in schema)) {
    return undefined;
  }

  return schema.type;
}
