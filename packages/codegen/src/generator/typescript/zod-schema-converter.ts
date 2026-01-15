import { IRSchema, IRSchemaKind } from "../../ir/ir.types";
import { quoteTSPropertyName } from "./helpers";

/**
 * Convert an IR schema to Zod schema string
 * @param modelDefs Optional array of model definitions (not used anymore, kept for compatibility)
 * @param useLocalSchemaTypes If true, use TypeNameSchema directly (for schema.zod.ts), otherwise use Schema.TypeNameSchema
 */
export function schemaToZodSchema(
  s: IRSchema,
  indent: string = "",
  modelDefs?: Array<{ name: string; schema: IRSchema }>,
  useLocalSchemaTypes: boolean = false
): string {
  const nextIndent = indent + "  ";
  let zod: string;

  switch (s.kind) {
    case IRSchemaKind.String:
      zod = "z.string()";
      if (s.format === "date" || s.format === "date-time") {
        zod += ".datetime()";
      } else if (s.format === "email") {
        zod += ".email()";
      } else if (s.format === "uri" || s.format === "url") {
        zod += ".url()";
      } else if (s.format === "uuid") {
        zod += ".uuid()";
      }
      break;
    case IRSchemaKind.Number:
      zod = "z.number()";
      break;
    case IRSchemaKind.Integer:
      zod = "z.number().int()";
      break;
    case IRSchemaKind.Boolean:
      zod = "z.boolean()";
      break;
    case IRSchemaKind.Null:
      zod = "z.null()";
      break;
    case IRSchemaKind.Ref:
      if (s.ref) {
        // Simple types are now exported directly (not in SchemaTypes namespace)
        // In schema.zod.ts, use TypeNameSchema directly (same file)
        // Elsewhere, use Schema.TypeNameSchema
        zod = useLocalSchemaTypes ? `${s.ref}Schema` : `Schema.${s.ref}Schema`;
      } else {
        zod = "z.unknown()";
      }
      break;
    case IRSchemaKind.Array:
      if (s.items) {
        const itemsZod = schemaToZodSchema(
          s.items,
          nextIndent,
          modelDefs,
          useLocalSchemaTypes
        );
        zod = `z.array(${itemsZod})`;
      } else {
        zod = "z.array(z.unknown())";
      }
      break;
    case IRSchemaKind.Object:
      if (!s.properties || s.properties.length === 0) {
        if (s.additionalProperties) {
          const valueZod = schemaToZodSchema(
            s.additionalProperties,
            nextIndent,
            modelDefs,
            useLocalSchemaTypes
          );
          zod = `z.record(z.string(), ${valueZod})`;
        } else {
          zod = "z.record(z.string(), z.unknown())";
        }
      } else {
        const props: string[] = [];
        for (const field of s.properties) {
          const fieldZod = schemaToZodSchema(
            field.type,
            nextIndent,
            modelDefs,
            useLocalSchemaTypes
          );
          const fieldName = quoteTSPropertyName(field.name);
          if (field.required) {
            props.push(`${nextIndent}${fieldName}: ${fieldZod}`);
          } else {
            props.push(`${nextIndent}${fieldName}: ${fieldZod}.optional()`);
          }
        }
        const objectZod = `z.object({\n${props.join(",\n")}\n${indent}})`;
        if (s.additionalProperties) {
          const valueZod = schemaToZodSchema(
            s.additionalProperties,
            nextIndent,
            modelDefs,
            useLocalSchemaTypes
          );
          // Use .catchall() instead of spreading .shape (which doesn't exist on ZodRecord)
          // This allows additional properties of the specified type
          zod = `${objectZod}.catchall(${valueZod})`;
        } else {
          zod = objectZod;
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
        zod = `z.enum([${enumValues.join(", ")}])`;
      } else {
        zod = "z.string()";
      }
      break;
    case IRSchemaKind.OneOf:
      if (s.oneOf && s.oneOf.length > 0) {
        const options = s.oneOf.map((opt) =>
          schemaToZodSchema(opt, nextIndent, modelDefs, useLocalSchemaTypes)
        );
        zod = `z.union([${options.join(", ")}])`;
      } else {
        zod = "z.unknown()";
      }
      break;
    case IRSchemaKind.AnyOf:
      if (s.anyOf && s.anyOf.length > 0) {
        const options = s.anyOf.map((opt) =>
          schemaToZodSchema(opt, nextIndent, modelDefs, useLocalSchemaTypes)
        );
        zod = `z.union([${options.join(", ")}])`;
      } else {
        zod = "z.unknown()";
      }
      break;
    case IRSchemaKind.AllOf:
      if (s.allOf && s.allOf.length > 0) {
        const schemas = s.allOf.map((sch) =>
          schemaToZodSchema(sch, nextIndent, modelDefs, useLocalSchemaTypes)
        );
        // Zod doesn't have allOf, so we use intersection
        zod = schemas.join(".and(") + ")".repeat(schemas.length - 1);
      } else {
        zod = "z.unknown()";
      }
      break;
    default:
      zod = "z.unknown()";
  }

  // Handle nullable
  if (s.nullable && zod !== "z.null()") {
    zod = `${zod}.nullable()`;
  }

  return zod;
}
