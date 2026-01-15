import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FetchClient } from "../../src/client";
import { FetchError, NotFoundError, UnauthorizedError } from "../../src/errors";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("FetchClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("constructor", () => {
    it("should create a client with default config", () => {
      const client = new FetchClient();
      expect(client).toBeInstanceOf(FetchClient);
    });

    it("should set baseURL from config", () => {
      const client = new FetchClient({ baseURL: "https://api.example.com" });
      expect(client).toBeInstanceOf(FetchClient);
    });

    it("should throw if fetch is not available", () => {
      const originalFetch = global.fetch;
      // @ts-ignore
      delete global.fetch;
      expect(() => new FetchClient()).toThrow();
      global.fetch = originalFetch;
    });
  });

  describe("request", () => {
    it("should make a GET request", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({ baseURL: "https://api.example.com" });
      const result = await client.request({
        path: "/users",
        method: "GET",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result).toEqual({ data: "test" });
    });

    it("should make a POST request with body", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({ baseURL: "https://api.example.com" });
      const result = await client.request({
        path: "/users",
        method: "POST",
        body: JSON.stringify({ name: "John" }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          body: '{"name":"John"}',
        })
      );
      expect(result).toEqual({ id: 1 });
    });

    it("should append query parameters", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({ baseURL: "https://api.example.com" });
      await client.request({
        path: "/users",
        method: "GET",
        query: { page: 1, limit: 10 },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.any(Object)
      );
    });

    it("should throw NotFoundError for 404", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({ baseURL: "https://api.example.com" });

      await expect(
        client.request({ path: "/users/999", method: "GET" })
      ).rejects.toThrow(NotFoundError);
    });

    it("should apply authentication headers", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({
        baseURL: "https://api.example.com",
        auth: {
          strategies: [
            {
              type: "bearer",
              token: "token123",
            },
          ],
        },
      });
      await client.request({ path: "/users", method: "GET" });

      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer token123");
    });

    it("should support dynamic access token", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const getToken = vi.fn(() => "dynamic-token");
      const client = new FetchClient({
        baseURL: "https://api.example.com",
        auth: {
          strategies: [
            {
              type: "bearer",
              token: getToken,
            },
          ],
        },
      });
      await client.request({ path: "/users", method: "GET" });

      expect(getToken).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer dynamic-token");
    });
  });

  describe("hooks", () => {
    it("should execute beforeRequest hook", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const beforeRequestHook = vi.fn();
      const client = new FetchClient({
        baseURL: "https://api.example.com",
        hooks: {
          beforeRequest: [beforeRequestHook],
        },
      });

      await client.request({ path: "/users", method: "GET" });

      expect(beforeRequestHook).toHaveBeenCalled();
    });

    it("should execute afterResponse hook", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const afterResponseHook = vi.fn();
      const client = new FetchClient({
        baseURL: "https://api.example.com",
        hooks: {
          afterResponse: [afterResponseHook],
        },
      });

      await client.request({ path: "/users", method: "GET" });

      expect(afterResponseHook).toHaveBeenCalled();
      expect(afterResponseHook.mock.calls[0][0].data).toEqual({ data: "test" });
    });

    it("should execute onError hook", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      const onErrorHook = vi.fn();
      const client = new FetchClient({
        baseURL: "https://api.example.com",
        hooks: {
          onError: [onErrorHook],
        },
      });

      await expect(
        client.request({ path: "/users/999", method: "GET" })
      ).rejects.toThrow();

      expect(onErrorHook).toHaveBeenCalled();
      expect(onErrorHook.mock.calls[0][0].error).toBeInstanceOf(NotFoundError);
    });

    it("should support legacy interceptors", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const onRequest = vi.fn();
      const client = new FetchClient({
        baseURL: "https://api.example.com",
        hooks: {
          beforeRequest: [onRequest],
        },
      });

      await client.request({ path: "/users", method: "GET" });

      expect(onRequest).toHaveBeenCalled();
    });
  });

  describe("retry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should retry on failure", async () => {
      mockFetch
        .mockResolvedValueOnce(new Response("", { status: 500, headers: {} }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

      const client = new FetchClient({
        baseURL: "https://api.example.com",
        retry: {
          retries: 1,
          strategy: "exponential",
          backoffMs: 100,
          retryOn: [500],
        },
      });

      const promise = client.request({ path: "/users", method: "GET" });

      // Fast-forward time to skip delay
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: "success" });
    });

    it("should not retry on non-retryable errors", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({
        baseURL: "https://api.example.com",
        retry: {
          retries: 2,
          strategy: "exponential",
          backoffMs: 100,
          retryOn: [500],
        },
      });

      await expect(
        client.request({ path: "/users/999", method: "GET" })
      ).rejects.toThrow(NotFoundError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("setAccessToken", () => {
    it("should update access token", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const client = new FetchClient({ baseURL: "https://api.example.com" });
      client.addAuthStrategy({
        type: "bearer",
        token: "new-token",
      });

      await client.request({ path: "/users", method: "GET" });

      const call = mockFetch.mock.calls[0];
      const headers = call[1].headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer new-token");
    });
  });

  describe("useHook", () => {
    it("should register a hook dynamically", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const hook = vi.fn();
      const client = new FetchClient({ baseURL: "https://api.example.com" });
      client.useHook("beforeRequest", hook);

      await client.request({ path: "/users", method: "GET" });

      expect(hook).toHaveBeenCalled();
    });
  });
});
