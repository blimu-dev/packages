import { describe, it, expect } from "vitest";
import {
  normalizeDocument,
  getSchemaFromRef,
  isSchemaNullable,
  getSchemaType,
} from "../openapi.types";
import {
  createMockOpenAPI30Document,
  createMockOpenAPI31Document,
} from "../../__tests__/helpers/test-utils";
import {
  createNullableSchema30,
  createNullableSchema31,
  createObjectSchema30,
  createObjectSchema31,
} from "../../__tests__/helpers/create-mock-schema";

describe("openapi.types", () => {
  describe("normalizeDocument", () => {
    it("should normalize OpenAPI 3.0 document", () => {
      const doc = createMockOpenAPI30Document({
        openapi: "3.0.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });
      const normalized = normalizeDocument(doc);
      expect(normalized.openapi).toBe("3.0.0");
      expect(normalized.info.title).toBe("Test");
      expect(normalized.paths).toBeDefined();
    });

    it("should normalize OpenAPI 3.1 document", () => {
      const doc = createMockOpenAPI31Document({
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              operationId: "test",
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });
      const normalized = normalizeDocument(doc);
      expect(normalized.openapi).toBe("3.1.0");
      expect(normalized.info.title).toBe("Test");
      expect(normalized.paths).toBeDefined();
    });

    it("should handle undefined paths", () => {
      const doc = createMockOpenAPI30Document({
        paths: undefined,
      });
      const normalized = normalizeDocument(doc);
      expect(normalized.paths).toBeUndefined();
    });
  });

  describe("getSchemaFromRef", () => {
    it("should resolve component schema reference", () => {
      const doc = createMockOpenAPI30Document({
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
          },
        },
      });
      const schema = getSchemaFromRef(doc, {
        $ref: "#/components/schemas/User",
      });
      expect(schema).toBeDefined();
      expect(schema?.type).toBe("object");
    });

    it("should return undefined for non-existent reference", () => {
      const doc = createMockOpenAPI30Document();
      const schema = getSchemaFromRef(doc, {
        $ref: "#/components/schemas/NonExistent",
      });
      expect(schema).toBeUndefined();
    });

    it("should return schema directly when not a reference", () => {
      const doc = createMockOpenAPI30Document();
      const schemaObj = { type: "string" };
      const schema = getSchemaFromRef(doc, schemaObj);
      expect(schema).toBe(schemaObj);
    });

    it("should handle recursive references", () => {
      const doc = createMockOpenAPI30Document({
        components: {
          schemas: {
            User: {
              $ref: "#/components/schemas/UserDetails",
            },
            UserDetails: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
          },
        },
      });
      const schema = getSchemaFromRef(doc, {
        $ref: "#/components/schemas/User",
      });
      expect(schema).toBeDefined();
      expect(schema?.type).toBe("object");
    });

    it("should return undefined for invalid reference format", () => {
      const doc = createMockOpenAPI30Document();
      const schema = getSchemaFromRef(doc, { $ref: "invalid-ref" });
      expect(schema).toBeUndefined();
    });
  });

  describe("isSchemaNullable", () => {
    it("should detect nullable in OpenAPI 3.0", () => {
      const schema = createNullableSchema30("string");
      expect(isSchemaNullable(schema)).toBe(true);
    });

    it("should detect nullable in OpenAPI 3.1 (type array with null)", () => {
      const schema = createNullableSchema31("string");
      expect(isSchemaNullable(schema)).toBe(true);
    });

    it("should return false for non-nullable schema in 3.0", () => {
      const schema = createObjectSchema30({ name: { type: "string" } });
      expect(isSchemaNullable(schema)).toBe(false);
    });

    it("should return false for non-nullable schema in 3.1", () => {
      const schema = createObjectSchema31({ name: { type: "string" } });
      expect(isSchemaNullable(schema)).toBe(false);
    });

    it("should return false for undefined schema", () => {
      expect(isSchemaNullable(undefined)).toBe(false);
    });

    it("should handle nullable number in 3.0", () => {
      const schema = createNullableSchema30("number");
      expect(isSchemaNullable(schema)).toBe(true);
    });

    it("should handle nullable number in 3.1", () => {
      const schema = createNullableSchema31("number");
      expect(isSchemaNullable(schema)).toBe(true);
    });
  });

  describe("getSchemaType", () => {
    it("should return string type for string schema", () => {
      const schema = { type: "string" };
      expect(getSchemaType(schema)).toBe("string");
    });

    it("should return array type for OpenAPI 3.1", () => {
      const schema = { type: ["string", "null"] };
      expect(getSchemaType(schema)).toBe(schema.type);
    });

    it("should return undefined for schema without type", () => {
      const schema = {};
      expect(getSchemaType(schema)).toBeUndefined();
    });

    it("should return undefined for undefined schema", () => {
      expect(getSchemaType(undefined)).toBeUndefined();
    });

    it("should handle number type", () => {
      const schema = { type: "number" };
      expect(getSchemaType(schema)).toBe("number");
    });

    it("should handle array type in 3.1", () => {
      const schema = { type: ["number", "null"] };
      const result = getSchemaType(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("number");
      expect(result).toContain("null");
    });
  });
});
