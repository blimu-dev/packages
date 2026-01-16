import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
  typecheckGeneratedSDK,
} from './helpers/sdk-generator';
import { setupMSW, teardownMSW } from './helpers/msw-setup';
import { handlers } from './helpers/msw-handlers';

describe('Generated SDK - Basic Functionality', () => {
  let sdkPath: string;
  let SDK: any;

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
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      expect(client).toBeDefined();
    });

    it('should use default base URL if not provided', () => {
      const client = new SDK.TestClient();
      expect(client).toBeDefined();
    });
  });

  describe('GET Requests', () => {
    it('should make GET request to list users', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const result = await client.users.listUsers();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle GET request with path parameters', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, not an object
      const result = await client.users.getUser('1');
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.email).toBeDefined();
    });

    it('should handle GET request with query parameters', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const result = await client.users.listUsers({
        limit: 2,
        offset: 0,
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle GET request with array query parameters', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const result = await client.users.listUsers({
        status: ['active', 'inactive'],
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('POST Requests', () => {
    it('should make POST request to create user', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const result = await client.users.createUser({
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
      });
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('PUT Requests', () => {
    it('should make PUT request to update user', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, body is separate
      const result = await client.users.updateUser('1', {
        name: 'Updated Name',
        email: 'updated@example.com',
        age: 31,
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('PATCH Requests', () => {
    it('should make PATCH request to partially update user', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, body is separate
      const result = await client.users.patchUser('1', {
        name: 'Patched Name',
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.name).toBe('Patched Name');
    });
  });

  describe('DELETE Requests', () => {
    it('should make DELETE request', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter
      await expect(client.users.deleteUser('1')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // id is a path parameter, not an object
      await expect(client.users.getUser('404')).rejects.toThrow();
    });

    it('should handle 400 errors', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      // Try to create user without required email
      await expect(
        client.users.createUser({ name: 'Test' } as any)
      ).rejects.toThrow();
    });
  });

  describe('Response Parsing', () => {
    it('should parse JSON responses correctly', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const result = await client.users.getUser('1');
      expect(typeof result).toBe('object');
      expect(result.id).toBeDefined();
      expect(result.email).toBeDefined();
    });

    it('should handle nullable fields', async () => {
      const client = new SDK.TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      const result = await client.users.getUser('1');
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
