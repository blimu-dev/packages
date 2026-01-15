import { pathToFileURL } from "url";
import * as path from "path";
import { Config, ConfigSchema } from "./config.schema";

/**
 * Load configuration from an MJS (ES Module) file.
 * Supports both default export and named export patterns.
 *
 * @param configPath - Absolute or relative path to the MJS config file
 * @returns Validated configuration object
 * @throws Error if the config file cannot be loaded or validated
 */
export async function loadMjsConfig(configPath: string): Promise<Config> {
  try {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(configPath);

    // Convert to file:// URL for dynamic import
    const fileUrl = pathToFileURL(absolutePath).href;

    // Dynamic import the MJS file
    const configModule = await import(fileUrl);

    // Support both default export and named export
    const config = configModule.default || configModule;

    if (!config) {
      throw new Error(
        `Config file must export a default export or named export: ${configPath}`
      );
    }

    // Validate with Zod schema
    const validated = ConfigSchema.parse(config);

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to load MJS config from ${configPath}: ${error.message}`
      );
    }
    throw error;
  }
}
