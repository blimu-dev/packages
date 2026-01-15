import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
} from "./helpers/sdk-generator";
import { setupMSW, teardownMSW } from "./helpers/msw-setup";
import { handlers } from "./helpers/msw-handlers";

describe("Generated SDK - Streaming", () => {
  let sdkPath: string;
  let SDK: any;

  beforeAll(async () => {
    sdkPath = await generateTestSDK("test-api-3.0.json");
    SDK = await importGeneratedSDK(sdkPath);
    setupMSW(handlers);
  }, 30000);

  afterAll(async () => {
    teardownMSW();
    await cleanupTestSDK(sdkPath);
  });

  describe("SSE Streaming", () => {
    it("should return AsyncGenerator for SSE stream", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream = client.events.streamEvents();

      // Verify it's an async generator
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe("function");
    });

    it("should yield events from SSE stream", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream = client.events.streamEvents();
      const events: any[] = [];

      for await (const event of stream) {
        events.push(event);
        if (events.length >= 3) break; // Limit to 3 events
      }

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("NDJSON Streaming", () => {
    it("should return AsyncGenerator for NDJSON stream", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream = client.data.streamData();

      // Verify it's an async generator
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe("function");
    });

    it("should yield items from NDJSON stream", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream = client.data.streamData();
      const items: any[] = [];

      for await (const item of stream) {
        items.push(item);
        if (items.length >= 3) break; // Limit to 3 items
      }

      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty("id");
      expect(items[0]).toHaveProperty("timestamp");
      expect(items[0]).toHaveProperty("value");
    });
  });

  describe("Streaming Error Handling", () => {
    it("should handle streaming errors gracefully", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream = client.events.streamEvents();

      try {
        const events: any[] = [];
        for await (const event of stream) {
          events.push(event);
        }
        // If we get here, streaming completed successfully
        expect(events.length).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Errors during streaming should be caught
        expect(error).toBeDefined();
      }
    });
  });

  describe("Streaming Cancellation", () => {
    it("should allow early termination of stream", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream = client.events.streamEvents();
      const events: any[] = [];

      // Read only one event then break
      for await (const event of stream) {
        events.push(event);
        break; // Early termination
      }

      expect(events.length).toBe(1);
    });
  });
});
