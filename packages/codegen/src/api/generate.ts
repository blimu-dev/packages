import { Config, Client } from '../config/config.schema';
import { loadMjsConfig } from '../config/mjs-config-loader';
import { ConfigService } from '../config/config.service';
import { OpenApiService } from '../openapi/openapi.service';
import { IrBuilderService } from '../generator/ir-builder.service';
import { GeneratorService } from '../generator/generator.service';
import { SchemaConverterService } from '../generator/schema-converter.service';
import { TypeScriptGeneratorService } from '../generator/typescript/typescript-generator.service';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Options for programmatic SDK generation
 */
export interface GenerateOptions {
  /**
   * Generate only the named client from config
   */
  client?: string;

  /**
   * Base directory for resolving relative outDir paths.
   * If not provided, outDir is resolved relative to process.cwd()
   */
  baseDir?: string;
}

/**
 * Standalone function to generate SDKs from a config object or config file path.
 * This function can be used programmatically without NestJS dependency injection.
 *
 * @param configOrPath - Config object or path to chunkflow-codegen.config.mjs file
 * @param options - Optional generation options
 * @returns Promise that resolves when generation is complete
 *
 * @example
 * ```typescript
 * import { generate } from '@blimu/codegen';
 *
 * // Using config object
 * await generate({
 *   spec: 'http://localhost:3020/docs/backend-api/json',
 *   clients: [{
 *     type: 'typescript',
 *     outDir: './my-sdk',
 *     packageName: 'my-sdk',
 *     name: 'MyClient'
 *   }]
 * });
 *
 * // Using config file path
 * await generate('./chunkflow-codegen.config.mjs');
 * ```
 */
export async function generate(
  configOrPath: Config | string,
  options?: GenerateOptions
): Promise<void> {
  // Load config if string path
  let config: Config;
  let baseDir: string | undefined;

  if (typeof configOrPath === 'string') {
    const configPath = path.isAbsolute(configOrPath)
      ? configOrPath
      : path.resolve(configOrPath);
    config = await loadMjsConfig(configPath);
    // Use config file's directory as baseDir if not provided
    baseDir = options?.baseDir ?? path.dirname(configPath);
  } else {
    config = configOrPath;
    baseDir = options?.baseDir;
  }

  // Initialize services (standalone, no NestJS DI)
  const configService = new ConfigService();
  const openApiService = new OpenApiService();
  const schemaConverter = new SchemaConverterService();
  const irBuilder = new IrBuilderService(schemaConverter);
  const generatorService = new GeneratorService(irBuilder, openApiService);

  // Register TypeScript generator
  const typeScriptGenerator = new TypeScriptGeneratorService(configService);
  generatorService.register(typeScriptGenerator);

  // Generate for each client
  for (const client of config.clients) {
    if (options?.client && client.name !== options.client) {
      continue;
    }

    // Resolve outDir relative to baseDir if provided
    const resolvedOutDir = baseDir
      ? path.resolve(baseDir, client.outDir)
      : path.resolve(client.outDir);

    // Ensure output directory exists before pre-commands
    await fs.promises.mkdir(resolvedOutDir, { recursive: true });

    // Create a client copy with resolved outDir
    const clientWithResolvedPath = {
      ...client,
      outDir: resolvedOutDir,
    };

    // Execute pre-generation commands if specified
    await executePreCommands(configService, clientWithResolvedPath);

    // Generate the SDK
    await generatorService.generate(config.spec, clientWithResolvedPath);

    // Execute post-generation commands if specified
    await executePostCommands(configService, clientWithResolvedPath);
  }
}

/**
 * Execute pre-generation commands for a client
 */
async function executePreCommands(
  configService: ConfigService,
  client: Client
): Promise<void> {
  const command = configService.getPreCommand(client);
  if (command.length === 0) {
    return;
  }
  await executeCommand(command, client.outDir, 'pre-command');
}

/**
 * Execute post-generation commands for a client
 */
async function executePostCommands(
  configService: ConfigService,
  client: Client
): Promise<void> {
  const command = configService.getPostCommand(client);
  if (command.length === 0) {
    return;
  }
  await executeCommand(command, client.outDir, 'post-command');
}

/**
 * Execute a command in the specified directory
 */
async function executeCommand(
  command: string[],
  cwd: string,
  label: string
): Promise<void> {
  try {
    const [cmd, ...args] = command;
    const { stdout, stderr } = await execAsync(
      `${cmd} ${args.map((a) => `"${a}"`).join(' ')}`,
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );
    if (stdout) {
      // Log stdout for debugging
      console.debug(`[${label}] ${stdout}`);
    }
    if (stderr && !stderr.includes('warning')) {
      console.warn(`[${label}] ${stderr}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} failed: ${errorMessage}`);
  }
}

/**
 * Load a config file programmatically
 *
 * @param configPath - Path to chunkflow-codegen.config.mjs file
 * @returns Promise that resolves to the loaded config
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@blimu/codegen';
 *
 * const config = await loadConfig('./chunkflow-codegen.config.mjs');
 * ```
 */
export async function loadConfig(configPath: string): Promise<Config> {
  return loadMjsConfig(configPath);
}
