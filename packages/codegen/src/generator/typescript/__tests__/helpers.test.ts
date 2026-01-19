import { describe, it, expect } from 'vitest';
import {
  isStreamingOperation,
  getStreamingItemType,
  hasOptionalQueryKeyParams,
  buildQueryKeyReturnType,
  buildQueryKeyBase,
} from '../helpers';
import type { IROperation } from '../../../ir/ir.types';
import { IRSchemaKind } from '../../../ir/ir.types';

describe('TypeScript Helpers - Streaming', () => {
  describe('isStreamingOperation', () => {
    it('should return true for SSE streaming operation', () => {
      const op: IROperation = {
        operationID: 'streamEvents',
        method: 'GET',
        path: '/events',
        tag: 'events',
        originalTags: ['events'],
        summary: 'Stream events',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: { kind: IRSchemaKind.String, nullable: false },
          description: '',
          isStreaming: true,
          contentType: 'text/event-stream',
          streamingFormat: 'sse',
        },
      };
      expect(isStreamingOperation(op)).toBe(true);
    });

    it('should return true for NDJSON streaming operation', () => {
      const op: IROperation = {
        operationID: 'streamData',
        method: 'GET',
        path: '/data',
        tag: 'data',
        originalTags: ['data'],
        summary: 'Stream data',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: {
            kind: IRSchemaKind.Array,
            items: { kind: IRSchemaKind.Object, nullable: false },
            nullable: false,
          },
          description: '',
          isStreaming: true,
          contentType: 'application/x-ndjson',
          streamingFormat: 'ndjson',
        },
      };
      expect(isStreamingOperation(op)).toBe(true);
    });

    it('should return false for non-streaming operation', () => {
      const op: IROperation = {
        operationID: 'getUser',
        method: 'GET',
        path: '/users/{id}',
        tag: 'users',
        originalTags: ['users'],
        summary: 'Get user',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: { kind: IRSchemaKind.Object, nullable: false },
          description: '',
          isStreaming: false,
          contentType: 'application/json',
        },
      };
      expect(isStreamingOperation(op)).toBe(false);
    });
  });

  describe('getStreamingItemType', () => {
    it('should extract item type from array schema', () => {
      const op: IROperation = {
        operationID: 'streamData',
        method: 'GET',
        path: '/data',
        tag: 'data',
        originalTags: ['data'],
        summary: '',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: {
            kind: IRSchemaKind.Array,
            items: {
              kind: IRSchemaKind.Object,
              properties: [
                {
                  name: 'id',
                  type: { kind: IRSchemaKind.String, nullable: false },
                  required: true,
                  annotations: {},
                },
              ],
              nullable: false,
            },
            nullable: false,
          },
          description: '',
          isStreaming: true,
          contentType: 'application/x-ndjson',
          streamingFormat: 'ndjson',
        },
      };
      const result = getStreamingItemType(op);
      // The result should be a TypeScript type string for the object
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return string for SSE format', () => {
      const op: IROperation = {
        operationID: 'streamEvents',
        method: 'GET',
        path: '/events',
        tag: 'events',
        originalTags: ['events'],
        summary: '',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: { kind: IRSchemaKind.String, nullable: false },
          description: '',
          isStreaming: true,
          contentType: 'text/event-stream',
          streamingFormat: 'sse',
        },
      };
      const result = getStreamingItemType(op);
      expect(result).toBe('string');
    });

    it('should extract string item type from array', () => {
      const op: IROperation = {
        operationID: 'streamStrings',
        method: 'GET',
        path: '/strings',
        tag: 'strings',
        originalTags: ['strings'],
        summary: '',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: {
            kind: IRSchemaKind.Array,
            items: { kind: IRSchemaKind.String, nullable: false },
            nullable: false,
          },
          description: '',
          isStreaming: true,
          contentType: 'application/x-ndjson',
          streamingFormat: 'ndjson',
        },
      };
      const result = getStreamingItemType(op);
      expect(result).toBe('string');
    });

    it('should handle ref item type', () => {
      const op: IROperation = {
        operationID: 'streamUsers',
        method: 'GET',
        path: '/users',
        tag: 'users',
        originalTags: ['users'],
        summary: '',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: {
            kind: IRSchemaKind.Array,
            items: { kind: IRSchemaKind.Ref, ref: 'User', nullable: false },
            nullable: false,
          },
          description: '',
          isStreaming: true,
          contentType: 'application/x-ndjson',
          streamingFormat: 'ndjson',
        },
      };
      const result = getStreamingItemType(op);
      expect(result).toContain('Schema.User');
    });

    it('should return schema type when not array', () => {
      const op: IROperation = {
        operationID: 'getData',
        method: 'GET',
        path: '/data',
        tag: 'data',
        originalTags: ['data'],
        summary: '',
        description: '',
        deprecated: false,
        pathParams: [],
        queryParams: [],
        requestBody: null,
        response: {
          typeTS: '',
          schema: { kind: IRSchemaKind.String, nullable: false },
          description: '',
          isStreaming: true,
          contentType: 'text/plain',
          streamingFormat: 'chunked',
        },
      };
      const result = getStreamingItemType(op);
      expect(result).toBe('string');
    });
  });

  describe('Query Key Helpers', () => {
    describe('hasOptionalQueryKeyParams', () => {
      it('should return false when no optional params', () => {
        const op: IROperation = {
          operationID: 'getUser',
          method: 'GET',
          path: '/users/{id}',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'id',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(hasOptionalQueryKeyParams(op)).toBe(false);
      });

      it('should return true when query params exist', () => {
        const op: IROperation = {
          operationID: 'listUsers',
          method: 'GET',
          path: '/users',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [
            {
              name: 'limit',
              schema: { kind: IRSchemaKind.Number, nullable: false },
              required: false,
              description: '',
            },
          ],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(hasOptionalQueryKeyParams(op)).toBe(true);
      });

      it('should return true when request body is optional', () => {
        const op: IROperation = {
          operationID: 'updateUser',
          method: 'PATCH',
          path: '/users/{id}',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'id',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [],
          requestBody: {
            required: false,
            schema: { kind: IRSchemaKind.Object, nullable: false },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(hasOptionalQueryKeyParams(op)).toBe(true);
      });

      it('should return true when both query and body are optional', () => {
        const op: IROperation = {
          operationID: 'searchUsers',
          method: 'POST',
          path: '/users/search',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [
            {
              name: 'limit',
              schema: { kind: IRSchemaKind.Number, nullable: false },
              required: false,
              description: '',
            },
          ],
          requestBody: {
            required: false,
            schema: { kind: IRSchemaKind.Object, nullable: false },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(hasOptionalQueryKeyParams(op)).toBe(true);
      });

      it('should return false when request body is required', () => {
        const op: IROperation = {
          operationID: 'createUser',
          method: 'POST',
          path: '/users',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [],
          requestBody: {
            required: true,
            schema: { kind: IRSchemaKind.Object, nullable: false },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(hasOptionalQueryKeyParams(op)).toBe(false);
      });
    });

    describe('buildQueryKeyReturnType', () => {
      it('should return simple tuple when no optional params', () => {
        const op: IROperation = {
          operationID: 'logout',
          method: 'POST',
          path: '/auth/logout',
          tag: 'auth',
          originalTags: ['auth'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'logout');
        expect(result).toBe("readonly ['auth/logout']");
      });

      it('should return union type when query is optional', () => {
        const op: IROperation = {
          operationID: 'refresh',
          method: 'POST',
          path: '/auth/refresh',
          tag: 'auth',
          originalTags: ['auth'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [
            {
              name: 'token',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: false,
              description: '',
            },
          ],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'refresh');
        expect(result).toContain("readonly ['auth/refresh']");
        expect(result).toContain(
          "readonly ['auth/refresh', Schema.AuthRefreshQuery]"
        );
        expect(result).toContain(' | ');
      });

      it('should return union type when body is optional', () => {
        const op: IROperation = {
          operationID: 'update',
          method: 'PATCH',
          path: '/users/{id}',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'id',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [],
          requestBody: {
            required: false,
            schema: { kind: IRSchemaKind.Object, nullable: false },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'update');
        // Path params are included in the tuple, but path parameter placeholders are removed from base
        expect(result).toContain("readonly ['users', string]");
        expect(result).toContain(' | ');
        expect(result).toContain('Record<string, unknown>'); // body type
      });

      it('should return union of 4 types when both query and body are optional', () => {
        const op: IROperation = {
          operationID: 'search',
          method: 'POST',
          path: '/users/search',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [
            {
              name: 'limit',
              schema: { kind: IRSchemaKind.Number, nullable: false },
              required: false,
              description: '',
            },
          ],
          requestBody: {
            required: false,
            schema: { kind: IRSchemaKind.Object, nullable: false },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'search');
        // Should have 4 combinations: [], [query], [body], [query, body]
        const parts = result.split(' | ');
        expect(parts.length).toBe(4);
        expect(result).toContain("readonly ['users/search']");
        expect(result).toContain('Schema.UsersSearchQuery');
      });

      it('should include path params in tuple', () => {
        const op: IROperation = {
          operationID: 'getResource',
          method: 'GET',
          path: '/workspaces/{workspaceId}/resources/{resourceId}',
          tag: 'resources',
          originalTags: ['resources'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'workspaceId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
            {
              name: 'resourceId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [
            {
              name: 'include',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: false,
              description: '',
            },
          ],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'getResource');
        expect(result).toContain(
          "readonly ['workspaces/resources', string, string]"
        );
        expect(result).toContain('Schema.ResourcesGetResourceQuery');
      });

      it('should include required body type in tuple when no optional params', () => {
        const op: IROperation = {
          operationID: 'validate',
          method: 'POST',
          path: '/v1/workspace/{workspaceId}/environments/{environmentId}/definitions/validate',
          tag: 'definitions',
          originalTags: ['definitions'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'workspaceId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
            {
              name: 'environmentId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [],
          requestBody: {
            required: true,
            schema: {
              kind: IRSchemaKind.Ref,
              ref: 'DefinitionValidateRequestDto',
              nullable: false,
            },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'validate');
        // Should include base, path params, and required body type
        expect(result).toBe(
          "readonly ['v1/workspace/environments/definitions/validate', string, string, Schema.DefinitionValidateRequestDto]"
        );
      });

      it('should include required body type when query params are optional', () => {
        const op: IROperation = {
          operationID: 'createWithQuery',
          method: 'POST',
          path: '/users/{userId}/posts',
          tag: 'posts',
          originalTags: ['posts'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'userId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [
            {
              name: 'include',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: false,
              description: '',
            },
          ],
          requestBody: {
            required: true,
            schema: {
              kind: IRSchemaKind.Ref,
              ref: 'CreatePostDto',
              nullable: false,
            },
            contentType: 'application/json',
            typeTS: '',
          },
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        const result = buildQueryKeyReturnType(op, 'createWithQuery');
        // Should have 2 combinations: [base, userId, body] and [base, userId, body, query]
        const parts = result.split(' | ');
        expect(parts.length).toBe(2);
        expect(result).toContain(
          "readonly ['users/posts', string, Schema.CreatePostDto]"
        );
        expect(result).toContain(
          "readonly ['users/posts', string, Schema.CreatePostDto, Schema.PostsCreateWithQueryQuery]"
        );
      });
    });

    describe('buildQueryKeyBase', () => {
      it('should extract base path from simple path', () => {
        const op: IROperation = {
          operationID: 'logout',
          method: 'POST',
          path: '/auth/logout',
          tag: 'auth',
          originalTags: ['auth'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [],
          queryParams: [],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(buildQueryKeyBase(op)).toBe("'auth/logout'");
      });

      it('should remove path parameters from base', () => {
        const op: IROperation = {
          operationID: 'getUser',
          method: 'GET',
          path: '/users/{id}',
          tag: 'users',
          originalTags: ['users'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'id',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(buildQueryKeyBase(op)).toBe("'users'");
      });

      it('should handle multiple path segments', () => {
        const op: IROperation = {
          operationID: 'getResource',
          method: 'GET',
          path: '/workspaces/{workspaceId}/resources/{resourceId}',
          tag: 'resources',
          originalTags: ['resources'],
          summary: '',
          description: '',
          deprecated: false,
          pathParams: [
            {
              name: 'workspaceId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
            {
              name: 'resourceId',
              schema: { kind: IRSchemaKind.String, nullable: false },
              required: true,
              description: '',
            },
          ],
          queryParams: [],
          requestBody: null,
          response: {
            typeTS: '',
            schema: { kind: IRSchemaKind.Object, nullable: false },
            description: '',
            isStreaming: false,
            contentType: 'application/json',
          },
        };
        expect(buildQueryKeyBase(op)).toBe("'workspaces/resources'");
      });
    });
  });
});
