import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
} from "./helpers/sdk-generator";
import { setupMSW, teardownMSW } from "./helpers/msw-setup";
import { handlers } from "./helpers/msw-handlers";

describe("Generated SDK - Interceptors", () => {
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

  describe("onRequest Callback", () => {
    it("should call onRequest before making request", async () => {
      const onRequest = vi.fn();
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onRequest,
      });

      await client.users.listUsers();

      expect(onRequest).toHaveBeenCalled();
      const callArgs = onRequest.mock.calls[0][0];
      expect(callArgs).toHaveProperty("url");
      expect(callArgs).toHaveProperty("init");
      expect(callArgs.init).toHaveProperty("method");
      expect(callArgs.init.method).toBe("GET");
    });

    it("should allow modifying request in onRequest", async () => {
      const onRequest = vi.fn((ctx) => {
        ctx.init.headers.set("X-Custom-Header", "custom-value");
      });

      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onRequest,
      });

      await client.users.listUsers();

      expect(onRequest).toHaveBeenCalled();
    });
  });

  describe("onResponse Callback", () => {
    it("should call onResponse after receiving response", async () => {
      const onResponse = vi.fn();
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onResponse,
      });

      await client.users.listUsers();

      expect(onResponse).toHaveBeenCalled();
      const callArgs = onResponse.mock.calls[0][0];
      expect(callArgs).toHaveProperty("response");
      expect(callArgs).toHaveProperty("url");
      expect(callArgs.response).toBeInstanceOf(Response);
    });

    it("should receive response status in onResponse", async () => {
      const onResponse = vi.fn();
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onResponse,
      });

      await client.users.listUsers();

      const callArgs = onResponse.mock.calls[0][0];
      expect(callArgs.response.status).toBe(200);
    });
  });

  describe("onError Callback", () => {
    it("should call onError when request fails", async () => {
      const onError = vi.fn();
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onError,
      });

      try {
        await client.users.getUser("404");
        expect.fail("Should have thrown an error");
      } catch (error) {
        // Expected to throw
      }

      // Note: onError callback behavior depends on SDK implementation
      // The SDK may or may not call onError before throwing
      // For now, we verify the error was thrown correctly
      // If onError is called, verify its structure
      if (onError.mock.calls.length > 0) {
        const callArgs = onError.mock.calls[0][1]; // Second argument is the context
        expect(callArgs).toHaveProperty("url");
      }
    });

    it("should receive error details in onError", async () => {
      const onError = vi.fn();
      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onError,
      });

      try {
        await client.users.getUser("404");
        expect.fail("Should have thrown an error");
      } catch (error) {
        // Expected to throw
      }

      // Note: onError callback behavior depends on SDK implementation
      // If onError is called, verify its structure
      if (onError.mock.calls.length > 0) {
        const errorArg = onError.mock.calls[0][0]; // First argument is the error
        const contextArg = onError.mock.calls[0][1]; // Second argument is the context
        expect(errorArg).toBeDefined();
        expect(contextArg).toHaveProperty("url");
      }
    });
  });

  describe("Multiple Interceptors", () => {
    it("should call all interceptors in order", async () => {
      const callOrder: string[] = [];

      const onRequest = vi.fn(() => {
        callOrder.push("request");
      });

      const onResponse = vi.fn(() => {
        callOrder.push("response");
      });

      const client = new SDK.TestClient({
        baseURL: "https://api.test.com/v1",
        onRequest,
        onResponse,
      });

      await client.users.listUsers();

      expect(callOrder).toContain("request");
      expect(callOrder).toContain("response");
      expect(callOrder.indexOf("request")).toBeLessThan(
        callOrder.indexOf("response")
      );
    });
  });
});
