import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Common test utilities for OpenAPI testing
 */

export function createMockOpenAPI30Document(
  overrides?: Partial<OpenAPIV3.Document>
): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
    ...overrides,
  };
}

export function createMockOpenAPI31Document(
  overrides?: Partial<OpenAPIV3_1.Document>
): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
    ...overrides,
  };
}

export function createMockSchema30(
  overrides?: Partial<OpenAPIV3.SchemaObject>
): OpenAPIV3.SchemaObject {
  return {
    type: 'string',
    ...overrides,
  } as OpenAPIV3.SchemaObject;
}

export function createMockSchema31(
  overrides?: Partial<OpenAPIV3_1.SchemaObject>
): OpenAPIV3_1.SchemaObject {
  return {
    type: 'string',
    ...overrides,
  } as OpenAPIV3_1.SchemaObject;
}
