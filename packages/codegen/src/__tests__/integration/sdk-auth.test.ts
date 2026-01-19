import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
  typecheckGeneratedSDK,
} from './helpers/sdk-generator';
import { setupMSW, teardownMSW, resetMSWHandlers } from './helpers/msw-setup';
import { http, HttpResponse } from 'msw';

import type { GeneratedSDKModule, SDKClient } from './helpers/sdk-generator';
import { getClientConstructor, getService } from './helpers/sdk-generator';

describe('Generated SDK - Authentication', () => {
  let sdkPath: string;
  let SDK: GeneratedSDKModule;

  beforeAll(async () => {
    sdkPath = await generateTestSDK('test-api-3.0.json');
    typecheckGeneratedSDK(sdkPath);
    SDK = await importGeneratedSDK(sdkPath);
    setupMSW([
      http.get('https://api.test.com/v1/users', ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        const apiKey = request.headers.get('X-API-Key');

        if (authHeader || apiKey) {
          return HttpResponse.json([
            { id: '1', email: 'test@example.com', status: 'active' },
          ]);
        }
        return HttpResponse.json(
          { code: 'UNAUTHORIZED', message: 'Unauthorized' },
          { status: 401 }
        );
      }),
    ]);
  }, 30000);

  afterAll(async () => {
    teardownMSW();
    await cleanupTestSDK(sdkPath);
  });

  describe('Bearer Token Authentication', () => {
    it('should send Bearer token in Authorization header', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client = new TestClient({
        baseURL: 'https://api.test.com/v1',
        bearerAuth: 'test-token-123',
      });

      const users = getService<{ listUsers: () => Promise<unknown> }>(
        client,
        'users'
      );
      const result = await users.listUsers();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should use bearerAuth function if provided', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        bearerAuth: () => 'bearer-function-token-123',
      });

      const users = getService<{ listUsers: () => Promise<unknown> }>(
        client,
        'users'
      );
      const result = await users.listUsers();
      expect(result).toBeDefined();
    });

    it('should use bearerAuth async function if provided', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        bearerAuth: async () => {
          // Simulate async token retrieval
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'async-bearer-token-456';
        },
      });

      const users = getService<{ listUsers: () => Promise<unknown> }>(
        client,
        'users'
      );
      const result = await users.listUsers();
      expect(result).toBeDefined();
    });
  });

  describe('API Key Authentication', () => {
    it('should send API key in header', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        apiKeyAuth: 'api-key-123',
      });

      const users = getService<{ listUsers: () => Promise<unknown> }>(
        client,
        'users'
      );
      const result = await users.listUsers();
      expect(result).toBeDefined();
    });
  });

  describe('Basic Authentication', () => {
    it('should send Basic auth credentials', async () => {
      resetMSWHandlers([
        http.get('https://api.test.com/v1/users', ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader?.startsWith('Basic ')) {
            return HttpResponse.json([
              { id: '1', email: 'test@example.com', status: 'active' },
            ]);
          }
          return HttpResponse.json(
            { code: 'UNAUTHORIZED', message: 'Unauthorized' },
            { status: 401 }
          );
        }),
      ]);

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        basicAuth: {
          username: 'user',
          password: 'pass',
        },
      });

      const users = getService<{ listUsers: () => Promise<unknown> }>(
        client,
        'users'
      );
      const result = await users.listUsers();
      expect(result).toBeDefined();
    });
  });

  describe('Unauthorized Requests', () => {
    it('should handle 401 errors when no auth provided', async () => {
      resetMSWHandlers([
        http.get('https://api.test.com/v1/users', () => {
          return HttpResponse.json(
            { code: 'UNAUTHORIZED', message: 'Unauthorized' },
            { status: 401 }
          );
        }),
      ]);

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<{ listUsers: () => Promise<unknown> }>(
        client,
        'users'
      );
      await expect(users.listUsers()).rejects.toThrow();
    });
  });
});
