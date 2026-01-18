import type { IRSchema } from "../../ir/ir.types";
import { IRSchemaKind } from "../../ir/ir.types";
import { quoteTSPropertyName } from "./helpers";

/**
 * Convert an IR schema to @blimu/schema schema string
 * @param modelDefs Optional array of model definitions (not used anymore, kept for compatibility)
 * @param useLocalSchemaTypes If true, use TypeNameSchema directly (for schema.ts), otherwise use Schema.TypeNameSchema
 */
export function schemaToSchema(
  s: IRSchema,
  indent: string = "",
  modelDefs?: { name: string; schema: IRSchema }[],
  useLocalSchemaTypes: boolean = false
): string {
  const nextIndent = indent + "  ";
  let schemaCode: string;

  switch (s.kind) {
    case IRSchemaKind.String:
      schemaCode = "schema.string()";
      if (s.format === "date") {
        schemaCode = "schema.iso.date()";
      } else if (s.format === "date-time") {
        schemaCode = "schema.iso.datetime()";
      } else if (s.format === "email") {
        schemaCode = "schema.email()";
      } else if (s.format === "uri" || s.format === "url") {
        schemaCode = "schema.string().url()";
      } else if (s.format === "uuid") {
        schemaCode = "schema.string().uuid()";
      }
      break;
    case IRSchemaKind.Number:
      schemaCode = "schema.number()";
      break;
    case IRSchemaKind.Integer:
      schemaCode = "schema.number().int()";
      break;
    case IRSchemaKind.Boolean:
      schemaCode = "schema.boolean()";
      break;
    case IRSchemaKind.Null:
      schemaCode = "schema.null()";
      break;
    case IRSchemaKind.Ref:
      if (s.ref) {
        // Simple types are now exported directly (not in SchemaTypes namespace)
        // In schema.ts, use TypeNameSchema directly (same file)
        // Elsewhere, use Schema.TypeNameSchema
        schemaCode = useLocalSchemaTypes
          ? `${s.ref}Schema`
          : `Schema.${s.ref}Schema`;
      } else {
        schemaCode = "schema.unknown()";
      }
      break;
    case IRSchemaKind.Array:
      if (s.items) {
        const itemsSchema = schemaToSchema(
          s.items,
          nextIndent,
          modelDefs,
          useLocalSchemaTypes
        );
        schemaCode = `schema.array(${itemsSchema})`;
      } else {
        schemaCode = "schema.array(schema.unknown())";
      }
      break;
    case IRSchemaKind.Object:
      if (!s.properties || s.properties.length === 0) {
        if (s.additionalProperties) {
          const valueSchema = schemaToSchema(
            s.additionalProperties,
            nextIndent,
            modelDefs,
            useLocalSchemaTypes
          );
          schemaCode = `schema.record(schema.string(), ${valueSchema})`;
        } else {
          schemaCode = "schema.record(schema.string(), schema.unknown())";
        }
      } else {
        const props: string[] = [];
        for (const field of s.properties) {
          const fieldSchema = schemaToSchema(
            field.type,
            nextIndent,
            modelDefs,
            useLocalSchemaTypes
          );
          const fieldName = quoteTSPropertyName(field.name);
          if (field.required) {
            props.push(`${nextIndent}${fieldName}: ${fieldSchema}`);
          } else {
            props.push(`${nextIndent}${fieldName}: ${fieldSchema}.optional()`);
          }
        }
        const objectSchema = `schema.object({\n${props.join(",\n")}\n${indent}})`;
        if (s.additionalProperties) {
          const valueSchema = schemaToSchema(
            s.additionalProperties,
            nextIndent,
            modelDefs,
            useLocalSchemaTypes
          );
          // Use passthrough() to allow additional properties
          schemaCode = `${objectSchema}.passthrough()`;
        } else {
          schemaCode = objectSchema;
        }
      }
      break;
    case IRSchemaKind.Enum:
      if (s.enumValues && s.enumValues.length > 0) {
        // Create enum from string literals
        const enumValues = s.enumValues.map((v) => {
          // Handle boolean and number strings
          if (v === "true" || v === "false") {
            return v;
          }
          if (/^-?[0-9]+(\.[0-9]+)?$/.test(v)) {
            return v;
          }
          return JSON.stringify(v);
        });
        schemaCode = `schema.enum([${enumValues.join(", ")}])`;
      } else {
        schemaCode = "schema.string()";
      }
      break;
    case IRSchemaKind.OneOf:
      if (s.oneOf && s.oneOf.length > 0) {
        const options = s.oneOf.map((opt) =>
          schemaToSchema(opt, nextIndent, modelDefs, useLocalSchemaTypes)
        );
        schemaCode = `schema.union([${options.join(", ")}])`;
      } else {
        schemaCode = "schema.unknown()";
      }
      break;
    case IRSchemaKind.AnyOf:
      if (s.anyOf && s.anyOf.length > 0) {
        const options = s.anyOf.map((opt) =>
          schemaToSchema(opt, nextIndent, modelDefs, useLocalSchemaTypes)
        );
        schemaCode = `schema.union([${options.join(", ")}])`;
      } else {
        schemaCode = "schema.unknown()";
      }
      break;
    case IRSchemaKind.AllOf:
      if (s.allOf && s.allOf.length > 0) {
        // For allOf, we need to merge object schemas
        // This is a simplified approach - extend the first schema with the rest
        const schemas = s.allOf.map((sch) =>
          schemaToSchema(sch, nextIndent, modelDefs, useLocalSchemaTypes)
        );
        // Use extend() to merge object schemas
        if (schemas.length > 1) {
          schemaCode = schemas[0];
          for (let i = 1; i < schemas.length; i++) {
            schemaCode = `${schemaCode}.extend(${schemas[i]}.shape)`;
          }
        } else {
          schemaCode = schemas[0];
        }
      } else {
        schemaCode = "schema.unknown()";
      }
      break;
    default:
      schemaCode = "schema.unknown()";
  }

  // Handle nullable
  if (s.nullable && schemaCode !== "schema.null()") {
    schemaCode = `${schemaCode}.nullable()`;
  }

  return schemaCode;
}

// Keep the old function name for backward compatibility during migration
export const schemaToZodSchema = schemaToSchema;
