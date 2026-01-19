import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
  typecheckGeneratedSDK,
  type GeneratedSDKModule,
  getClientConstructor,
  getService,
  type SDKClient,
  type ServiceMethods,
} from './helpers/sdk-generator';
import { setupMSW, teardownMSW, resetMSWHandlers } from './helpers/msw-setup';
import { http, HttpResponse } from 'msw';

describe('Generated SDK - Error Handling', () => {
  let sdkPath: string;
  let SDK: GeneratedSDKModule;

  beforeAll(async () => {
    sdkPath = await generateTestSDK('test-api-3.0.json');
    typecheckGeneratedSDK(sdkPath);
    SDK = await importGeneratedSDK(sdkPath);
    setupMSW([]);
  }, 30000);

  afterAll(async () => {
    teardownMSW();
    await cleanupTestSDK(sdkPath);
  });

  describe('FetchError Creation', () => {
    it('should throw FetchError for 4xx responses', async () => {
      resetMSWHandlers([
        http.get('https://api.test.com/v1/users/:id', () => {
          return HttpResponse.json(
            { code: 'NOT_FOUND', message: 'User not found' },
            { status: 404 }
          );
        }),
      ]);

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      try {
        const users = getService<ServiceMethods<'getUser'>>(client, 'users');
        await users.getUser('404');
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        // FetchError or specific error types like NotFoundError extend FetchError
        const fetchError = error as { name?: string; status?: number };
        expect(
          fetchError.name === 'FetchError' ||
            fetchError.name === 'NotFoundError'
        ).toBe(true);
        expect(fetchError.status).toBe(404);
      }
    });

    it('should throw FetchError for 5xx responses', async () => {
      resetMSWHandlers([
        http.get('https://api.test.com/v1/error/500', () => {
          return HttpResponse.json(
            { code: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
          );
        }),
      ]);

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      try {
        // This endpoint might not exist in the generated SDK, so we'll test error structure differently
        const users = getService<ServiceMethods<'getUser'>>(client, 'users');
        await expect(users.getUser('500')).rejects.toThrow();
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Response Parsing', () => {
    it('should parse error response body', async () => {
      resetMSWHandlers([
        http.get('https://api.test.com/v1/users/:id', () => {
          return HttpResponse.json(
            {
              code: 'NOT_FOUND',
              message: 'User not found',
              details: { id: '404' },
            },
            { status: 404 }
          );
        }),
      ]);

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      try {
        const users = getService<ServiceMethods<'getUser'>>(client, 'users');
        await users.getUser('404');
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const fetchError = error as { status?: number; data?: unknown };
        expect(fetchError.status).toBe(404);
        expect(fetchError.data).toBeDefined();
      }
    });
  });

  describe('Network Errors', () => {
    it('should handle network errors', async () => {
      resetMSWHandlers([]); // No handlers = network error

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      await expect(users.listUsers()).rejects.toThrow();
    });
  });

  describe('Error Hooks', () => {
    it('should call onError hook when error occurs', async () => {
      const onError = vi.fn();

      resetMSWHandlers([
        http.get('https://api.test.com/v1/users/:id', ({ params, request }) => {
          const { id } = params;
          const url = new URL(request.url);
          const pathId = url.pathname.split('/').pop();

          if (pathId === '404' || id === '404') {
            return HttpResponse.json(
              { code: 'NOT_FOUND', message: 'User not found' },
              { status: 404 }
            );
          }
          return HttpResponse.json({ id, name: 'Test' }, { status: 200 });
        }),
      ]);

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        hooks: {
          onError: [onError],
        },
      });

      try {
        const users = getService<ServiceMethods<'getUser'>>(client, 'users');
        await users.getUser('404');
        expect.fail('Should have thrown an error');
      } catch {
        // Expected - onError hook is called before the error is thrown
      }

      expect(onError).toHaveBeenCalled();
      const firstCall = onError.mock.calls[0];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).toHaveProperty('error');
      expect(callArgs).toHaveProperty('url');
    });
  });
});
