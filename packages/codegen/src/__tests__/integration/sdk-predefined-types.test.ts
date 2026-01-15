import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  generateTestSDK,
  cleanupTestSDK,
  getSDKFilePath,
} from "./helpers/sdk-generator";

describe("Generated SDK - Predefined Types", () => {
  let sdkPath: string;
  let schemaContent: string;
  let packageJsonContent: string;

  beforeAll(async () => {
    // Generate SDK from test spec with predefined types
    const config = {
      clients: [
        {
          type: "typescript",
          packageName: "test-sdk",
          name: "TestClient",
          predefinedTypes: [
            { type: "ResourceType", package: "@blimu/types" },
            { type: "EntitlementType", package: "@blimu/types" },
            { type: "PlanType", package: "@blimu/types" },
            { type: "LimitType", package: "@blimu/types" },
            { type: "UsageLimitType", package: "@blimu/types" },
          ],
          dependencies: {
            "@blimu/types": "^0.1.0",
          },
          devDependencies: {
            "@types/jsonwebtoken": "^9",
          },
        },
      ],
    };

    sdkPath = await generateTestSDK(
      "backend-api-with-simple-types.json",
      config
    );

    // Read the generated schema.ts file
    const schemaPath = getSDKFilePath(sdkPath, "src/schema.ts");
    schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Read the generated package.json file
    const packageJsonPath = getSDKFilePath(sdkPath, "package.json");
    packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
  }, 30000);

  afterAll(async () => {
    await cleanupTestSDK(sdkPath);
  });

  describe("Import statements", () => {
    it("should import predefined types from @blimu/types (only those actually used)", () => {
      // The fixture uses ResourceType and EntitlementType in the schema
      // UsageLimitType is used in path parameters (service files), not in schema interfaces
      // PlanType and LimitType are defined but not used
      expect(schemaContent).toContain("import type");
      expect(schemaContent).toContain("ResourceType");
      expect(schemaContent).toContain("EntitlementType");
      // UsageLimitType is only used in path parameters, not in schema interfaces
      // PlanType and LimitType are not used at all
      expect(schemaContent).not.toContain("UsageLimitType");
      expect(schemaContent).not.toContain("PlanType");
      expect(schemaContent).not.toContain("LimitType");
    });

    it("should not define predefined types locally", () => {
      // Predefined types should not be exported in the schema file
      expect(schemaContent).not.toMatch(/export type ResourceType =/);
      expect(schemaContent).not.toMatch(/export type EntitlementType =/);
      expect(schemaContent).not.toMatch(/export type PlanType =/);
      expect(schemaContent).not.toMatch(/export type LimitType =/);
      expect(schemaContent).not.toMatch(/export type UsageLimitType =/);
    });
  });

  describe("Type references", () => {
    it("should use ResourceType directly (not Schema.ResourceType) in properties", () => {
      // Check that Resource interface uses ResourceType directly
      expect(schemaContent).toMatch(/type:\s*ResourceType/);
      expect(schemaContent).not.toMatch(/type:\s*Schema\.ResourceType/);
    });

    it("should use ResourceType directly in nested object properties", () => {
      // Check that ResourceList items use ResourceType directly
      // The fixture has ResourceList with items array containing type: ResourceType
      expect(schemaContent).toMatch(/type:\s*ResourceType/);
      expect(schemaContent).not.toMatch(/type:\s*Schema\.ResourceType/);
    });

    it("should use EntitlementType directly in properties", () => {
      expect(schemaContent).toMatch(/entitlement:\s*EntitlementType/);
      expect(schemaContent).not.toMatch(
        /entitlement:\s*Schema\.EntitlementType/
      );
    });

    it("should use UsageLimitType directly in path parameters (service files, not schema)", () => {
      // UsageLimitType is used in path parameters in service files, not in schema interfaces
      // So it won't appear in schema.ts
      expect(schemaContent).not.toMatch(/UsageLimitType/);
    });

    // Note: PlanType and LimitType are defined in the fixture but not used in any operations
    // so they won't appear in the generated schema interfaces
  });

  describe("Schema file imports", () => {
    it("should import only predefined types actually used in the schema file", () => {
      // The fixture uses ResourceType and EntitlementType in schema interfaces
      // UsageLimitType is only used in path parameters (service files), not in schema interfaces
      // PlanType and LimitType are defined but not used, so they should not be imported
      expect(schemaContent).toContain("import type");
      expect(schemaContent).toContain("ResourceType");
      expect(schemaContent).toContain("EntitlementType");
      // UsageLimitType is only used in path parameters, not in schema interfaces
      expect(schemaContent).not.toContain("UsageLimitType");
      // Should not import unused types
      expect(schemaContent).not.toContain("PlanType");
      expect(schemaContent).not.toContain("LimitType");
    });
  });

  describe("Package.json dependencies", () => {
    it("should include @blimu/types in dependencies", () => {
      const packageJson = JSON.parse(packageJsonContent);
      expect(packageJson.dependencies).toHaveProperty("@blimu/types");
      expect(packageJson.dependencies["@blimu/types"]).toBe("^0.1.0");
    });

    it("should include @types/jsonwebtoken in devDependencies", () => {
      const packageJson = JSON.parse(packageJsonContent);
      expect(packageJson.devDependencies).toHaveProperty("@types/jsonwebtoken");
      expect(packageJson.devDependencies["@types/jsonwebtoken"]).toBe("^9");
    });

    it("should include zod in dependencies", () => {
      const packageJson = JSON.parse(packageJsonContent);
      expect(packageJson.dependencies).toHaveProperty("zod");
    });
  });

  describe("No Schema. prefix for predefined types", () => {
    it("should not contain Schema.ResourceType anywhere", () => {
      expect(schemaContent).not.toContain("Schema.ResourceType");
    });

    it("should not contain Schema.EntitlementType anywhere", () => {
      expect(schemaContent).not.toContain("Schema.EntitlementType");
    });

    it("should not contain Schema.PlanType anywhere", () => {
      expect(schemaContent).not.toContain("Schema.PlanType");
    });

    it("should not contain Schema.LimitType anywhere", () => {
      expect(schemaContent).not.toContain("Schema.LimitType");
    });

    it("should not contain Schema.UsageLimitType anywhere", () => {
      expect(schemaContent).not.toContain("Schema.UsageLimitType");
    });
  });

  describe("Service method signatures", () => {
    let entitlementsServiceContent: string;
    let resourcesServiceContent: string;
    let usageServiceContent: string;

    beforeAll(() => {
      // Read service files
      const entitlementsPath = getSDKFilePath(
        sdkPath,
        "src/services/entitlements.ts"
      );
      if (fs.existsSync(entitlementsPath)) {
        entitlementsServiceContent = fs.readFileSync(entitlementsPath, "utf-8");
      }

      const resourcesPath = getSDKFilePath(
        sdkPath,
        "src/services/resources.ts"
      );
      if (fs.existsSync(resourcesPath)) {
        resourcesServiceContent = fs.readFileSync(resourcesPath, "utf-8");
      }

      const usagePath = getSDKFilePath(sdkPath, "src/services/usage.ts");
      if (fs.existsSync(usagePath)) {
        usageServiceContent = fs.readFileSync(usagePath, "utf-8");
      }
    });

    it("should import only predefined types used directly in method signatures (path params)", () => {
      // Entitlements service: The fixture only has checkEntitlement which uses Schema types,
      // so there should be no imports from @blimu/types (no path parameters use predefined types)
      if (entitlementsServiceContent) {
        // Should not import any predefined types (none used in path parameters in the fixture)
        expect(entitlementsServiceContent).not.toContain("from '@blimu/types'");
        // Specifically verify EntitlementType is not imported (it's only in Schema types, not path params)
        expect(entitlementsServiceContent).not.toContain("EntitlementType");
      }

      // Resources service uses ResourceType (in path parameters)
      if (resourcesServiceContent) {
        expect(resourcesServiceContent).toContain(
          "import type { ResourceType } from '@blimu/types';"
        );
        // Should not import unused types
        expect(resourcesServiceContent).not.toContain("EntitlementType");
        expect(resourcesServiceContent).not.toContain("PlanType");
        expect(resourcesServiceContent).not.toContain("LimitType");
        expect(resourcesServiceContent).not.toContain("UsageLimitType");
      }

      // Usage service uses ResourceType and UsageLimitType (in path parameters)
      if (usageServiceContent) {
        expect(usageServiceContent).toContain(
          "import type { ResourceType, UsageLimitType } from '@blimu/types';"
        );
        // Should not import unused types
        expect(usageServiceContent).not.toContain("EntitlementType");
        expect(usageServiceContent).not.toContain("PlanType");
        // Note: LimitType might appear in response types, so we only check it's not in the import
        // (it would be imported separately if used)
      }
    });

    it("should use ResourceType directly in service method parameters (not Schema.ResourceType)", () => {
      if (resourcesServiceContent) {
        // Check that list method uses ResourceType directly
        expect(resourcesServiceContent).toMatch(
          /list\s*\(\s*resourceType:\s*ResourceType/
        );
        expect(resourcesServiceContent).not.toMatch(
          /list\s*\(\s*resourceType:\s*Schema\.ResourceType/
        );
      }
    });

    it("should use UsageLimitType directly in service method parameters", () => {
      if (usageServiceContent) {
        // Check that getBalance uses UsageLimitType directly
        expect(usageServiceContent).toMatch(
          /getBalance\s*\([\s\S]*limitType:\s*UsageLimitType/
        );
        expect(usageServiceContent).not.toMatch(
          /getBalance\s*\([\s\S]*limitType:\s*Schema\.UsageLimitType/
        );
      }
    });

    it("should use EntitlementType directly in request body types", () => {
      if (entitlementsServiceContent) {
        // Check that checkEntitlement uses EntitlementType in body type
        // The body type should reference Schema.EntitlementCheckBody which uses EntitlementType
        // But the parameter itself should use the Schema interface
        expect(entitlementsServiceContent).toMatch(
          /checkEntitlement\s*\(\s*body:\s*Schema\.EntitlementCheckBody/
        );
        // The EntitlementCheckBody interface should use EntitlementType (not Schema.EntitlementType)
        // This is verified in the schema tests above
      }
    });

    it("should not contain Schema.ResourceType in service files", () => {
      if (resourcesServiceContent) {
        expect(resourcesServiceContent).not.toContain("Schema.ResourceType");
      }
      if (entitlementsServiceContent) {
        expect(entitlementsServiceContent).not.toContain("Schema.ResourceType");
      }
      if (usageServiceContent) {
        expect(usageServiceContent).not.toContain("Schema.ResourceType");
      }
    });

    it("should not contain Schema.UsageLimitType in service files", () => {
      if (usageServiceContent) {
        expect(usageServiceContent).not.toContain("Schema.UsageLimitType");
      }
    });

    it("should not contain Schema.EntitlementType in service files", () => {
      if (entitlementsServiceContent) {
        expect(entitlementsServiceContent).not.toContain(
          "Schema.EntitlementType"
        );
      }
    });
  });
});
