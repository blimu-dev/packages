import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { Config, ConfigSchema, Client } from "./config.schema";
import { loadMjsConfig } from "./mjs-config-loader";

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private readonly DEFAULT_CONFIG_FILE = "chunkflow-codegen.config.mjs";

  /**
   * Find default config file in current directory and parent directories
   */
  async findDefaultConfig(): Promise<string | null> {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const configPath = path.join(currentDir, this.DEFAULT_CONFIG_FILE);
      try {
        await fs.promises.access(configPath);
        return configPath;
      } catch {
        // File doesn't exist, continue searching
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Load configuration from an MJS file
   */
  async load(configPath: string): Promise<Config> {
    try {
      // Load MJS config
      const config = await loadMjsConfig(configPath);

      // Normalize paths
      return this.normalizePaths(config, configPath);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to load config from ${configPath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Normalize paths in the config to be absolute
   */
  private normalizePaths(config: Config, configPath: string): Config {
    const configDir = path.dirname(path.resolve(configPath));

    // Normalize spec path
    let spec = config.spec;
    if (!this.isUrl(spec)) {
      if (!path.isAbsolute(spec)) {
        spec = path.resolve(configDir, spec);
      }
    }

    // Normalize client outDir paths
    const clients = config.clients.map((client) => {
      let outDir = client.outDir;
      if (!path.isAbsolute(outDir)) {
        outDir = path.resolve(configDir, outDir);
      }
      return { ...client, outDir };
    });

    return {
      ...config,
      spec,
      clients,
    };
  }

  /**
   * Check if a string is a URL
   */
  private isUrl(str: string): boolean {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Get pre-command for a client
   */
  getPreCommand(client: Client): string[] {
    return client.preCommand || [];
  }

  /**
   * Get post-command for a client
   */
  getPostCommand(client: Client): string[] {
    return client.postCommand || [];
  }

  /**
   * Check if a file should be excluded based on the ExcludeFiles list.
   * targetPath should be an absolute path, and the comparison is done relative to OutDir.
   */
  shouldExcludeFile(client: Client, targetPath: string): boolean {
    if (!client.exclude || client.exclude.length === 0) {
      return false;
    }

    // Get relative path from OutDir to targetPath
    let relPath: string;
    try {
      relPath = path.relative(client.outDir, targetPath);
    } catch {
      // If we can't get a relative path, the file is not under OutDir, so don't exclude
      return false;
    }

    // Normalize the path (use forward slashes for consistency, handle . and ..)
    relPath = path.posix.normalize(relPath);
    if (relPath === ".") {
      relPath = "";
    }

    // Check if the relative path matches any exclude pattern
    for (const excludePattern of client.exclude) {
      // Normalize exclude pattern
      const normalizedExclude = path.posix.normalize(excludePattern);

      // Exact match
      if (relPath === normalizedExclude) {
        return true;
      }

      // Check if the file is in a directory that matches the exclude pattern
      // For example, if exclude is "src/", then "src/client.ts" should match
      if (
        normalizedExclude !== "" &&
        relPath.startsWith(normalizedExclude + "/")
      ) {
        return true;
      }
    }

    return false;
  }
}
