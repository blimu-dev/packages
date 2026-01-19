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

describe('Generated SDK - Type Safety', () => {
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

  describe('Request Body Types', () => {
    it('should accept correct request body types', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      // TypeScript would catch this at compile time, but we verify at runtime
      const users = getService<ServiceMethods<'createUser'>>(client, 'users');
      const result = (await users.createUser({
        name: 'Test',
        email: 'test@example.com',
        age: 25,
      })) as { email: string };

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });

    it('should handle optional request body fields', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      // age is optional
      const users = getService<ServiceMethods<'createUser'>>(client, 'users');
      const result = (await users.createUser({
        email: 'test@example.com',
      })) as Record<string, unknown>;

      expect(result).toBeDefined();
    });
  });

  describe('Response Types', () => {
    it('should return correctly typed responses', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('1')) as {
        id: string;
        email: string;
        status: string;
      };

      // Verify response has expected properties
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('status');
      expect(typeof result.id).toBe('string');
      expect(typeof result.email).toBe('string');
    });
  });

  describe('Parameter Types', () => {
    it('should accept string path parameters', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('123')) as Record<string, unknown>;
      expect(result).toBeDefined();
    });

    it('should accept integer query parameters', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers({
        limit: 10,
        offset: 0,
      })) as Array<unknown>;
      expect(result).toBeDefined();
    });
  });

  describe('Nullable Types', () => {
    it('should handle nullable fields in responses', async () => {
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

  describe('Enum Types', () => {
    it('should handle enum values in responses', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('1')) as { status: string };

      // status is an enum
      expect(result).toHaveProperty('status');
      expect(['active', 'inactive', 'pending']).toContain(result.status);
    });
  });

  describe('Array Types', () => {
    it('should handle array responses', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers()) as Array<
        Record<string, unknown>
      >;

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('email');
      }
    });

    it('should handle array query parameters', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers({
        status: ['active', 'inactive'],
      })) as Array<unknown>;

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Object Types with Nested Properties', () => {
    it('should handle nested object properties', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'getUser'>>(client, 'users');
      const result = (await users.getUser('1')) as Record<string, unknown>;

      // metadata is an object with additionalProperties (optional in schema)
      // The MSW handler now includes metadata, but it's optional
      expect(result).toBeDefined();
      // metadata may or may not be present depending on the response
      if (result.metadata !== undefined) {
        expect(typeof result.metadata).toBe('object');
      }
    });
  });
});
