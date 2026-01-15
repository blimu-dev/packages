import * as fs from "fs";
import * as path from "path";
import { generate } from "../../../api/generate";
import { Config } from "../../../config/config.schema";

/**
 * Generate a test SDK from an OpenAPI spec file
 * @param specPath - Path to OpenAPI spec file (relative to fixtures directory)
 * @param customConfig - Optional custom config to override defaults
 * @returns Path to generated SDK directory
 */
export async function generateTestSDK(
  specPath: string,
  customConfig?: Partial<Config>
): Promise<string> {
  const fixturesDir = path.join(__dirname, "../fixtures");
  const fullSpecPath = path.resolve(fixturesDir, specPath);

  // Create .tests directory if it doesn't exist
  const testsDir = path.join(process.cwd(), ".tests");
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  // Create temp directory for generated SDK inside .tests
  const tempDir = fs.mkdtempSync(path.join(testsDir, "test-sdk-"));
  const sdkDir = path.join(tempDir, "generated-sdk");

  const defaultConfig: Config = {
    spec: fullSpecPath,
    clients: [
      {
        type: "typescript",
        outDir: sdkDir,
        packageName: "test-sdk",
        name: "TestClient",
      },
    ],
  };

  // Merge custom config if provided
  const config: Config = customConfig
    ? {
        ...defaultConfig,
        ...customConfig,
        clients: (customConfig.clients || defaultConfig.clients).map(
          (customClient, index) => ({
            ...defaultConfig.clients[0],
            ...customClient,
            outDir: customClient.outDir || defaultConfig.clients[0].outDir,
          })
        ),
      }
    : defaultConfig;

  await generate(config);

  return sdkDir;
}

/**
 * Import a generated SDK from a directory
 * @param sdkDir - Path to generated SDK directory
 * @returns The SDK module
 */
export async function importGeneratedSDK(sdkDir: string): Promise<any> {
  // The generated SDK exports from src/index.ts (not directly from sdkDir)
  const srcDir = path.join(sdkDir, "src");
  const indexPath = path.join(srcDir, "index.ts");

  // Check if src/index.ts exists, otherwise try index.ts in root
  const actualIndexPath = fs.existsSync(indexPath)
    ? indexPath
    : path.join(sdkDir, "index.ts");

  if (!fs.existsSync(actualIndexPath)) {
    // List files to help debug
    const files = fs.existsSync(srcDir)
      ? fs.readdirSync(srcDir).join(", ")
      : fs.readdirSync(sdkDir).join(", ");
    throw new Error(
      `SDK index file not found at ${actualIndexPath}. Available files: ${files}`
    );
  }

  // Use absolute path for import
  const fileUrl = path.resolve(actualIndexPath);

  try {
    // Use file:// protocol for absolute paths
    const absolutePath = `file://${fileUrl}`;
    const module = await import(absolutePath);
    return module;
  } catch (error: any) {
    // Try without file:// protocol
    try {
      const module = await import(fileUrl);
      return module;
    } catch (err: any) {
      throw new Error(
        `Failed to import SDK from ${sdkDir}: ${error?.message || error}. Original error: ${err?.message || err}`
      );
    }
  }
}

/**
 * Clean up generated SDK files
 * @param sdkDir - Path to generated SDK directory
 */
export async function cleanupTestSDK(sdkDir: string): Promise<void> {
  if (fs.existsSync(sdkDir)) {
    // Find the parent temp directory
    const parentDir = path.dirname(sdkDir);
    // Check if it's a test-sdk directory (either in .tests or root)
    if (
      parentDir.includes("test-sdk-") ||
      path.basename(parentDir).startsWith("test-sdk-")
    ) {
      // fs.rmSync(parentDir, { recursive: true, force: true });
    } else {
      // fs.rmSync(sdkDir, { recursive: true, force: true });
    }
  }
}

/**
 * Get the path to a generated SDK file
 * @param sdkDir - Path to generated SDK directory
 * @param filename - Name of the file to get
 * @returns Full path to the file
 */
export function getSDKFilePath(sdkDir: string, filename: string): string {
  return path.join(sdkDir, filename);
}
