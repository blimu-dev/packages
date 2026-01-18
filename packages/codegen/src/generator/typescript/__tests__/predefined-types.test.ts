import { describe, it, expect } from "vitest";
import { schemaToTSType } from "../helpers";
import { IRSchema, IRSchemaKind } from "../../../ir/ir.types";

describe("schemaToTSType with predefined types", () => {
  const predefinedTypes = [
    { type: "ResourceType", package: "@blimu/types" },
    { type: "EntitlementType", package: "@blimu/types" },
    { type: "PlanType", package: "@blimu/types" },
    { type: "LimitType", package: "@blimu/types" },
    { type: "UsageLimitType", package: "@blimu/types" },
  ];

  it("should return type name directly for predefined type refs", () => {
    const schema: IRSchema = {
      kind: IRSchemaKind.Ref,
      ref: "ResourceType",
      nullable: false,
    };

    const result = schemaToTSType(schema, predefinedTypes);
    expect(result).toBe("ResourceType");
  });

  it("should return Schema.TypeName for non-predefined type refs", () => {
    const schema: IRSchema = {
      kind: IRSchemaKind.Ref,
      ref: "User",
      nullable: false,
    };

    const result = schemaToTSType(schema, predefinedTypes);
    expect(result).toBe("Schema.User");
  });

  it("should handle predefined types in arrays", () => {
    const schema: IRSchema = {
      kind: IRSchemaKind.Array,
      items: {
        kind: IRSchemaKind.Ref,
        ref: "ResourceType",
        nullable: false,
      },
      nullable: false,
    };

    const result = schemaToTSType(schema, predefinedTypes);
    expect(result).toBe("ResourceType[]");
  });

  it("should handle predefined types in object properties", () => {
    const schema: IRSchema = {
      kind: IRSchemaKind.Object,
      properties: [
        {
          name: "type",
          type: {
            kind: IRSchemaKind.Ref,
            ref: "ResourceType",
            nullable: false,
          },
          required: true,
          annotations: {},
        },
        {
          name: "id",
          type: {
            kind: IRSchemaKind.String,
            nullable: false,
          },
          required: true,
          annotations: {},
        },
      ],
      nullable: false,
    };

    const result = schemaToTSType(schema, predefinedTypes);
    expect(result).toContain("type: ResourceType");
    expect(result).toContain("id: string");
    expect(result).not.toContain("Schema.ResourceType");
  });

  it("should handle nested predefined types in complex structures", () => {
    const schema: IRSchema = {
      kind: IRSchemaKind.Object,
      properties: [
        {
          name: "parents",
          type: {
            kind: IRSchemaKind.Array,
            items: {
              kind: IRSchemaKind.Object,
              properties: [
                {
                  name: "id",
                  type: {
                    kind: IRSchemaKind.String,
                    nullable: false,
                  },
                  required: true,
                  annotations: {},
                },
                {
                  name: "type",
                  type: {
                    kind: IRSchemaKind.Ref,
                    ref: "ResourceType",
                    nullable: false,
                  },
                  required: true,
                  annotations: {},
                },
              ],
              nullable: false,
            },
            nullable: false,
          },
          required: false,
          annotations: {},
        },
      ],
      nullable: false,
    };

    const result = schemaToTSType(schema, predefinedTypes);
    expect(result).toContain("type: ResourceType");
    expect(result).not.toContain("Schema.ResourceType");
  });

  it("should handle oneOf with predefined types", () => {
    const schema: IRSchema = {
      kind: IRSchemaKind.OneOf,
      oneOf: [
        {
          kind: IRSchemaKind.Ref,
          ref: "ResourceType",
          nullable: false,
        },
        {
          kind: IRSchemaKind.String,
          nullable: false,
        },
      ],
      nullable: false,
    };

    const result = schemaToTSType(schema, predefinedTypes);
    expect(result).toBe("ResourceType | string");
    expect(result).not.toContain("Schema.ResourceType");
  });
});
