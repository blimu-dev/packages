import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

export type OpenAPIVersion = "3.0" | "3.1" | "unknown";

export type OpenAPIDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;

/**
 * Detect OpenAPI version from a document
 */
export function detectOpenAPIVersion(doc: OpenAPIDocument): OpenAPIVersion {
  const version = doc.openapi;
  if (typeof version !== "string") {
    return "unknown";
  }

  if (version.startsWith("3.1")) {
    return "3.1";
  }

  if (version.startsWith("3.0")) {
    return "3.0";
  }

  return "unknown";
}

/**
 * Check if the OpenAPI version is supported
 */
export function isSupportedVersion(version: OpenAPIVersion): boolean {
  return version === "3.0" || version === "3.1";
}

/**
 * Type guard to check if document is OpenAPI 3.1
 */
export function isOpenAPI31(doc: OpenAPIDocument): doc is OpenAPIV3_1.Document {
  return detectOpenAPIVersion(doc) === "3.1";
}

/**
 * Type guard to check if document is OpenAPI 3.0
 */
export function isOpenAPI30(doc: OpenAPIDocument): doc is OpenAPIV3.Document {
  return detectOpenAPIVersion(doc) === "3.0";
}
