import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Helper to create mock OpenAPI documents for testing
 */

export function createMockDocument30(
  paths?: OpenAPIV3.PathsObject,
  components?: OpenAPIV3.ComponentsObject
): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: paths || {},
    ...(components !== undefined && { components }),
  };
}

export function createMockDocument31(
  paths?: OpenAPIV3_1.PathsObject,
  components?: OpenAPIV3_1.ComponentsObject
): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: paths || {},
    ...(components !== undefined && { components }),
  };
}

export function createMockDocumentWithStreaming30(): OpenAPIV3.Document {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Test API with Streaming',
      version: '1.0.0',
    },
    paths: {
      '/events': {
        get: {
          operationId: 'getEvents',
          tags: ['events'],
          responses: {
            '200': {
              description: 'Server-Sent Events stream',
              content: {
                'text/event-stream': {
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      '/data': {
        get: {
          operationId: 'getDataStream',
          tags: ['data'],
          responses: {
            '200': {
              description: 'NDJSON stream',
              content: {
                'application/x-ndjson': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        value: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

export function createMockDocumentWithStreaming31(): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Test API with Streaming',
      version: '1.0.0',
    },
    paths: {
      '/events': {
        get: {
          operationId: 'getEvents',
          tags: ['events'],
          responses: {
            '200': {
              description: 'Server-Sent Events stream',
              content: {
                'text/event-stream': {
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      '/data': {
        get: {
          operationId: 'getDataStream',
          tags: ['data'],
          responses: {
            '200': {
              description: 'NDJSON stream',
              content: {
                'application/x-ndjson': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        value: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
