import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

/**
 * Helper to create mock schemas for testing
 */

export function createNullableSchema30(
  baseType: "string" | "number" | "integer" | "boolean" = "string"
): OpenAPIV3.SchemaObject {
  return {
    type: baseType,
    nullable: true,
  };
}

export function createNullableSchema31(
  baseType: "string" | "number" | "integer" | "boolean" = "string"
): OpenAPIV3_1.SchemaObject {
  return {
    type: [baseType, "null"],
  };
}

export function createArraySchema30(
  items: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): OpenAPIV3.SchemaObject {
  return {
    type: "array",
    items,
  };
}

export function createArraySchema31(
  items: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject
): OpenAPIV3_1.SchemaObject {
  return {
    type: "array",
    items,
  };
}

export function createObjectSchema30(
  properties?: Record<
    string,
    OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  >,
  required?: string[]
): OpenAPIV3.SchemaObject {
  return {
    type: "object",
    properties: properties || {},
    required: required || [],
  };
}

export function createObjectSchema31(
  properties?: Record<
    string,
    OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject
  >,
  required?: string[]
): OpenAPIV3_1.SchemaObject {
  return {
    type: "object",
    properties: properties || {},
    required: required || [],
  };
}

export function createEnumSchema30(
  values: (string | number)[],
  type?: "string" | "number" | "integer"
): OpenAPIV3.SchemaObject {
  return {
    type: type || (typeof values[0] === "string" ? "string" : "number"),
    enum: values,
  };
}

export function createEnumSchema31(
  values: (string | number)[],
  type?: "string" | "number" | "integer" | ("string" | "number" | "integer")[]
): OpenAPIV3_1.SchemaObject {
  return {
    type: type || (typeof values[0] === "string" ? "string" : "number"),
    enum: values,
  };
}
