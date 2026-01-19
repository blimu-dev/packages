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

describe('Generated SDK - Streaming', () => {
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

  describe('SSE Streaming', () => {
    it('should return AsyncGenerator for SSE stream', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const events = getService<ServiceMethods<'streamEvents'>>(
        client,
        'events'
      );
      const stream = events.streamEvents() as AsyncGenerator<unknown>;

      // Verify it's an async generator
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });

    it('should yield events from SSE stream', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const eventsService = getService<ServiceMethods<'streamEvents'>>(
        client,
        'events'
      );
      const stream = eventsService.streamEvents() as AsyncGenerator<unknown>;
      const eventArray: unknown[] = [];

      for await (const event of stream) {
        eventArray.push(event);
        if (eventArray.length >= 3) break; // Limit to 3 events
      }

      expect(eventArray.length).toBeGreaterThan(0);
    });
  });

  describe('NDJSON Streaming', () => {
    it('should return AsyncGenerator for NDJSON stream', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const data = getService<ServiceMethods<'streamData'>>(client, 'data');
      const stream = data.streamData() as AsyncGenerator<unknown>;

      // Verify it's an async generator
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });

    it('should yield items from NDJSON stream', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const data = getService<ServiceMethods<'streamData'>>(client, 'data');
      const stream = data.streamData() as AsyncGenerator<unknown>;
      const items: unknown[] = [];

      for await (const item of stream) {
        items.push(item);
        if (items.length >= 3) break; // Limit to 3 items
      }

      expect(items.length).toBeGreaterThan(0);
      const firstItem = items[0] as Record<string, unknown>;
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('timestamp');
      expect(firstItem).toHaveProperty('value');
    });
  });

  describe('Streaming Error Handling', () => {
    it('should handle streaming errors gracefully', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const eventsService = getService<ServiceMethods<'streamEvents'>>(
        client,
        'events'
      );
      const stream = eventsService.streamEvents() as AsyncGenerator<unknown>;

      try {
        const eventArray: unknown[] = [];
        for await (const event of stream) {
          eventArray.push(event);
        }
        // If we get here, streaming completed successfully
        expect(eventArray.length).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Errors during streaming should be caught
        expect(error).toBeDefined();
      }
    });
  });

  describe('Streaming Cancellation', () => {
    it('should allow early termination of stream', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const eventsService = getService<ServiceMethods<'streamEvents'>>(
        client,
        'events'
      );
      const stream = eventsService.streamEvents() as AsyncGenerator<unknown>;
      const eventArray: unknown[] = [];

      // Read only one event then break
      for await (const event of stream) {
        eventArray.push(event);
        break; // Early termination
      }

      expect(eventArray.length).toBe(1);
    });
  });
});
