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
import { setupMSW, teardownMSW } from './helpers/msw-setup';
import { handlers } from './helpers/msw-handlers';

describe('Generated SDK - Interceptors', () => {
  let sdkPath: string;
  let SDK: GeneratedSDKModule;

  beforeAll(async () => {
    sdkPath = await generateTestSDK('test-api-3.0.json');
    typecheckGeneratedSDK(sdkPath);
    SDK = await importGeneratedSDK(sdkPath);
    setupMSW(handlers);
  }, 30000);

  afterAll(async () => {
    teardownMSW();
    await cleanupTestSDK(sdkPath);
  });

  describe('beforeRequest Hook', () => {
    it('should call beforeRequest hook before making request', async () => {
      const beforeRequest = vi.fn();
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        hooks: {
          beforeRequest: [beforeRequest],
        },
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      await users.listUsers();

      expect(beforeRequest).toHaveBeenCalled();
      const firstCall = beforeRequest.mock.calls[0];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).toHaveProperty('url');
      expect(callArgs).toHaveProperty('init');
      expect(callArgs).toHaveProperty('attempt');
      const init = (callArgs as { init?: { method?: string } })?.init;
      expect(init).toHaveProperty('method');
      expect(init?.method).toBe('GET');
    });

    it('should allow modifying request in beforeRequest hook', async () => {
      const beforeRequest = vi.fn((ctx) => {
        if (!ctx.init.headers) {
          ctx.init.headers = new Headers();
        }
        ctx.init.headers.set('X-Custom-Header', 'custom-value');
      });

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        hooks: {
          beforeRequest: [beforeRequest],
        },
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      await users.listUsers();

      expect(beforeRequest).toHaveBeenCalled();
    });
  });

  describe('afterResponse Hook', () => {
    it('should call afterResponse hook after receiving response', async () => {
      const afterResponse = vi.fn();
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        hooks: {
          afterResponse: [afterResponse],
        },
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      await users.listUsers();

      expect(afterResponse).toHaveBeenCalled();
      const firstCall = afterResponse.mock.calls[0];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).toHaveProperty('response');
      expect(callArgs).toHaveProperty('url');
      expect(callArgs).toHaveProperty('init');
      expect(callArgs).toHaveProperty('attempt');
      expect(callArgs).toHaveProperty('data');
      const response = (callArgs as { response?: Response })?.response;
      expect(response).toBeInstanceOf(Response);
    });

    it('should receive response status in afterResponse hook', async () => {
      const afterResponse = vi.fn();
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        hooks: {
          afterResponse: [afterResponse],
        },
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      await users.listUsers();

      const firstCall = afterResponse.mock.calls[0];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0] as { response?: Response } | undefined;
      expect(callArgs).toBeDefined();
      expect(callArgs?.response?.status).toBe(200);
    });
  });

  describe('onError Hook', () => {
    it('should call onError hook when request fails', async () => {
      const onError = vi.fn();
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
        // Expected to throw
      }

      // onError hook is called before throwing
      expect(onError).toHaveBeenCalled();
      const firstCall = onError.mock.calls[0];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs).toHaveProperty('url');
      expect(callArgs).toHaveProperty('init');
      expect(callArgs).toHaveProperty('attempt');
      expect(callArgs).toHaveProperty('error');
    });

    it('should receive error details in onError hook', async () => {
      const onError = vi.fn();
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
        // Expected to throw
      }

      expect(onError).toHaveBeenCalled();
      const firstCall = onError.mock.calls[0];
      expect(firstCall).toBeDefined();
      const callArgs = firstCall?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs?.error).toBeDefined();
      expect(callArgs?.url).toBeDefined();
    });
  });

  describe('Multiple Hooks', () => {
    it('should call all hooks in order', async () => {
      const callOrder: string[] = [];

      const beforeRequest = vi.fn(() => {
        callOrder.push('request');
      });

      const afterResponse = vi.fn(() => {
        callOrder.push('response');
      });

      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
        hooks: {
          beforeRequest: [beforeRequest],
          afterResponse: [afterResponse],
        },
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      await users.listUsers();

      expect(callOrder).toContain('request');
      expect(callOrder).toContain('response');
      expect(callOrder.indexOf('request')).toBeLessThan(
        callOrder.indexOf('response')
      );
    });
  });
});
