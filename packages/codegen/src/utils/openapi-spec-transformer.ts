import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import type { OpenAPIDocument } from "../openapi/openapi.types";
import type { ExtractedTypes } from "./type-extractor";

/**
 * Transform OpenAPI spec by replacing simple type definitions with union types from config
 *
 * This function identifies simple types (ResourceType, EntitlementType, etc.) in the spec
 * and replaces them with enum values based on the extracted types from customer config.
 *
 * @param spec - The OpenAPI document to transform
 * @param extractedTypes - Types extracted from customer config
 * @returns Transformed OpenAPI document
 */
export function transformSpecForTypes(
  spec: OpenAPIDocument,
  extractedTypes: ExtractedTypes
): OpenAPIDocument {
  // Create a deep copy to avoid mutating the original
  const transformed = JSON.parse(JSON.stringify(spec)) as OpenAPIDocument;

  if (!transformed.components?.schemas) {
    return transformed;
  }

  const schemas = transformed.components.schemas;

  // Map of type names to their enum values
  const typeMappings: Record<string, string[]> = {};

  if (extractedTypes.resourceTypes) {
    typeMappings["ResourceType"] = extractedTypes.resourceTypes;
  }

  if (extractedTypes.entitlementTypes) {
    typeMappings["EntitlementType"] = extractedTypes.entitlementTypes;
  }

  if (extractedTypes.planTypes) {
    typeMappings["PlanType"] = extractedTypes.planTypes;
  }

  if (extractedTypes.limitTypes) {
    typeMappings["LimitType"] = extractedTypes.limitTypes;
  }

  if (extractedTypes.usageLimitTypes) {
    typeMappings["UsageLimitType"] = extractedTypes.usageLimitTypes;
  }

  // Transform each simple type schema
  for (const [typeName, enumValues] of Object.entries(typeMappings)) {
    const schema = schemas[typeName];
    if (schema && !("$ref" in schema)) {
      // Check if this is a simple type (string, number, etc.)
      const schemaObj = schema as
        | OpenAPIV3.SchemaObject
        | OpenAPIV3_1.SchemaObject;

      if (
        schemaObj.type === "string" ||
        schemaObj.type === "number" ||
        schemaObj.type === "integer" ||
        schemaObj.type === "boolean"
      ) {
        // Replace with enum
        if (schemaObj.type === "string") {
          (schemaObj as OpenAPIV3.SchemaObject).enum = enumValues;
        } else {
          // For non-string types, convert enum values to the appropriate type
          if (schemaObj.type === "number" || schemaObj.type === "integer") {
            (schemaObj as OpenAPIV3.SchemaObject).enum = enumValues.map((v) =>
              Number(v)
            );
          } else if (schemaObj.type === "boolean") {
            (schemaObj as OpenAPIV3.SchemaObject).enum = enumValues.map(
              (v) => v === "true"
            );
          }
        }
      }
    }
  }

  return transformed;
}

/**
 * Find simple type schemas in an OpenAPI document
 *
 * @param spec - The OpenAPI document
 * @returns Map of type names to their schema objects
 */
export function findSimpleTypeSchemas(
  spec: OpenAPIDocument
): Map<string, OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject> {
  const simpleTypes = new Map<
    string,
    OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject
  >();

  if (!spec.components?.schemas) {
    return simpleTypes;
  }

  const schemas = spec.components.schemas;

  // Known simple type names
  const simpleTypeNames = [
    "ResourceType",
    "EntitlementType",
    "PlanType",
    "LimitType",
    "UsageLimitType",
  ];

  for (const typeName of simpleTypeNames) {
    const schema = schemas[typeName];
    if (schema && !("$ref" in schema)) {
      const schemaObj = schema as
        | OpenAPIV3.SchemaObject
        | OpenAPIV3_1.SchemaObject;

      // Check if it's a simple type (string, number, integer, boolean)
      if (
        schemaObj.type === "string" ||
        schemaObj.type === "number" ||
        schemaObj.type === "integer" ||
        schemaObj.type === "boolean"
      ) {
        simpleTypes.set(typeName, schemaObj);
      }
    }
  }

  return simpleTypes;
}
