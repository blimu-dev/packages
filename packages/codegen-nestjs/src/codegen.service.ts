import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { generate } from '@blimu/codegen';
import type { Config } from '@blimu/codegen';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';
import type { CodegenConfig, CodegenModuleOptions } from './codegen.types';

@Injectable()
export class CodegenService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CodegenService.name);
  private readonly options: Required<CodegenModuleOptions>;
  private readonly cacheDir: string;

  constructor(options: CodegenModuleOptions) {
    this.options = {
      enabled: options.enabled ?? process.env.NODE_ENV === 'development',
      cacheDir: options.cacheDir ?? process.cwd(),
      maxRetries: options.maxRetries ?? 5,
      retryDelay: options.retryDelay ?? 1000,
      configs: options.configs,
      disableCache: options.disableCache ?? false,
    };

    this.cacheDir = join(this.options.cacheDir, '.sdk-regenerator-cache');
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.options.enabled) {
      this.logger.debug(
        'SDK regenerator is disabled (not in development mode)'
      );
      return;
    }

    // Run regeneration asynchronously after bootstrap to not block startup
    // Add a small delay to ensure the server has started listening
    this.regenerateAll().catch((error) => {
      this.logger.warn(`Failed to regenerate SDKs: ${error.message}`);
    });
  }

  private async regenerateAll(): Promise<void> {
    this.logger.log('Starting SDK regeneration check...');
    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    const promises = this.options.configs.map((config) =>
      this.regenerateSdk(config).catch((error) => {
        this.logger.warn(
          `Failed to regenerate SDK "${config.name}": ${error.message}`
        );
      })
    );

    await Promise.allSettled(promises);
    this.logger.log('SDK regeneration check completed');
  }

  private async regenerateSdk(config: CodegenConfig): Promise<void> {
    this.logger.debug(`Checking SDK "${config.name}"...`);

    // Resolve the config file path
    const resolvedConfigPath = isAbsolute(config.config)
      ? config.config
      : resolve(process.cwd(), config.config);

    // Read the config file content
    const configContent = readFileSync(resolvedConfigPath, 'utf-8');
    const configHash = this.calculateHash(configContent);

    // Fetch the OpenAPI spec
    const specContent = await this.fetchSpecWithRetry(config.specUrl);
    const specHash = this.calculateHash(specContent);

    // Combine both hashes for cache key
    const combinedHash = this.calculateHash(`${specHash}:${configHash}`);

    // Skip cache check if disabled
    if (!this.options.disableCache) {
      // Check if we have a cached hash
      const cacheFile = this.getCacheFilePath(config);
      const cachedHash = this.getCachedHash(cacheFile);

      if (cachedHash === combinedHash) {
        this.logger.debug(
          `SDK "${config.name}" is up to date (no changes detected)`
        );
        return;
      }
    } else {
      this.logger.debug(
        `SDK "${config.name}" cache disabled, forcing regeneration...`
      );
    }

    this.logger.log(
      `SDK "${config.name}" spec or config has changed, regenerating...`
    );

    // Regenerate the SDK
    await this.runSdkGen(config.config);

    // Update the cache (unless disabled)
    if (!this.options.disableCache) {
      const cacheFile = this.getCacheFilePath(config);
      this.updateCache(cacheFile, combinedHash);
    }

    this.logger.log(`SDK "${config.name}" regenerated successfully`);
  }

  private async fetchSpecWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          this.logger.debug(
            `Failed to fetch spec from ${url} (attempt ${attempt}/${this.options.maxRetries}), retrying in ${this.options.retryDelay}ms...`
          );
          await this.sleep(this.options.retryDelay);
        }
      }
    }

    throw new Error(
      `Failed to fetch spec from ${url} after ${this.options.maxRetries} attempts: ${lastError?.message}`
    );
  }

  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private getCacheFilePath(config: CodegenConfig): string {
    // Create a safe filename from the config name
    const safeName = config.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return join(this.cacheDir, `${safeName}.hash`);
  }

  private getCachedHash(cacheFile: string): string | null {
    if (!existsSync(cacheFile)) {
      return null;
    }

    try {
      return readFileSync(cacheFile, 'utf-8').trim();
    } catch (error) {
      this.logger.warn(
        `Failed to read cache file ${cacheFile}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  private updateCache(cacheFile: string, hash: string): void {
    try {
      writeFileSync(cacheFile, hash, 'utf-8');
    } catch (error) {
      this.logger.warn(
        `Failed to write cache file ${cacheFile}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async runSdkGen(configPath: string): Promise<void> {
    try {
      // Resolve the config file path (support both absolute and relative paths)
      const resolvedConfigPath = isAbsolute(configPath)
        ? configPath
        : resolve(process.cwd(), configPath);

      // Load the config file
      const configModule = await import(resolvedConfigPath);
      const config: Config = configModule.default || configModule;

      // Derive configDir from the config file path
      const configDir = dirname(resolvedConfigPath);

      // Use the programmatic API with baseDir to resolve relative paths
      await generate(config, { baseDir: configDir });

      this.logger.debug(
        `Successfully generated SDK from config: ${resolvedConfigPath}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `SDK generation failed for ${configPath}: ${errorMessage}`
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
