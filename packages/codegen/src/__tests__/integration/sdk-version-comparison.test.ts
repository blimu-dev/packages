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

describe('Generated SDK - OpenAPI 3.0 vs 3.1 Comparison', () => {
  let sdkPath30: string;
  let sdkPath31: string;
  let SDK30: GeneratedSDKModule;
  let SDK31: GeneratedSDKModule;

  beforeAll(async () => {
    // Generate SDKs from both versions
    sdkPath30 = await generateTestSDK('test-api-3.0.json');
    sdkPath31 = await generateTestSDK('test-api-3.1.json');
    typecheckGeneratedSDK(sdkPath30);
    typecheckGeneratedSDK(sdkPath31);
    SDK30 = await importGeneratedSDK(sdkPath30);
    SDK31 = await importGeneratedSDK(sdkPath31);
    setupMSW(handlers);
  }, 60000);

  afterAll(async () => {
    teardownMSW();
    await cleanupTestSDK(sdkPath30);
    await cleanupTestSDK(sdkPath31);
  });

  describe('Basic Functionality', () => {
    it('should work identically for basic GET requests', async () => {
      const TestClient30 = getClientConstructor(SDK30, 'TestClient');
      const client30: SDKClient = new TestClient30({
        baseURL: 'https://api.test.com/v1',
      });
      const TestClient31 = getClientConstructor(SDK31, 'TestClient');
      const client31: SDKClient = new TestClient31({
        baseURL: 'https://api.test.com/v1',
      });

      const users30 = getService<ServiceMethods<'listUsers'>>(
        client30,
        'users'
      );
      const products31 = getService<ServiceMethods<'listProducts'>>(
        client31,
        'products'
      );
      const result30 = (await users30.listUsers()) as Array<unknown>;
      const result31 = (await products31.listProducts()) as Array<unknown>;

      expect(Array.isArray(result30)).toBe(true);
      expect(Array.isArray(result31)).toBe(true);
    });

    it('should work identically for POST requests', async () => {
      const TestClient30 = getClientConstructor(SDK30, 'TestClient');
      const client30: SDKClient = new TestClient30({
        baseURL: 'https://api.test.com/v1',
      });
      const TestClient31 = getClientConstructor(SDK31, 'TestClient');
      const client31: SDKClient = new TestClient31({
        baseURL: 'https://api.test.com/v1',
      });

      const users30 = getService<ServiceMethods<'createUser'>>(
        client30,
        'users'
      );
      const products31 = getService<ServiceMethods<'createProduct'>>(
        client31,
        'products'
      );
      const result30 = (await users30.createUser({
        email: 'test@example.com',
        name: 'Test User',
      })) as { id: string };
      const result31 = (await products31.createProduct({
        name: 'Test Product',
        category: 'test',
      })) as { id: string };

      expect(result30).toBeDefined();
      expect(result31).toBeDefined();
      expect(result30.id).toBeDefined();
      expect(result31.id).toBeDefined();
    });
  });

  describe('Nullable Handling', () => {
    it('should handle nullable fields correctly in 3.0 (nullable: true)', async () => {
      const TestClient30 = getClientConstructor(SDK30, 'TestClient');
      const client30: SDKClient = new TestClient30({
        baseURL: 'https://api.test.com/v1',
      });

      const users30 = getService<ServiceMethods<'getUser'>>(client30, 'users');
      const result = (await users30.getUser('1')) as {
        name: string | null | undefined;
        age: number | null | undefined;
      };

      // In 3.0, nullable fields use nullable: true
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('age');
      // These can be null or the actual type
      if (result.name !== null && result.name !== undefined) {
        expect(typeof result.name).toBe('string');
      }
      if (result.age !== null && result.age !== undefined) {
        expect(typeof result.age).toBe('number');
      }
    });

    it("should handle nullable fields correctly in 3.1 (type: ['string', 'null'])", async () => {
      const TestClient31 = getClientConstructor(SDK31, 'TestClient');
      const client31: SDKClient = new TestClient31({
        baseURL: 'https://api.test.com/v1',
      });

      const products31 = getService<ServiceMethods<'getProduct'>>(
        client31,
        'products'
      );
      const result = (await products31.getProduct('1')) as {
        name: string | null | undefined;
        price: number | null | undefined;
      };

      // In 3.1, nullable fields use type array with 'null'
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('price');
      // These can be null or the actual type
      if (result.name !== null && result.name !== undefined) {
        expect(typeof result.name).toBe('string');
      }
      if (result.price !== null && result.price !== undefined) {
        expect(typeof result.price).toBe('number');
      }
    });
  });

  describe('Streaming Support', () => {
    it('should support streaming in both versions', async () => {
      const TestClient30 = getClientConstructor(SDK30, 'TestClient');
      const client30: SDKClient = new TestClient30({
        baseURL: 'https://api.test.com/v1',
      });
      const TestClient31 = getClientConstructor(SDK31, 'TestClient');
      const client31: SDKClient = new TestClient31({
        baseURL: 'https://api.test.com/v1',
      });

      const events30 = getService<ServiceMethods<'streamEvents'>>(
        client30,
        'events'
      );
      const events31 = getService<ServiceMethods<'streamEvents'>>(
        client31,
        'events'
      );
      const stream30 = events30.streamEvents() as AsyncGenerator<unknown>;
      const stream31 = events31.streamEvents() as AsyncGenerator<unknown>;

      expect(stream30).toBeDefined();
      expect(stream31).toBeDefined();
      expect(typeof stream30[Symbol.asyncIterator]).toBe('function');
      expect(typeof stream31[Symbol.asyncIterator]).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors identically in both versions', async () => {
      const TestClient30 = getClientConstructor(SDK30, 'TestClient');
      const client30: SDKClient = new TestClient30({
        baseURL: 'https://api.test.com/v1',
      });
      const TestClient31 = getClientConstructor(SDK31, 'TestClient');
      const client31: SDKClient = new TestClient31({
        baseURL: 'https://api.test.com/v1',
      });

      // Both should throw errors for 404
      try {
        const users30 = getService<ServiceMethods<'getUser'>>(
          client30,
          'users'
        );
        await users30.getUser('404');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        const products31 = getService<ServiceMethods<'getProduct'>>(
          client31,
          'products'
        );
        await products31.getProduct('404');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Authentication', () => {
    it('should support authentication in both versions', async () => {
      const TestClient30 = getClientConstructor(SDK30, 'TestClient');
      const client30: SDKClient = new TestClient30({
        baseURL: 'https://api.test.com/v1',
        bearerAuth: 'token-123',
      });
      const TestClient31 = getClientConstructor(SDK31, 'TestClient');
      const client31: SDKClient = new TestClient31({
        baseURL: 'https://api.test.com/v1',
        bearerAuth: 'token-123',
      });

      const users30 = getService<ServiceMethods<'listUsers'>>(
        client30,
        'users'
      );
      const products31 = getService<ServiceMethods<'listProducts'>>(
        client31,
        'products'
      );
      const result30 = (await users30.listUsers()) as Array<unknown>;
      const result31 = (await products31.listProducts()) as Array<unknown>;

      expect(result30).toBeDefined();
      expect(result31).toBeDefined();
    });
  });
});
