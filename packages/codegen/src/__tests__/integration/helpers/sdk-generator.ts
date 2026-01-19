import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { generate } from '../../../api/generate';
import type { Config } from '../../../config/config.schema';

/**
 * Track directories created by tests for cleanup
 * Each test file gets its own cleanup tracker
 */
const cleanupTrackers = new Map<string, Set<string>>();

/**
 * Get or create a cleanup tracker for the current test file
 */
function getCleanupTracker(): Set<string> {
  // Use a stack trace to identify the calling test file
  const stack = new Error().stack;
  if (!stack) {
    // Fallback to a default tracker if stack is unavailable
    const defaultKey = 'default';
    if (!cleanupTrackers.has(defaultKey)) {
      cleanupTrackers.set(defaultKey, new Set());
    }
    const tracker = cleanupTrackers.get(defaultKey);
    if (!tracker) {
      throw new Error('Failed to get cleanup tracker');
    }
    return tracker;
  }

  // Extract test file name from stack trace
  const stackLines = stack.split('\n');
  const testFileLine = stackLines.find(
    (line) =>
      line.includes('__tests__/integration') && line.includes('.test.ts')
  );

  let testFile = 'unknown';
  if (testFileLine) {
    const match = testFileLine.match(/([^/]+\.test\.ts)/);
    if (match && match[1]) {
      testFile = match[1];
    }
  }

  if (!cleanupTrackers.has(testFile)) {
    cleanupTrackers.set(testFile, new Set());
  }
  const tracker = cleanupTrackers.get(testFile);
  if (!tracker) {
    throw new Error(`Failed to get cleanup tracker for ${testFile}`);
  }
  return tracker;
}

/**
 * Register a directory for cleanup
 */
export function registerForCleanup(dir: string): void {
  const tracker = getCleanupTracker();
  tracker.add(dir);
}

/**
 * Clean up all directories registered for a test file
 */
export function cleanupRegisteredDirectories(testFile?: string): void {
  const tracker = testFile
    ? cleanupTrackers.get(testFile)
    : getCleanupTracker();

  if (!tracker) {
    return;
  }

  for (const dir of tracker) {
    try {
      if (fs.existsSync(dir)) {
        // Check if it's a parent directory (test-sdk-*) or the SDK dir itself
        const parentDir = path.dirname(dir);
        if (
          parentDir.includes('test-sdk-') ||
          path.basename(parentDir).startsWith('test-sdk-')
        ) {
          // Remove the entire temp directory
          fs.rmSync(parentDir, { recursive: true, force: true });
        } else {
          // Remove just the SDK directory
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      // Ignore cleanup errors - artifacts are in .gitignore anyway
      console.warn(`Failed to cleanup ${dir}:`, error);
    }
  }

  tracker.clear();
}

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
  const fixturesDir = path.join(__dirname, '../fixtures');
  const fullSpecPath = path.resolve(fixturesDir, specPath);

  // Create .tests directory if it doesn't exist
  const testsDir = path.join(process.cwd(), '.tests');
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  // Create temp directory for generated SDK inside .tests
  const tempDir = fs.mkdtempSync(path.join(testsDir, 'test-sdk-'));
  const sdkDir = path.join(tempDir, 'generated-sdk');

  // Register for cleanup
  registerForCleanup(sdkDir);

  const defaultConfig: Config = {
    spec: fullSpecPath,
    clients: [
      {
        type: 'typescript',
        outDir: sdkDir,
        packageName: 'test-sdk',
        name: 'TestClient',
      },
    ],
  };

  // Merge custom config if provided
  let actualSdkDir = sdkDir; // Track where files will actually be generated
  const config: Config = customConfig
    ? {
        ...defaultConfig,
        ...customConfig,
        clients: (customConfig.clients || defaultConfig.clients).map(
          (customClient) => {
            // If customClient provides outDir, resolve it relative to testsDir
            // Otherwise use the absolute sdkDir path
            const resolvedOutDir = customClient.outDir
              ? path.isAbsolute(customClient.outDir)
                ? customClient.outDir
                : path.resolve(testsDir, customClient.outDir)
              : sdkDir;
            // Update actualSdkDir to the resolved path for return value
            actualSdkDir = resolvedOutDir;
            // Register the resolved directory for cleanup if it's different
            if (resolvedOutDir !== sdkDir) {
              registerForCleanup(resolvedOutDir);
            }
            return {
              ...defaultConfig.clients[0],
              ...customClient,
              outDir: resolvedOutDir,
            };
          }
        ),
      }
    : defaultConfig;

  await generate(config);

  return actualSdkDir;
}

/**
 * Type representing a client instance with services
 * Services are accessed as properties (e.g., client.users, client.events)
 * Since the exact service structure is dynamic (depends on OpenAPI spec),
 * we use Record<string, unknown> which is type-safe but allows dynamic access.
 * This is safer than 'any' as it still enforces that we're working with an object.
 */
export type SDKClient = Record<string, unknown>;

/**
 * Type representing a client class constructor
 */
export type ClientConstructor = new (
  options?: Record<string, unknown>
) => SDKClient;

/**
 * Type representing a generated SDK module
 * The SDK exports a client class (e.g., TestClient) and other utilities
 * Since the client name is dynamic (depends on the OpenAPI spec), we use
 * an index signature that allows accessing client constructors by name
 */
export interface GeneratedSDKModule {
  // Client class constructor - the name varies (TestClient, MyClient, etc.)
  // The constructor takes optional config and returns a client instance
  [key: string]: ClientConstructor | unknown;
}

/**
 * Helper to get a client constructor from the SDK module with proper typing
 */
export function getClientConstructor(
  sdk: GeneratedSDKModule,
  clientName: string
): ClientConstructor {
  const ClientClass = sdk[clientName];
  if (!ClientClass || typeof ClientClass !== 'function') {
    throw new Error(`Client class ${clientName} not found in SDK module`);
  }
  return ClientClass as ClientConstructor;
}

/**
 * Helper to safely access a service from a client with proper typing
 */
export function getService<
  T = Record<
    string,
    (...args: unknown[]) => Promise<unknown> | AsyncGenerator<unknown>
  >,
>(client: SDKClient, serviceName: string): T {
  const service = client[serviceName];
  if (!service) {
    throw new Error(`Service ${serviceName} not found in client`);
  }
  return service as T;
}

/**
 * Type helper for service methods - makes it easier to type service calls
 * Usage: const users = getService<ServiceMethods<'listUsers' | 'getUser'>>(client, 'users');
 */
export type ServiceMethods<M extends string> = {
  [K in M]: (...args: unknown[]) => Promise<unknown> | AsyncGenerator<unknown>;
};

/**
 * Import a generated SDK from a directory
 * @param sdkDir - Path to generated SDK directory
 * @param srcDir - Optional custom source directory path (defaults to "src")
 * @returns The SDK module
 */
export async function importGeneratedSDK(
  sdkDir: string,
  srcDir: string = 'src'
): Promise<GeneratedSDKModule> {
  // The generated SDK exports from src/index.ts (or custom srcDir/index.ts)
  const srcDirPath = path.join(sdkDir, srcDir);
  const indexPath = path.join(srcDirPath, 'index.ts');

  // Check if src/index.ts exists, otherwise try index.ts in root
  const actualIndexPath = fs.existsSync(indexPath)
    ? indexPath
    : path.join(sdkDir, 'index.ts');

  if (!fs.existsSync(actualIndexPath)) {
    // List files to help debug
    const files = fs.existsSync(srcDirPath)
      ? fs.readdirSync(srcDirPath).join(', ')
      : fs.readdirSync(sdkDir).join(', ');
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
  } catch (error: unknown) {
    // Try without file:// protocol
    try {
      const module = await import(fileUrl);
      return module;
    } catch (err: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to import SDK from ${sdkDir}: ${errorMessage}. Original error: ${errMessage}`
      );
    }
  }
}

/**
 * Clean up generated SDK files
 * @param sdkDir - Path to generated SDK directory
 * This is the recommended cleanup method - it's simple, direct, and reliable.
 * The directory is also automatically tracked for cleanup in case this is not called.
 */
export async function cleanupTestSDK(sdkDir: string): Promise<void> {
  if (fs.existsSync(sdkDir)) {
    try {
      // Find the parent temp directory
      const parentDir = path.dirname(sdkDir);
      // Check if it's a test-sdk directory (either in .tests or root)
      if (
        parentDir.includes('test-sdk-') ||
        path.basename(parentDir).startsWith('test-sdk-')
      ) {
        fs.rmSync(parentDir, { recursive: true, force: true });
      } else {
        fs.rmSync(sdkDir, { recursive: true, force: true });
      }
      // Remove from tracking since we've cleaned it up
      const tracker = getCleanupTracker();
      tracker.delete(sdkDir);
    } catch (error) {
      // Ignore cleanup errors - artifacts are in .gitignore anyway
      console.warn(`Failed to cleanup ${sdkDir}:`, error);
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

/**
 * Run TypeScript typecheck on a generated SDK
 * @param sdkDir - Path to generated SDK directory
 * @throws Error if typecheck fails
 */
export function typecheckGeneratedSDK(sdkDir: string): void {
  const tsconfigPath = path.join(sdkDir, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    throw new Error(`tsconfig.json not found at ${tsconfigPath}`);
  }

  try {
    // Run tsc --noEmit to check types without emitting files
    execSync('npx tsc --noEmit', {
      cwd: sdkDir,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  } catch (error: unknown) {
    const execError = error as {
      stdout?: Buffer;
      stderr?: Buffer;
      message?: string;
    };
    const stdout = execError.stdout?.toString() || '';
    const stderr = execError.stderr?.toString() || '';
    const errorMessage =
      stdout ||
      stderr ||
      (error instanceof Error ? error.message : String(error));

    // Filter out TS2307 errors (Cannot find module) as these are expected
    // when testing with external dependencies that aren't installed
    const lines = errorMessage.split('\n');
    const actualErrors = lines.filter((line: string) => {
      // Skip module not found errors (TS2307) - these are expected for predefined types tests
      if (line.includes('error TS2307')) {
        return false;
      }
      // Include all other errors
      return line.includes('error TS');
    });

    // Only throw if there are actual type errors (not just missing modules)
    if (actualErrors.length > 0) {
      throw new Error(
        `TypeScript typecheck failed for generated SDK at ${sdkDir}:\n${actualErrors.join('\n')}`
      );
    }
    // If only missing module errors, log a warning but don't fail
    // This allows tests with external dependencies to pass
  }
}
