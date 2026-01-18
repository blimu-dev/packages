import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('Generated SDK - Basic Functionality', () => {
  let sdkPath: string;
  let SDK: GeneratedSDKModule;

  beforeAll(async () => {
    // Generate SDK from test spec
    sdkPath = await generateTestSDK('test-api-3.0.json');
    // Typecheck the generated SDK
    typecheckGeneratedSDK(sdkPath);
    SDK = await importGeneratedSDK(sdkPath);
    // Setup MSW
    setupMSW(handlers);
  }, 30000);

  afterAll(async () => {
    // Cleanup
    teardownMSW();
    await cleanupTestSDK(sdkPath);
  });

  describe('SDK Instantiation', () => {
    it('should instantiate SDK client', () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      expect(client).toBeDefined();
    });

    it('should use default base URL if not provided', () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient();
      expect(client).toBeDefined();
    });
  });

  describe('GET Requests', () => {
    it('should make GET request to list users', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers()) as Array<unknown>;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle GET request with path parameters', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, not an object
      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('1')) as {
        id: string;
        email: string;
      };
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.email).toBeDefined();
    });

    it('should handle GET request with query parameters', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers({
        limit: 2,
        offset: 0,
      })) as Array<unknown>;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle GET request with array query parameters', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers({
        status: ['active', 'inactive'],
      })) as Array<unknown>;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('POST Requests', () => {
    it('should make POST request to create user', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const users = getService<ServiceMethods<'createUser'>>(client, 'users');
      const result = (await users.createUser({
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
      })) as { id: string; email: string };
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('PUT Requests', () => {
    it('should make PUT request to update user', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, body is separate
      const users = getService<ServiceMethods<'updateUser'>>(client, 'users');
      const result = (await users.updateUser('1', {
        name: 'Updated Name',
        email: 'updated@example.com',
        age: 31,
      })) as { id: string; name: string };
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('PATCH Requests', () => {
    it('should make PATCH request to partially update user', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, body is separate
      const users = getService<ServiceMethods<'patchUser'>>(client, 'users');
      const result = (await users.patchUser('1', {
        name: 'Patched Name',
      })) as { id: string; name: string };
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Patched Name');
    });
  });

  describe('DELETE Requests', () => {
    it('should make DELETE request', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter
      const users = getService<ServiceMethods<'deleteUser'>>(client, 'users');
      await expect(users.deleteUser('1')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, not an object
      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      await expect(users.getUser('404')).rejects.toThrow();
    });

    it('should handle 400 errors', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // Try to create user without required email
      await expect(
        getService<ServiceMethods<'createUser'>>(client, 'users').createUser({
          name: 'Test',
        } as { name: string })
      ).rejects.toThrow();
    });
  });

  describe('Response Parsing', () => {
    it('should parse JSON responses correctly', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('1')) as {
        id: string;
        email: string;
      };
      expect(typeof result).toBe('object');
      expect(result.id).toBeDefined();
      expect(result.email).toBeDefined();
    });

    it('should handle nullable fields', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('1')) as {
        name: string | null;
        age: number | null;
      };
      // name and age are nullable in the schema
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('age');
      // Values can be null or the actual type
      if (result.name !== null) {
        expect(typeof result.name).toBe('string');
      }
      if (result.age !== null) {
        expect(typeof result.age).toBe('number');
      }
    });
  });
});
