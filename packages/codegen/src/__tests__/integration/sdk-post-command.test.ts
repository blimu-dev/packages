import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generate } from '../../api/generate';
import type { Config } from '../../config/config.schema';
import { generateTestSDK, cleanupTestSDK } from './helpers/sdk-generator';

describe('Post-Command Execution', () => {
  describe('Programmatic API', () => {
    let sdkPath: string;
    let postCommandFile: string;

    beforeAll(async () => {
      // Create a temp directory for the SDK
      const testsDir = path.join(process.cwd(), '.tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }
      const tempDir = fs.mkdtempSync(path.join(testsDir, 'test-sdk-'));
      sdkPath = path.join(tempDir, 'generated-sdk');
      postCommandFile = path.join(sdkPath, '.post-command-executed');

      const fixturesDir = path.join(__dirname, 'fixtures');
      const specPath = path.resolve(fixturesDir, 'test-api-3.0.json');

      const config: Config = {
        spec: specPath,
        clients: [
          {
            type: 'typescript',
            outDir: sdkPath,
            packageName: 'test-sdk',
            name: 'TestClient',
            // Use a command that creates a marker file to verify execution
            // Use node to write a file (cross-platform)
            postCommand: [
              'node',
              '-e',
              "require('fs').writeFileSync('.post-command-executed', 'executed')",
            ],
          },
        ],
      };

      await generate(config);
    }, 30000);

    afterAll(async () => {
      await cleanupTestSDK(sdkPath);
    });

    it('should execute post-command after SDK generation', () => {
      // Verify the marker file was created by the post-command
      expect(fs.existsSync(postCommandFile)).toBe(true);
    });

    it('should execute post-command in the correct directory', () => {
      // The post-command should have created the file in the SDK directory
      expect(fs.existsSync(postCommandFile)).toBe(true);
      const content = fs.readFileSync(postCommandFile, 'utf-8');
      expect(content.trim()).toContain('executed');
    });
  });

  describe('Post-Command with Multiple Commands', () => {
    let sdkPath: string;
    let markerFile1: string;
    let markerFile2: string;

    beforeAll(async () => {
      const testsDir = path.join(process.cwd(), '.tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }
      const tempDir = fs.mkdtempSync(path.join(testsDir, 'test-sdk-'));
      sdkPath = path.join(tempDir, 'generated-sdk');
      markerFile1 = path.join(sdkPath, '.marker1');
      markerFile2 = path.join(sdkPath, '.marker2');

      const fixturesDir = path.join(__dirname, 'fixtures');
      const specPath = path.resolve(fixturesDir, 'test-api-3.0.json');

      const config: Config = {
        spec: specPath,
        clients: [
          {
            type: 'typescript',
            outDir: sdkPath,
            packageName: 'test-sdk',
            name: 'TestClient',
            // Use node to create multiple marker files (cross-platform)
            postCommand: [
              'node',
              '-e',
              "const fs = require('fs'); fs.writeFileSync('.marker1', 'marker1'); fs.writeFileSync('.marker2', 'marker2');",
            ],
          },
        ],
      };

      await generate(config);
    }, 30000);

    afterAll(async () => {
      await cleanupTestSDK(sdkPath);
    });

    it('should execute post-command with multiple operations', () => {
      // Both marker files should be created
      expect(fs.existsSync(markerFile1)).toBe(true);
      expect(fs.existsSync(markerFile2)).toBe(true);
    });
  });

  describe('Post-Command Error Handling', () => {
    it('should throw error when post-command fails', async () => {
      const testsDir = path.join(process.cwd(), '.tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }
      const tempDir = fs.mkdtempSync(path.join(testsDir, 'test-sdk-'));
      const sdkPath = path.join(tempDir, 'generated-sdk');

      const fixturesDir = path.join(__dirname, 'fixtures');
      const specPath = path.resolve(fixturesDir, 'test-api-3.0.json');

      const config: Config = {
        spec: specPath,
        clients: [
          {
            type: 'typescript',
            outDir: sdkPath,
            packageName: 'test-sdk',
            name: 'TestClient',
            // Use a command that will fail
            postCommand: ['nonexistent-command-that-fails'],
          },
        ],
      };

      await expect(generate(config)).rejects.toThrow(/post-command failed/);

      // Cleanup
      await cleanupTestSDK(sdkPath);
    }, 30000);
  });

  describe('Post-Command with No Command', () => {
    let sdkPath: string;

    beforeAll(async () => {
      sdkPath = await generateTestSDK('test-api-3.0.json', {
        clients: [
          {
            type: 'typescript',
            outDir: '',
            packageName: 'test-sdk',
            name: 'TestClient',
            // No postCommand specified
          },
        ],
      });
    }, 30000);

    afterAll(async () => {
      await cleanupTestSDK(sdkPath);
    });

    it('should generate SDK successfully when no post-command is specified', () => {
      // SDK should be generated normally
      const indexPath = path.join(sdkPath, 'src', 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });
});
