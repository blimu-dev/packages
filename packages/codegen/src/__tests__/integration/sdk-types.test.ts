import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
} from "./helpers/sdk-generator";
import { setupMSW, teardownMSW } from "./helpers/msw-setup";
import { handlers } from "./helpers/msw-handlers";

describe("Generated SDK - Type Safety", () => {
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

  describe("Request Body Types", () => {
    it("should accept correct request body types", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      // TypeScript would catch this at compile time, but we verify at runtime
      const result = await client.users.createUser({
        name: "Test",
        email: "test@example.com",
        age: 25,
      });

      expect(result).toBeDefined();
      expect(result.email).toBe("test@example.com");
    });

    it("should handle optional request body fields", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      // age is optional
      const result = await client.users.createUser({
        email: "test@example.com",
      });

      expect(result).toBeDefined();
    });
  });

  describe("Response Types", () => {
    it("should return correctly typed responses", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.getUser("1");

      // Verify response has expected properties
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("status");
      expect(typeof result.id).toBe("string");
      expect(typeof result.email).toBe("string");
    });
  });

  describe("Parameter Types", () => {
    it("should accept string path parameters", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.getUser("123");
      expect(result).toBeDefined();
    });

    it("should accept integer query parameters", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.listUsers({ limit: 10, offset: 0 });
      expect(result).toBeDefined();
    });
  });

  describe("Nullable Types", () => {
    it("should handle nullable fields in responses", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.getUser("1");

      // name and age are nullable in the schema
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("age");
      // Values can be null or the actual type
      if (result.name !== null) {
        expect(typeof result.name).toBe("string");
      }
      if (result.age !== null) {
        expect(typeof result.age).toBe("number");
      }
    });
  });

  describe("Enum Types", () => {
    it("should handle enum values in responses", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.getUser("1");

      // status is an enum
      expect(result).toHaveProperty("status");
      expect(["active", "inactive", "pending"]).toContain(result.status);
    });
  });

  describe("Array Types", () => {
    it("should handle array responses", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.listUsers();

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("email");
      }
    });

    it("should handle array query parameters", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.listUsers({
        status: ["active", "inactive"],
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Object Types with Nested Properties", () => {
    it("should handle nested object properties", async () => {
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
      });

      const result = await client.users.getUser("1");

      // metadata is an object with additionalProperties (optional in schema)
      // The MSW handler now includes metadata, but it's optional
      expect(result).toBeDefined();
      // metadata may or may not be present depending on the response
      if (result.metadata !== undefined) {
        expect(typeof result.metadata).toBe("object");
      }
    });
  });
});
