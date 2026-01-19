import { describe, it, expect } from 'vitest';
import { hasOptionalQueryKeyParams } from '../helpers';
import type { IROperation } from '../../../ir/ir.types';
import { IRSchemaKind } from '../../../ir/ir.types';

describe('Query Keys Helpers', () => {
  describe('hasOptionalQueryKeyParams', () => {
    it('should return false when no optional params', () => {
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

      expect(hasOptionalQueryKeyParams(op)).toBe(false);
    });

    it('should return true when query params exist', () => {
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

      expect(hasOptionalQueryKeyParams(op)).toBe(true);
    });

    it('should return true when body is optional', () => {
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

      expect(hasOptionalQueryKeyParams(op)).toBe(true);
    });

    it('should return true when both query and body are optional', () => {
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
          contentType: 'application/json',
          typeTS: '',
          required: false,
          schema: { kind: IRSchemaKind.Object, nullable: false },
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
  });
});
