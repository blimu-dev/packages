import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { extractTypesFromConfig } from "../type-extractor";

describe("type-extractor", () => {
  const testDir = path.join(process.cwd(), ".tests", "type-extractor");

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testDir, file));
      }
    }
  });

  describe("extractTypesFromConfig", () => {
    describe("MJS config files", () => {
      it("should extract types from MJS config with default export", async () => {
        const configPath = path.join(testDir, "config.mjs");
        const configContent = `
export default {
  resources: {
    workspace: {},
    environment: {},
    project: {}
  },
  entitlements: {
    "workspace:read": {},
    "workspace:create": {},
    "environment:manage": {}
  },
  plans: {
    free: { name: "Free Plan" },
    pro: { name: "Pro Plan" }
  }
};
`;
        fs.writeFileSync(configPath, configContent, "utf-8");

        const extracted = await extractTypesFromConfig(configPath);

        expect(extracted.resourceTypes).toEqual([
          "workspace",
          "environment",
          "project",
        ]);
        expect(extracted.entitlementTypes).toEqual([
          "workspace:read",
          "workspace:create",
          "environment:manage",
        ]);
        expect(extracted.planTypes).toEqual(["free", "pro"]);
      });

      it("should extract types from MJS config with factory function", async () => {
        const configPath = path.join(testDir, "config-factory.mjs");
        const configContent = `
export default function defineConfig() {
  return {
    resources: {
      organization: {},
      workspace: {}
    },
    entitlements: {
      "organization:read": {}
    },
    plans: {
      basic: { name: "Basic Plan" }
    }
  };
}
`;
        fs.writeFileSync(configPath, configContent, "utf-8");

        const extracted = await extractTypesFromConfig(configPath);

        expect(extracted.resourceTypes).toEqual(["organization", "workspace"]);
        expect(extracted.entitlementTypes).toEqual(["organization:read"]);
        expect(extracted.planTypes).toEqual(["basic"]);
      });

      it("should extract limit types from plans", async () => {
        const configPath = path.join(testDir, "config-limits.mjs");
        const configContent = `
export default {
  plans: {
    free: {
      name: "Free Plan",
      resource_limits: {
        workspace_count: 1,
        project_count: 5
      },
      usage_based_limits: {
        api_calls: { value: 1000, period: "monthly" },
        storage: { value: 100, period: "monthly" }
      }
    },
    pro: {
      name: "Pro Plan",
      resource_limits: {
        workspace_count: 10
      },
      usage_based_limits: {
        api_calls: { value: 10000, period: "monthly" }
      }
    }
  }
};
`;
        fs.writeFileSync(configPath, configContent, "utf-8");

        const extracted = await extractTypesFromConfig(configPath);

        expect(extracted.planTypes).toEqual(["free", "pro"]);
        expect(extracted.limitTypes).toContain("workspace_count");
        expect(extracted.limitTypes).toContain("project_count");
        // limitTypes only includes resource_limits, not usage_based_limits
        expect(extracted.limitTypes).not.toContain("api_calls");
        expect(extracted.limitTypes).not.toContain("storage");
        expect(extracted.usageLimitTypes).toContain("api_calls");
        expect(extracted.usageLimitTypes).toContain("storage");
        // Resource limits should not be in usageLimitTypes
        expect(extracted.usageLimitTypes).not.toContain("workspace_count");
      });

      it("should handle empty config sections", async () => {
        const configPath = path.join(testDir, "config-empty.mjs");
        const configContent = `
export default {
  resources: {}
};
`;
        fs.writeFileSync(configPath, configContent, "utf-8");

        const extracted = await extractTypesFromConfig(configPath);

        expect(extracted.resourceTypes).toEqual([]);
        expect(extracted.entitlementTypes).toBeUndefined();
        expect(extracted.planTypes).toBeUndefined();
      });

      it("should handle plans with no limits", async () => {
        const configPath = path.join(testDir, "config-no-limits.mjs");
        const configContent = `
export default {
  plans: {
    unlimited: {
      name: "Unlimited Plan"
    }
  }
};
`;
        fs.writeFileSync(configPath, configContent, "utf-8");

        const extracted = await extractTypesFromConfig(configPath);

        expect(extracted.planTypes).toEqual(["unlimited"]);
        expect(extracted.limitTypes).toBeUndefined();
        expect(extracted.usageLimitTypes).toBeUndefined();
      });
    });

    describe("TypeScript config files", () => {
      it("should throw error for TS files", async () => {
        const configPath = path.join(testDir, "config.ts");
        fs.writeFileSync(configPath, "export default {}", "utf-8");

        await expect(extractTypesFromConfig(configPath)).rejects.toThrow(
          "TypeScript config files require tsx or ts-node"
        );
      });
    });

    describe("Error handling", () => {
      it("should throw error for invalid file path", async () => {
        const invalidPath = path.join(testDir, "nonexistent.mjs");

        await expect(extractTypesFromConfig(invalidPath)).rejects.toThrow();
      });

      it("should throw error for unsupported file format", async () => {
        const configPath = path.join(testDir, "config.json");
        fs.writeFileSync(configPath, "{}", "utf-8");

        await expect(extractTypesFromConfig(configPath)).rejects.toThrow(
          "Unsupported config file format"
        );
      });

      it("should handle malformed MJS config", async () => {
        const configPath = path.join(testDir, "config-malformed.mjs");
        fs.writeFileSync(configPath, "invalid javascript syntax {", "utf-8");

        await expect(extractTypesFromConfig(configPath)).rejects.toThrow();
      });
    });

    describe("Type extraction logic", () => {
      it("should extract all types correctly from complete config", async () => {
        const configPath = path.join(testDir, "config-complete.mjs");
        const configContent = `
export default {
  resources: {
    organization: { roles: ["admin", "member"] },
    workspace: { roles: ["admin", "editor"] },
    project: { roles: ["viewer"] }
  },
  entitlements: {
    "organization:read": { roles: ["admin"] },
    "organization:write": { roles: ["admin"] },
    "workspace:create": { roles: ["admin"] }
  },
  plans: {
    free: {
      name: "Free Plan",
      resource_limits: {
        workspace_count: 1
      }
    },
    pro: {
      name: "Pro Plan",
      resource_limits: {
        workspace_count: 10,
        project_count: 100
      },
      usage_based_limits: {
        api_calls: { value: 10000, period: "monthly" }
      }
    }
  }
};
`;
        fs.writeFileSync(configPath, configContent, "utf-8");

        const extracted = await extractTypesFromConfig(configPath);

        expect(extracted).toEqual({
          resourceTypes: ["organization", "workspace", "project"],
          entitlementTypes: [
            "organization:read",
            "organization:write",
            "workspace:create",
          ],
          planTypes: ["free", "pro"],
          limitTypes: ["workspace_count", "project_count"], // Only resource_limits
          usageLimitTypes: ["api_calls"], // Only usage_based_limits
        });
      });
    });
  });
});
