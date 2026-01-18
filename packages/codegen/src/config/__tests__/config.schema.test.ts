import { describe, it, expect } from "vitest";
import {
  ConfigSchema,
  TypeScriptClientSchema,
  ClientSchema,
  TYPESCRIPT_TEMPLATE_NAMES,
} from "../config.schema";
import type { TypeScriptTemplateName } from "../config.schema";

describe("ConfigSchema", () => {
  describe("TypeScript Client Schema", () => {
    it("should validate a valid TypeScript client config", () => {
      const valid = {
        type: "typescript",
        outDir: "./output",
        packageName: "my-sdk",
        name: "MyClient",
      };

      const result = TypeScriptClientSchema.parse(valid);
      expect(result.type).toBe("typescript");
      expect(result.packageName).toBe("my-sdk");
      expect(result.name).toBe("MyClient");
    });

    it("should require packageName for TypeScript clients", () => {
      const invalid = {
        type: "typescript",
        outDir: "./output",
        name: "MyClient",
      };

      expect(() => TypeScriptClientSchema.parse(invalid)).toThrow();
    });

    it("should accept optional TypeScript-specific options", () => {
      const valid = {
        type: "typescript",
        outDir: "./output",
        packageName: "my-sdk",
        name: "MyClient",
        moduleName: "@myorg/my-sdk",
        includeQueryKeys: true,
      };

      const result = TypeScriptClientSchema.parse(valid);
      expect(result.moduleName).toBe("@myorg/my-sdk");
      expect(result.includeQueryKeys).toBe(true);
    });

    it("should accept template overrides with valid template names", () => {
      const valid = {
        type: "typescript",
        outDir: "./output",
        packageName: "my-sdk",
        name: "MyClient",
        templates: {
          "client.ts.hbs": "./custom/client.ts.hbs",
          "index.ts.hbs": "./custom/index.ts.hbs",
        },
      };

      const result = TypeScriptClientSchema.parse(valid);
      expect(result.templates).toBeDefined();
      expect(result.templates?.["client.ts.hbs"]).toBe(
        "./custom/client.ts.hbs"
      );
      expect(result.templates?.["index.ts.hbs"]).toBe("./custom/index.ts.hbs");
    });

    it("should reject template overrides with invalid template names", () => {
      const invalid = {
        type: "typescript",
        outDir: "./output",
        packageName: "my-sdk",
        name: "MyClient",
        templates: {
          "invalid-template.hbs": "./custom/invalid.hbs",
        },
      };

      expect(() => TypeScriptClientSchema.parse(invalid)).toThrow();
    });

    it("should accept all valid template names", () => {
      const templates: Partial<Record<TypeScriptTemplateName, string>> = {};
      for (const templateName of TYPESCRIPT_TEMPLATE_NAMES) {
        templates[templateName] = `./custom/${templateName}`;
      }

      const valid = {
        type: "typescript",
        outDir: "./output",
        packageName: "my-sdk",
        name: "MyClient",
        templates,
      };

      const result = TypeScriptClientSchema.parse(valid);
      expect(result.templates).toBeDefined();
      for (const templateName of TYPESCRIPT_TEMPLATE_NAMES) {
        expect(result.templates?.[templateName as TypeScriptTemplateName]).toBe(
          `./custom/${templateName}`
        );
      }
    });
  });

  describe("Discriminated Union", () => {
    it("should validate TypeScript client in discriminated union", () => {
      const valid = {
        type: "typescript",
        outDir: "./output",
        packageName: "my-sdk",
        name: "MyClient",
      };

      const result = ClientSchema.parse(valid);
      expect(result.type).toBe("typescript");
      if (result.type === "typescript") {
        expect(result.packageName).toBe("my-sdk");
      }
    });

    it("should reject invalid client type in discriminated union", () => {
      const invalid = {
        type: "invalid-type",
        outDir: "./output",
        name: "MyClient",
      };

      expect(() => ClientSchema.parse(invalid)).toThrow();
    });
  });

  describe("Full Config Schema", () => {
    it("should validate a complete config with TypeScript client", () => {
      const valid = {
        spec: "./openapi.json",
        clients: [
          {
            type: "typescript",
            outDir: "./output",
            packageName: "my-sdk",
            name: "MyClient",
          },
        ],
      };

      const result = ConfigSchema.parse(valid);
      expect(result.spec).toBe("./openapi.json");
      expect(result.clients).toHaveLength(1);
      expect(result.clients[0].type).toBe("typescript");
      if (result.clients[0].type === "typescript") {
        expect(result.clients[0].packageName).toBe("my-sdk");
      }
    });

    it("should validate config with template overrides", () => {
      const valid = {
        spec: "./openapi.json",
        clients: [
          {
            type: "typescript",
            outDir: "./output",
            packageName: "my-sdk",
            name: "MyClient",
            templates: {
              "client.ts.hbs": "./templates/client.ts.hbs",
            },
          },
        ],
      };

      const result = ConfigSchema.parse(valid);
      expect(result.clients[0].type).toBe("typescript");
      if (result.clients[0].type === "typescript") {
        expect(result.clients[0].templates).toBeDefined();
        expect(result.clients[0].templates?.["client.ts.hbs"]).toBe(
          "./templates/client.ts.hbs"
        );
      }
    });
  });
});
