import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenApiService } from "../openapi.service";
import * as path from "path";
import SwaggerParser from "@apidevtools/swagger-parser";

// Mock global fetch
global.fetch = vi.fn();

// Mock fs module
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
}));

// Mock SwaggerParser
vi.mock("@apidevtools/swagger-parser", async () => {
  const actual = await vi.importActual("@apidevtools/swagger-parser");
  return {
    ...actual,
    default: {
      parse: vi.fn(),
      bundle: vi.fn(),
      dereference: vi.fn(),
      validate: vi.fn(),
    },
  };
});

import * as fs from "fs";

describe("OpenApiService", () => {
  let service: OpenApiService;
  const mockSwaggerParser = SwaggerParser as any;
  const mockFs = fs as any;

  beforeEach(() => {
    service = new OpenApiService();
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadDocument", () => {
    it("should load document from local file path", async () => {
      const mockDoc = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/openapi-3.0.0.json"
      );
      mockSwaggerParser.bundle.mockResolvedValue(mockDoc);
      mockFs.existsSync.mockReturnValue(true);

      const result = await service.loadDocument(testFilePath);

      expect(mockSwaggerParser.bundle).toHaveBeenCalledWith(
        path.resolve(testFilePath)
      );
      expect(result.openapi).toBe("3.0.0");
    });

    it("should load document from HTTP URL", async () => {
      const mockDoc = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      const testUrl = "https://api.example.com/openapi.json";
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify(mockDoc),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);
      const mockParsed = { ...mockDoc, _parsed: true };
      mockSwaggerParser.parse.mockResolvedValue(mockParsed);
      mockSwaggerParser.bundle.mockResolvedValue(mockDoc);

      const result = await service.loadDocument(testUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        testUrl,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      // Should parse first, then bundle the parsed document (not the URL)
      expect(mockSwaggerParser.parse).toHaveBeenCalledWith(mockDoc);
      expect(mockSwaggerParser.bundle).toHaveBeenCalledWith(mockParsed);
      expect(result.openapi).toBe("3.1.0");
    });

    it("should preserve internal $ref pointers when loading from URL", async () => {
      // This test verifies that $ref pointers to component schemas are preserved
      // which is critical for simple component types like ResourceType
      const mockDocWithRefs = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/v1/resources/{resourceType}": {
            get: {
              parameters: [
                {
                  name: "resourceType",
                  in: "path",
                  schema: { $ref: "#/components/schemas/ResourceType" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
        components: {
          schemas: {
            ResourceType: {
              type: "string",
              minLength: 1,
              description: "Resource type identifier",
            },
          },
        },
      };

      const testUrl = "https://api.example.com/openapi.json";
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify(mockDocWithRefs),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);
      const mockParsed = { ...mockDocWithRefs, _parsed: true };
      // Bundle should preserve the $ref pointer
      const mockBundled = {
        ...mockDocWithRefs,
        paths: {
          "/v1/resources/{resourceType}": {
            get: {
              parameters: [
                {
                  name: "resourceType",
                  in: "path",
                  schema: { $ref: "#/components/schemas/ResourceType" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };
      mockSwaggerParser.parse.mockResolvedValue(mockParsed);
      mockSwaggerParser.bundle.mockResolvedValue(mockBundled);

      const result = await service.loadDocument(testUrl);

      expect(mockSwaggerParser.parse).toHaveBeenCalled();
      expect(mockSwaggerParser.bundle).toHaveBeenCalledWith(mockParsed);
      // Verify that $ref pointers are still present in the result
      const pathParam =
        result.paths?.["/v1/resources/{resourceType}"]?.get?.parameters?.[0];
      expect(pathParam?.schema).toHaveProperty("$ref");
      expect(pathParam?.schema?.$ref).toBe("#/components/schemas/ResourceType");
    });

    it("should detect and log OpenAPI version", async () => {
      const mockDoc = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      mockSwaggerParser.bundle.mockResolvedValue(mockDoc);
      mockFs.existsSync.mockReturnValue(true);

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/openapi-3.1.0.json"
      );
      const result = await service.loadDocument(testFilePath);

      expect(result.openapi).toBe("3.1.0");
      expect(mockSwaggerParser.bundle).toHaveBeenCalled();
    });

    it("should throw error for unsupported version", async () => {
      const mockDoc = {
        openapi: "2.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      mockSwaggerParser.bundle.mockResolvedValue(mockDoc);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/test.json"
      );
      await expect(service.loadDocument(testFilePath)).rejects.toThrow(
        "Unsupported OpenAPI version"
      );
    });

    it("should throw error when file not found", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      const testFilePath = "/nonexistent/file.json";
      await expect(service.loadDocument(testFilePath)).rejects.toThrow(
        "OpenAPI spec file not found"
      );
    });

    it("should throw error when SwaggerParser fails", async () => {
      const testUrl = "https://api.example.com/openapi.json";
      const mockDoc = { openapi: "3.0.0", info: {}, paths: {} };
      const mockResponse = {
        ok: true,
        text: async () => JSON.stringify(mockDoc),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);
      const mockParsed = { ...mockDoc, _parsed: true };
      mockSwaggerParser.parse.mockResolvedValue(mockParsed);
      mockSwaggerParser.bundle.mockRejectedValue(new Error("Network error"));
      // When bundle fails, it falls back to dereference
      mockSwaggerParser.dereference.mockRejectedValue(
        new Error("Network error")
      );

      await expect(service.loadDocument(testUrl)).rejects.toThrow(
        "Failed to load OpenAPI document"
      );
    });

    it("should handle OpenAPI 3.0.0", async () => {
      const mockDoc = {
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      mockSwaggerParser.bundle.mockResolvedValue(mockDoc);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/test.json"
      );
      const result = await service.loadDocument(testFilePath);

      expect(result.openapi).toBe("3.0.0");
    });

    it("should handle OpenAPI 3.0.3", async () => {
      const mockDoc = {
        openapi: "3.0.3",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
      };

      mockSwaggerParser.bundle.mockResolvedValue(mockDoc);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/test.json"
      );
      const result = await service.loadDocument(testFilePath);

      expect(result.openapi).toBe("3.0.3");
    });
  });

  describe("validateDocument", () => {
    it("should validate document from local file", async () => {
      mockSwaggerParser.validate.mockResolvedValue(undefined);
      mockFs.existsSync.mockReturnValue(true);

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/openapi-3.0.0.json"
      );
      await service.validateDocument(testFilePath);

      expect(mockSwaggerParser.validate).toHaveBeenCalledWith(
        path.resolve(testFilePath)
      );
    });

    it("should validate document from HTTP URL", async () => {
      mockSwaggerParser.validate.mockResolvedValue(undefined);

      const testUrl = "https://api.example.com/openapi.json";
      await service.validateDocument(testUrl);

      expect(mockSwaggerParser.validate).toHaveBeenCalledWith(testUrl);
    });

    it("should throw error when file not found", async () => {
      mockFs.existsSync.mockReturnValue(false);

      const testFilePath = "/nonexistent/file.json";
      await expect(service.validateDocument(testFilePath)).rejects.toThrow(
        "OpenAPI spec file not found"
      );
    });

    it("should throw error when validation fails", async () => {
      mockSwaggerParser.validate.mockRejectedValue(
        new Error("Invalid OpenAPI spec")
      );
      mockFs.existsSync.mockReturnValue(true);

      const testFilePath = path.join(
        __dirname,
        "../../__tests__/fixtures/test.json"
      );
      await expect(service.validateDocument(testFilePath)).rejects.toThrow(
        "Invalid OpenAPI document"
      );
    });
  });
});
