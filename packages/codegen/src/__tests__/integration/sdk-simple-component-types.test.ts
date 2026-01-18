import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import {
  generateTestSDK,
  cleanupTestSDK,
  getSDKFilePath,
  typecheckGeneratedSDK,
} from './helpers/sdk-generator';

describe('Generated SDK - Simple Component Types', () => {
  let sdkPath: string;
  let schemaContent: string;

  beforeAll(async () => {
    // Generate SDK from test spec with simple component types
    sdkPath = await generateTestSDK('backend-api-with-simple-types.json');

    // Typecheck the generated SDK
    typecheckGeneratedSDK(sdkPath);

    // Read the generated schema.ts file
    const schemaPath = getSDKFilePath(sdkPath, 'src/schema.ts');
    schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  }, 30000);

  afterAll(async () => {
    await cleanupTestSDK(sdkPath);
  });

  describe('Simple component types', () => {
    it('should define simple component types as direct exports', () => {
      // Check that simple types are exported directly (not in a namespace)
      expect(schemaContent).toMatch(/export type ResourceType = string;/);
      expect(schemaContent).toMatch(/export type EntitlementType = string;/);
      expect(schemaContent).toMatch(/export type UsageLimitType = string;/);
      // LimitType, ResourceLimitType, and PlanType are not referenced in the fixture,
      // so they will be filtered out by filterUnusedModelDefs
    });

    it('should not define SchemaTypes namespace (removed)', () => {
      // Check that SchemaTypes namespace does NOT exist (it was removed)
      expect(schemaContent).not.toContain('export namespace SchemaTypes');

      // Check that simple types are defined directly
      const resourceTypeMatches = schemaContent.match(
        /export type ResourceType =/g
      );
      expect(resourceTypeMatches).toHaveLength(1);
      expect(schemaContent).toContain('export type ResourceType = string;');
    });
  });

  describe('Type references in properties', () => {
    it('should use ResourceType directly in properties that reference ResourceType (same file)', () => {
      // Check that ResourceList interface uses ResourceType directly (not Schema.ResourceType)
      // since both are defined in the same schema.ts file
      expect(schemaContent).toMatch(
        /export interface ResourceList\s*\{[\s\S]*type:\s*ResourceType/
      );
      // Should not use Schema. prefix for types defined in the same file
      expect(schemaContent).not.toMatch(
        /export interface ResourceList\s*\{[\s\S]*type:\s*Schema\.ResourceType/
      );
    });

    it('should use EntitlementType directly in properties that reference EntitlementType (same file)', () => {
      // Check that EntitlementCheckBody interface uses EntitlementType directly (not Schema.EntitlementType)
      // since both are defined in the same schema.ts file
      expect(schemaContent).toMatch(
        /export interface EntitlementCheckBody\s*\{[\s\S]*entitlement:\s*EntitlementType/
      );
      // Should not use Schema. prefix for types defined in the same file
      expect(schemaContent).not.toMatch(
        /export interface EntitlementCheckBody\s*\{[\s\S]*entitlement:\s*Schema\.EntitlementType/
      );
    });

    it("should NOT use plain 'string' for properties that reference simple component types", () => {
      // ResourceList.items[].type should NOT be just "string"
      // It should be ResourceType (direct reference since it's in the same file)
      // Check that ResourceList interface contains ResourceType
      expect(schemaContent).toMatch(
        /export interface ResourceList[\s\S]*?type:\s*ResourceType/
      );
      // Also check that it's not using plain "string" for the type property in items
      expect(schemaContent).not.toMatch(
        /items:\s*Array<[^>]*type:\s*string[^>]*>/
      );
    });
  });

  describe('Service method parameters', () => {
    it('should use Schema.ResourceType in method parameters', () => {
      // Read the services file to check parameter types
      const servicesPath = getSDKFilePath(sdkPath, 'src/services/resources.ts');
      if (fs.existsSync(servicesPath)) {
        const servicesContent = fs.readFileSync(servicesPath, 'utf-8');
        // Check that the list method parameter uses Schema.ResourceType
        expect(servicesContent).toMatch(
          /list\s*\(\s*resourceType:\s*Schema\.ResourceType/
        );
      }
    });

    it('should use Schema.UsageLimitType in method parameters (service files import Schema)', () => {
      // Read the usage services file
      const servicesPath = getSDKFilePath(sdkPath, 'src/services/usage.ts');
      if (fs.existsSync(servicesPath)) {
        const servicesContent = fs.readFileSync(servicesPath, 'utf-8');
        // Service files import Schema as: import * as Schema from '../schema'
        // So they should use Schema.UsageLimitType when referencing types from schema.ts
        expect(servicesContent).toMatch(
          /getBalance\s*\([\s\S]*limitType:\s*Schema\.UsageLimitType/
        );
      }
    });
  });

  describe('Request body types', () => {
    it('should use EntitlementType in request body types', () => {
      // Check that EntitlementCheckBody uses EntitlementType (direct reference since it's in the same file)
      expect(schemaContent).toMatch(
        /export interface EntitlementCheckBody\s*\{[\s\S]*entitlement:\s*EntitlementType/
      );
    });
  });

  describe('Component schema definitions', () => {
    it('should not create duplicate type definitions for simple component types', () => {
      // Simple types should only be defined once as direct exports
      // Count occurrences of "export type ResourceType" - should be exactly 1
      const resourceTypeMatches = schemaContent.match(
        /export type ResourceType =/g
      );
      expect(resourceTypeMatches).toHaveLength(1);
    });

    it('should preserve component schema names for simple types', () => {
      // The component schema name should be preserved, not converted to operation-based names
      expect(schemaContent).toContain('export type ResourceType =');
      expect(schemaContent).toContain('export type EntitlementType =');
      expect(schemaContent).toContain('export type UsageLimitType =');
    });
  });
});
