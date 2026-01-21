import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import {
  generateTestSDK,
  importGeneratedSDK,
  cleanupTestSDK,
  typecheckGeneratedSDK,
  getSDKFilePath,
  type GeneratedSDKModule,
  getClientConstructor,
  getService,
  type SDKClient,
  type ServiceMethods,
} from './helpers/sdk-generator';
import { setupMSW, teardownMSW } from './helpers/msw-setup';
import { handlers } from './helpers/msw-handlers';

describe('Generated SDK - Custom srcDir', () => {
  describe('Nested srcDir (src/sdk)', () => {
    let sdkPath: string;
    let SDK: GeneratedSDKModule;

    beforeAll(async () => {
      // Generate SDK with custom srcDir
      sdkPath = await generateTestSDK('test-api-3.0.json', {
        clients: [
          {
            type: 'typescript',
            packageName: 'test-sdk',
            name: 'TestClient',
            outDir: './test-sdk-custom-srcdir',
            srcDir: 'src/sdk',
          },
        ],
      });

      // Typecheck the generated SDK
      typecheckGeneratedSDK(sdkPath);

      // Import SDK with custom srcDir
      SDK = await importGeneratedSDK(sdkPath, 'src/sdk');

      // Setup MSW
      setupMSW(handlers);
    }, 30000);

    afterAll(async () => {
      teardownMSW();
      await cleanupTestSDK(sdkPath);
    });

    it('should generate files in the custom srcDir location', () => {
      // Check that files are in src/sdk instead of src
      const clientPath = getSDKFilePath(sdkPath, 'src/sdk/client.ts');
      const indexPath = getSDKFilePath(sdkPath, 'src/sdk/index.ts');
      const servicesPath = getSDKFilePath(sdkPath, 'src/sdk/services');

      expect(fs.existsSync(clientPath)).toBe(true);
      expect(fs.existsSync(indexPath)).toBe(true);
      expect(fs.existsSync(servicesPath)).toBe(true);
      expect(fs.statSync(servicesPath).isDirectory()).toBe(true);
    });

    it('should not generate files directly in default src location', () => {
      // With srcDir: "src/sdk", the src directory exists but files are in src/sdk
      const defaultSrcClientPath = getSDKFilePath(sdkPath, 'src/client.ts');
      const defaultSrcIndexPath = getSDKFilePath(sdkPath, 'src/index.ts');

      // Files should not be directly in src, they should be in src/sdk
      expect(fs.existsSync(defaultSrcClientPath)).toBe(false);
      expect(fs.existsSync(defaultSrcIndexPath)).toBe(false);
    });

    it('should have correct tsconfig.json with custom srcDir', () => {
      const tsconfigPath = getSDKFilePath(sdkPath, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      expect(tsconfig.compilerOptions.rootDir).toBe('./src/sdk');
      expect(tsconfig.compilerOptions.baseUrl).toBe('./src/sdk');
      expect(tsconfig.include).toEqual(['src/sdk/**/*']);
    });

    it('should have correct tsup.config.ts with custom srcDir', () => {
      const tsupConfigPath = getSDKFilePath(sdkPath, 'tsup.config.ts');
      expect(fs.existsSync(tsupConfigPath)).toBe(true);

      const tsupConfig = fs.readFileSync(tsupConfigPath, 'utf-8');
      // Template uses explicit entry points; verify custom srcDir is applied
      expect(tsupConfig).toContain("'src/sdk/index.ts'");
      expect(tsupConfig).toContain("'src/sdk/client.ts'");
    });

    it('should have correct package.json with custom srcDir', () => {
      const packageJsonPath = getSDKFilePath(sdkPath, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      // package.json.files should only include dist/** for npm publishing, not source files
      expect(packageJson.files).toContain('dist/**');
    });

    it('should instantiate SDK client correctly', () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      expect(client).toBeDefined();
    });

    it('should make API requests correctly', async () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });

      const users = getService<ServiceMethods<'listUsers'>>(client, 'users');
      const result = (await users.listUsers()) as Array<unknown>;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Default srcDir (backward compatibility)', () => {
    let sdkPath: string;
    let SDK: GeneratedSDKModule;

    beforeAll(async () => {
      // Generate SDK without srcDir (should default to "src")
      sdkPath = await generateTestSDK('test-api-3.0.json');

      // Typecheck the generated SDK
      typecheckGeneratedSDK(sdkPath);

      // Import SDK with default srcDir
      SDK = await importGeneratedSDK(sdkPath);

      // Setup MSW
      setupMSW(handlers);
    }, 30000);

    afterAll(async () => {
      teardownMSW();
      await cleanupTestSDK(sdkPath);
    });

    it('should generate files in default src location', () => {
      const clientPath = getSDKFilePath(sdkPath, 'src/client.ts');
      const indexPath = getSDKFilePath(sdkPath, 'src/index.ts');
      const servicesPath = getSDKFilePath(sdkPath, 'src/services');

      expect(fs.existsSync(clientPath)).toBe(true);
      expect(fs.existsSync(indexPath)).toBe(true);
      expect(fs.existsSync(servicesPath)).toBe(true);
    });

    it('should have correct tsconfig.json with default srcDir', () => {
      const tsconfigPath = getSDKFilePath(sdkPath, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      expect(tsconfig.compilerOptions.rootDir).toBe('./src');
      expect(tsconfig.compilerOptions.baseUrl).toBe('./src');
      expect(tsconfig.include).toEqual(['src/**/*']);
    });

    it('should instantiate SDK client correctly', () => {
      const TestClient = getClientConstructor(SDK, 'TestClient');
      const client: SDKClient = new TestClient({
        baseURL: 'https://api.test.com/v1',
      });
      expect(client).toBeDefined();
    });
  });

  describe('Services directory structure with custom srcDir', () => {
    let sdkPath: string;

    beforeAll(async () => {
      sdkPath = await generateTestSDK('test-api-3.0.json', {
        clients: [
          {
            type: 'typescript',
            packageName: 'test-sdk',
            name: 'TestClient',
            outDir: './test-sdk-custom-srcdir-2',
            srcDir: 'src/sdk',
          },
        ],
      });
    }, 30000);

    afterAll(async () => {
      await cleanupTestSDK(sdkPath);
    });

    it('should place services in src/sdk/services', () => {
      const servicesPath = getSDKFilePath(sdkPath, 'src/sdk/services');
      expect(fs.existsSync(servicesPath)).toBe(true);
      expect(fs.statSync(servicesPath).isDirectory()).toBe(true);

      // Check that service files exist
      const usersServicePath = getSDKFilePath(
        sdkPath,
        'src/sdk/services/users.ts'
      );
      expect(fs.existsSync(usersServicePath)).toBe(true);
    });

    it('should have correct relative imports in service files', () => {
      const usersServicePath = getSDKFilePath(
        sdkPath,
        'src/sdk/services/users.ts'
      );
      const serviceContent = fs.readFileSync(usersServicePath, 'utf-8');

      // Services should import from ../schema (relative to services directory)
      expect(serviceContent).toContain("from '../schema'");
      // Utils import is conditional based on includeQueryKeys, so we just check the schema import
    });
  });
});
