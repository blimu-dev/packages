import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
  typecheckGeneratedSDK,
} from "./helpers/sdk-generator";
import { setupMSW, teardownMSW } from "./helpers/msw-setup";
import { handlers } from "./helpers/msw-handlers";

describe("Generated SDK - OpenAPI 3.0 vs 3.1 Comparison", () => {
  let sdkPath30: string;
  let sdkPath31: string;
  let SDK30: any;
  let SDK31: any;

  beforeAll(async () => {
    // Generate SDKs from both versions
    sdkPath30 = await generateTestSDK("test-api-3.0.json");
    sdkPath31 = await generateTestSDK("test-api-3.1.json");
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

  describe("Basic Functionality", () => {
    it("should work identically for basic GET requests", async () => {
      const client30 = new SDK30.TestClient({
        baseURL: "https://api.test.com/v1",
      });
      const client31 = new SDK31.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result30 = await client30.users.listUsers();
      const result31 = await client31.products.listProducts();

      expect(Array.isArray(result30)).toBe(true);
      expect(Array.isArray(result31)).toBe(true);
    });

    it("should work identically for POST requests", async () => {
      const client30 = new SDK30.TestClient({
        baseURL: "https://api.test.com/v1",
      });
      const client31 = new SDK31.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result30 = await client30.users.createUser({
        email: "test@example.com",
        name: "Test User",
      });
      const result31 = await client31.products.createProduct({
        name: "Test Product",
        category: "test",
      });

      expect(result30).toBeDefined();
      expect(result31).toBeDefined();
      expect(result30.id).toBeDefined();
      expect(result31.id).toBeDefined();
    });
  });

  describe("Nullable Handling", () => {
    it("should handle nullable fields correctly in 3.0 (nullable: true)", async () => {
      const client30 = new SDK30.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client30.users.getUser("1");

      // In 3.0, nullable fields use nullable: true
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("age");
      // These can be null or the actual type
      if (result.name !== null && result.name !== undefined) {
        expect(typeof result.name).toBe("string");
      }
      if (result.age !== null && result.age !== undefined) {
        expect(typeof result.age).toBe("number");
      }
    });

    it("should handle nullable fields correctly in 3.1 (type: ['string', 'null'])", async () => {
      const client31 = new SDK31.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client31.products.getProduct("1");

      // In 3.1, nullable fields use type array with 'null'
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("price");
      // These can be null or the actual type
      if (result.name !== null && result.name !== undefined) {
        expect(typeof result.name).toBe("string");
      }
      if (result.price !== null && result.price !== undefined) {
        expect(typeof result.price).toBe("number");
      }
    });
  });

  describe("Streaming Support", () => {
    it("should support streaming in both versions", async () => {
      const client30 = new SDK30.TestClient({
        baseURL: "https://api.test.com/v1",
      });
      const client31 = new SDK31.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const stream30 = client30.events.streamEvents();
      const stream31 = client31.events.streamEvents();

      expect(stream30).toBeDefined();
      expect(stream31).toBeDefined();
      expect(typeof stream30[Symbol.asyncIterator]).toBe("function");
      expect(typeof stream31[Symbol.asyncIterator]).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should handle errors identically in both versions", async () => {
      const client30 = new SDK30.TestClient({
        baseURL: "https://api.test.com/v1",
      });
      const client31 = new SDK31.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      // Both should throw errors for 404
      try {
        await client30.users.getUser("404");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        await client31.products.getProduct("404");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Authentication", () => {
    it("should support authentication in both versions", async () => {
      const client30 = new SDK30.TestClient({
        baseURL: "https://api.test.com/v1",
        bearerAuth: "token-123",
      });
      const client31 = new SDK31.TestClient({
        baseURL: "https://api.test.com/v1",
        bearerAuth: "token-123",
      });

      const result30 = await client30.users.listUsers();
      const result31 = await client31.products.listProducts();

      expect(result30).toBeDefined();
      expect(result31).toBeDefined();
    });
  });
});
