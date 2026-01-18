import { describe, it, expect } from 'vitest';
import { isStreamingOperation, getStreamingItemType } from '../helpers';
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
});
