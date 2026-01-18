import { Injectable } from "@nestjs/common";
import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import type {
  IRSchema,
  IRField,
  IRAnnotations,
  IRDiscriminator,
} from "../ir/ir.types";
import { IRSchemaKind } from "../ir/ir.types";
import type { OpenAPIDocument } from "../openapi/openapi.types";
import {
  getSchemaFromRef,
  isSchemaNullable,
  getSchemaType,
} from "../openapi/openapi.types";

@Injectable()
export class SchemaConverterService {
  /**
   * Convert an OpenAPI schema reference to IR schema
   * Supports both OpenAPI 3.0 and 3.1
   */
  schemaRefToIR(
    doc: OpenAPIDocument,
    schemaRef:
      | OpenAPIV3.ReferenceObject
      | OpenAPIV3.SchemaObject
      | OpenAPIV3_1.ReferenceObject
      | OpenAPIV3_1.SchemaObject
      | undefined
  ): IRSchema {
    if (!schemaRef) {
      return { kind: IRSchemaKind.Unknown, nullable: false };
    }

    // Handle $ref
    if ("$ref" in schemaRef && schemaRef.$ref) {
      const ref = schemaRef.$ref;
      if (ref.startsWith("#/components/schemas/")) {
        const name = ref.replace("#/components/schemas/", "");
        return { kind: IRSchemaKind.Ref, ref: name, nullable: false };
      }
      // Handle other ref formats
      const parts = ref.split("/");
      if (parts.length > 0) {
        const name = parts[parts.length - 1];
        if (name) {
          return { kind: IRSchemaKind.Ref, ref: name, nullable: false };
        }
      }
      return { kind: IRSchemaKind.Unknown, nullable: false };
    }

    const schema = getSchemaFromRef(doc, schemaRef) as
      | OpenAPIV3.SchemaObject
      | OpenAPIV3_1.SchemaObject;
    if (!schema) {
      return { kind: IRSchemaKind.Unknown, nullable: false };
    }

    // Detect nullable (works for both 3.0 and 3.1)
    const nullable = isSchemaNullable(schema);

    // Polymorphism discriminator
    let discriminator: IRDiscriminator | undefined;
    if (schema.discriminator) {
      discriminator = {
        propertyName: schema.discriminator.propertyName,
        mapping: schema.discriminator.mapping,
      };
    }

    // Compositions
    if (schema.oneOf && schema.oneOf.length > 0) {
      const subs = schema.oneOf.map((sub) => this.schemaRefToIR(doc, sub));
      return {
        kind: IRSchemaKind.OneOf,
        oneOf: subs,
        nullable,
        discriminator,
      };
    }
    if (schema.anyOf && schema.anyOf.length > 0) {
      const subs = schema.anyOf.map((sub) => this.schemaRefToIR(doc, sub));
      return {
        kind: IRSchemaKind.AnyOf,
        anyOf: subs,
        nullable,
        discriminator,
      };
    }
    if (schema.allOf && schema.allOf.length > 0) {
      const subs = schema.allOf.map((sub) => this.schemaRefToIR(doc, sub));
      return {
        kind: IRSchemaKind.AllOf,
        allOf: subs,
        nullable,
        discriminator,
      };
    }
    if (schema.not) {
      const not = this.schemaRefToIR(doc, schema.not);
      return {
        kind: IRSchemaKind.Not,
        not,
        nullable,
        discriminator,
      };
    }

    // Enum
    if (schema.enum && schema.enum.length > 0) {
      const enumValues = schema.enum.map((v) => String(v));
      const enumBase = this.inferEnumBaseKind(schema);
      return {
        kind: IRSchemaKind.Enum,
        enumValues,
        enumRaw: schema.enum,
        enumBase,
        nullable,
        discriminator,
      };
    }

    // Primitive kinds and object/array
    // Handle both string and string[] types (3.0 vs 3.1)
    const type = getSchemaType(schema);
    const normalizedType = Array.isArray(type)
      ? type.filter((t) => t !== "null")[0]
      : type;

    if (normalizedType) {
      switch (normalizedType) {
        case "string":
          return {
            kind: IRSchemaKind.String,
            nullable,
            format: schema.format,
            discriminator,
          };
        case "integer":
          return {
            kind: IRSchemaKind.Integer,
            nullable,
            discriminator,
          };
        case "number":
          return {
            kind: IRSchemaKind.Number,
            nullable,
            discriminator,
          };
        case "boolean":
          return {
            kind: IRSchemaKind.Boolean,
            nullable,
            discriminator,
          };
        case "array":
          // When type is "array", schema has items property (required in OpenAPI spec)
          // TypeScript doesn't narrow the union type, so we use type assertion
          const arraySchema = schema as
            | (OpenAPIV3.SchemaObject & {
                items?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
              })
            | (OpenAPIV3_1.SchemaObject & {
                items?: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
              });
          const items = this.schemaRefToIR(doc, arraySchema.items);
          return {
            kind: IRSchemaKind.Array,
            items,
            nullable,
            discriminator,
          };
        case "object":
          // Properties
          const properties: IRField[] = [];
          if (schema.properties) {
            const propNames = Object.keys(schema.properties).sort();
            for (const name of propNames) {
              const prop = schema.properties[name];
              const fieldType = this.schemaRefToIR(doc, prop);
              const required = schema.required?.includes(name) || false;
              properties.push({
                name,
                type: fieldType,
                required,
                annotations: this.extractAnnotations(prop),
              });
            }
          }
          let additionalProperties: IRSchema | undefined;
          if (schema.additionalProperties) {
            if (typeof schema.additionalProperties === "object") {
              additionalProperties = this.schemaRefToIR(
                doc,
                schema.additionalProperties
              );
            }
          }
          return {
            kind: IRSchemaKind.Object,
            properties,
            additionalProperties,
            nullable,
            discriminator,
          };
      }
    }

    return {
      kind: IRSchemaKind.Unknown,
      nullable,
      discriminator,
    };
  }

  /**
   * Extract annotations from a schema reference
   * Supports both OpenAPI 3.0 and 3.1
   */
  extractAnnotations(
    schemaRef:
      | OpenAPIV3.ReferenceObject
      | OpenAPIV3.SchemaObject
      | OpenAPIV3_1.ReferenceObject
      | OpenAPIV3_1.SchemaObject
      | undefined
  ): IRAnnotations {
    if (!schemaRef || "$ref" in schemaRef) {
      return {};
    }
    const schema = schemaRef as
      | OpenAPIV3.SchemaObject
      | OpenAPIV3_1.SchemaObject;
    return {
      title: schema.title,
      description: schema.description,
      deprecated: schema.deprecated,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      default: schema.default,
      examples: schema.example
        ? Array.isArray(schema.example)
          ? schema.example
          : [schema.example]
        : undefined,
    };
  }

  /**
   * Infer the base kind for an enum
   * Supports both OpenAPI 3.0 and 3.1
   */
  private inferEnumBaseKind(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject
  ): IRSchemaKind {
    // Prefer explicit type when present
    const type = getSchemaType(schema);
    if (type) {
      const normalizedType = Array.isArray(type)
        ? type.filter((t) => t !== "null")[0]
        : type;
      if (normalizedType) {
        switch (normalizedType) {
          case "string":
            return IRSchemaKind.String;
          case "integer":
            return IRSchemaKind.Integer;
          case "number":
            return IRSchemaKind.Number;
          case "boolean":
            return IRSchemaKind.Boolean;
        }
      }
    }
    // Fallback: inspect first enum value
    if (schema.enum && schema.enum.length > 0) {
      const first = schema.enum[0];
      if (typeof first === "string") {
        return IRSchemaKind.String;
      }
      if (typeof first === "number") {
        return Number.isInteger(first)
          ? IRSchemaKind.Integer
          : IRSchemaKind.Number;
      }
      if (typeof first === "boolean") {
        return IRSchemaKind.Boolean;
      }
    }
    return IRSchemaKind.Unknown;
  }
}
