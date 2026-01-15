import { describe, it, expect, beforeEach } from "vitest";
import { SchemaConverterService } from "../schema-converter.service";
import { IRSchemaKind } from "../../ir/ir.types";
import {
  createMockOpenAPI30Document,
  createMockOpenAPI31Document,
} from "../../__tests__/helpers/test-utils";
import {
  createNullableSchema30,
  createNullableSchema31,
  createArraySchema30,
  createArraySchema31,
  createObjectSchema30,
  createObjectSchema31,
  createEnumSchema30,
  createEnumSchema31,
} from "../../__tests__/helpers/create-mock-schema";

describe("SchemaConverterService", () => {
  let service: SchemaConverterService;

  beforeEach(() => {
    service = new SchemaConverterService();
  });

  describe("schemaRefToIR", () => {
    describe("OpenAPI 3.0", () => {
      const doc = createMockOpenAPI30Document();

      it("should convert string schema", () => {
        const schema = { type: "string" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.String);
        expect(result.nullable).toBe(false);
      });

      it("should convert nullable string schema", () => {
        const schema = createNullableSchema30("string");
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.String);
        expect(result.nullable).toBe(true);
      });

      it("should convert number schema", () => {
        const schema = { type: "number" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Number);
        expect(result.nullable).toBe(false);
      });

      it("should convert integer schema", () => {
        const schema = { type: "integer" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Integer);
        expect(result.nullable).toBe(false);
      });

      it("should convert boolean schema", () => {
        const schema = { type: "boolean" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Boolean);
        expect(result.nullable).toBe(false);
      });

      it("should convert array schema with items", () => {
        const schema = createArraySchema30({ type: "string" });
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Array);
        expect(result.items).toBeDefined();
        expect(result.items?.kind).toBe(IRSchemaKind.String);
      });

      it("should convert object schema with properties", () => {
        const schema = createObjectSchema30(
          {
            name: { type: "string" },
            age: { type: "integer" },
          },
          ["name"]
        );
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Object);
        expect(result.properties).toBeDefined();
        expect(result.properties?.length).toBe(2);
        expect(
          result.properties?.find((p) => p.name === "name")?.required
        ).toBe(true);
        expect(result.properties?.find((p) => p.name === "age")?.required).toBe(
          false
        );
      });

      it("should convert enum schema", () => {
        const schema = createEnumSchema30(["red", "green", "blue"]);
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Enum);
        expect(result.enumValues).toEqual(["red", "green", "blue"]);
        expect(result.enumBase).toBe(IRSchemaKind.String);
      });

      it("should convert enum with number values", () => {
        const schema = createEnumSchema30([1, 2, 3], "integer");
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Enum);
        expect(result.enumBase).toBe(IRSchemaKind.Integer);
      });

      it("should convert $ref to component schema", () => {
        const docWithSchema = createMockOpenAPI30Document({
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
        const result = service.schemaRefToIR(docWithSchema, {
          $ref: "#/components/schemas/User",
        });
        expect(result.kind).toBe(IRSchemaKind.Ref);
        expect(result.ref).toBe("User");
      });

      it("should convert oneOf schema", () => {
        const schema = {
          oneOf: [{ type: "string" }, { type: "number" }],
        };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.OneOf);
        expect(result.oneOf).toBeDefined();
        expect(result.oneOf?.length).toBe(2);
      });

      it("should convert anyOf schema", () => {
        const schema = {
          anyOf: [{ type: "string" }, { type: "number" }],
        };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.AnyOf);
        expect(result.anyOf).toBeDefined();
        expect(result.anyOf?.length).toBe(2);
      });

      it("should convert allOf schema", () => {
        const schema = {
          allOf: [
            { type: "object" },
            { properties: { name: { type: "string" } } },
          ],
        };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.AllOf);
        expect(result.allOf).toBeDefined();
        expect(result.allOf?.length).toBe(2);
      });

      it("should convert not schema", () => {
        const schema = {
          not: { type: "null" },
        };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Not);
        expect(result.not).toBeDefined();
      });

      it("should handle unknown schema", () => {
        const result = service.schemaRefToIR(doc, undefined);
        expect(result.kind).toBe(IRSchemaKind.Unknown);
      });

      it("should handle string with format", () => {
        const schema = { type: "string", format: "date-time" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.String);
        expect(result.format).toBe("date-time");
      });

      it("should handle binary format", () => {
        const schema = { type: "string", format: "binary" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.String);
        expect(result.format).toBe("binary");
      });
    });

    describe("OpenAPI 3.1", () => {
      const doc = createMockOpenAPI31Document();

      it("should convert nullable string using type array", () => {
        const schema = createNullableSchema31("string");
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.String);
        expect(result.nullable).toBe(true);
      });

      it("should convert non-nullable string in 3.1", () => {
        const schema = { type: "string" };
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.String);
        expect(result.nullable).toBe(false);
      });

      it("should convert nullable number using type array", () => {
        const schema = createNullableSchema31("number");
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Number);
        expect(result.nullable).toBe(true);
      });

      it("should convert array schema in 3.1", () => {
        const schema = createArraySchema31({ type: "string" });
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Array);
        expect(result.items).toBeDefined();
      });

      it("should convert object schema in 3.1", () => {
        const schema = createObjectSchema31({
          name: { type: "string" },
        });
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Object);
        expect(result.properties).toBeDefined();
      });

      it("should convert enum in 3.1", () => {
        const schema = createEnumSchema31(["a", "b", "c"]);
        const result = service.schemaRefToIR(doc, schema);
        expect(result.kind).toBe(IRSchemaKind.Enum);
        expect(result.enumValues).toEqual(["a", "b", "c"]);
      });
    });
  });

  describe("extractAnnotations", () => {
    it("should extract title and description", () => {
      const schema = {
        type: "string",
        title: "User Name",
        description: "The user's full name",
      };
      const result = service.extractAnnotations(schema);
      expect(result.title).toBe("User Name");
      expect(result.description).toBe("The user's full name");
    });

    it("should extract deprecated flag", () => {
      const schema = {
        type: "string",
        deprecated: true,
      };
      const result = service.extractAnnotations(schema);
      expect(result.deprecated).toBe(true);
    });

    it("should extract readOnly and writeOnly", () => {
      const schema = {
        type: "string",
        readOnly: true,
        writeOnly: false,
      };
      const result = service.extractAnnotations(schema);
      expect(result.readOnly).toBe(true);
      expect(result.writeOnly).toBe(false);
    });

    it("should extract default value", () => {
      const schema = {
        type: "string",
        default: "unknown",
      };
      const result = service.extractAnnotations(schema);
      expect(result.default).toBe("unknown");
    });

    it("should extract example as array", () => {
      const schema = {
        type: "string",
        example: "test",
      };
      const result = service.extractAnnotations(schema);
      expect(result.examples).toEqual(["test"]);
    });

    it("should extract examples array", () => {
      const schema = {
        type: "string",
        example: ["example1", "example2"],
      };
      const result = service.extractAnnotations(schema);
      expect(result.examples).toEqual(["example1", "example2"]);
    });

    it("should return empty object for $ref", () => {
      const result = service.extractAnnotations({
        $ref: "#/components/schemas/User",
      });
      expect(result).toEqual({});
    });

    it("should return empty object for undefined", () => {
      const result = service.extractAnnotations(undefined);
      expect(result).toEqual({});
    });
  });

  describe("nullable handling comparison", () => {
    it("should produce same IR for 3.0 nullable and 3.1 type array with null", () => {
      const doc30 = createMockOpenAPI30Document();
      const doc31 = createMockOpenAPI31Document();

      const schema30 = createNullableSchema30("string");
      const schema31 = createNullableSchema31("string");

      const result30 = service.schemaRefToIR(doc30, schema30);
      const result31 = service.schemaRefToIR(doc31, schema31);

      expect(result30.nullable).toBe(true);
      expect(result31.nullable).toBe(true);
      expect(result30.kind).toBe(result31.kind);
    });
  });
});
