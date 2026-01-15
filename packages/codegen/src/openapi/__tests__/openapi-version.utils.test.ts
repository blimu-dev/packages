import { describe, it, expect } from "vitest";
import {
  detectOpenAPIVersion,
  isSupportedVersion,
  isOpenAPI31,
  isOpenAPI30,
  type OpenAPIDocument,
} from "../openapi-version.utils";
import {
  createMockOpenAPI30Document,
  createMockOpenAPI31Document,
} from "../../__tests__/helpers/test-utils";

describe("openapi-version.utils", () => {
  describe("detectOpenAPIVersion", () => {
    it("should detect OpenAPI 3.0.0", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.0" });
      expect(detectOpenAPIVersion(doc)).toBe("3.0");
    });

    it("should detect OpenAPI 3.0.1", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.1" });
      expect(detectOpenAPIVersion(doc)).toBe("3.0");
    });

    it("should detect OpenAPI 3.0.2", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.2" });
      expect(detectOpenAPIVersion(doc)).toBe("3.0");
    });

    it("should detect OpenAPI 3.0.3", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.3" });
      expect(detectOpenAPIVersion(doc)).toBe("3.0");
    });

    it("should detect OpenAPI 3.1.0", () => {
      const doc = createMockOpenAPI31Document({ openapi: "3.1.0" });
      expect(detectOpenAPIVersion(doc)).toBe("3.1");
    });

    it("should return unknown for unsupported versions", () => {
      const doc = createMockOpenAPI30Document({ openapi: "2.0.0" } as any);
      expect(detectOpenAPIVersion(doc)).toBe("unknown");
    });

    it("should return unknown for malformed version strings", () => {
      const doc = createMockOpenAPI30Document({ openapi: "invalid" } as any);
      expect(detectOpenAPIVersion(doc)).toBe("unknown");
    });

    it("should return unknown for non-string version", () => {
      const doc = createMockOpenAPI30Document({ openapi: 3.0 } as any);
      expect(detectOpenAPIVersion(doc)).toBe("unknown");
    });
  });

  describe("isSupportedVersion", () => {
    it("should return true for 3.0", () => {
      expect(isSupportedVersion("3.0")).toBe(true);
    });

    it("should return true for 3.1", () => {
      expect(isSupportedVersion("3.1")).toBe(true);
    });

    it("should return false for unknown", () => {
      expect(isSupportedVersion("unknown")).toBe(false);
    });
  });

  describe("isOpenAPI31", () => {
    it("should return true for OpenAPI 3.1.0 document", () => {
      const doc = createMockOpenAPI31Document({ openapi: "3.1.0" });
      expect(isOpenAPI31(doc)).toBe(true);
    });

    it("should return false for OpenAPI 3.0.0 document", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.0" });
      expect(isOpenAPI31(doc)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const doc: OpenAPIDocument = createMockOpenAPI31Document({
        openapi: "3.1.0",
      });
      if (isOpenAPI31(doc)) {
        // TypeScript should know this is OpenAPIV3_1.Document
        expect(doc.openapi).toBe("3.1.0");
      }
    });
  });

  describe("isOpenAPI30", () => {
    it("should return true for OpenAPI 3.0.0 document", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.0" });
      expect(isOpenAPI30(doc)).toBe(true);
    });

    it("should return true for OpenAPI 3.0.3 document", () => {
      const doc = createMockOpenAPI30Document({ openapi: "3.0.3" });
      expect(isOpenAPI30(doc)).toBe(true);
    });

    it("should return false for OpenAPI 3.1.0 document", () => {
      const doc = createMockOpenAPI31Document({ openapi: "3.1.0" });
      expect(isOpenAPI30(doc)).toBe(false);
    });

    it("should narrow type correctly", () => {
      const doc: OpenAPIDocument = createMockOpenAPI30Document({
        openapi: "3.0.0",
      });
      if (isOpenAPI30(doc)) {
        // TypeScript should know this is OpenAPIV3.Document
        expect(doc.openapi).toBe("3.0.0");
      }
    });
  });
});
