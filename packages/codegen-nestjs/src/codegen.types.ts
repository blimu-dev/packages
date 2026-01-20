export interface CodegenConfig {
  /**
   * Display name for logging purposes
   */
  name: string;

  /**
   * Path to the config file (e.g., 'blimu-codegen-backend.config.ts' or absolute path).
   * The directory will be derived from this path to resolve relative outDir paths.
   */
  config: string;

  /**
   * URL to fetch the OpenAPI spec from (e.g., http://localhost:3020/docs/runtime-api/json)
   */
  specUrl: string;
}

export interface CodegenModuleOptions {
  /**
   * Array of SDK configurations to regenerate
   */
  configs: CodegenConfig[];

  /**
   * Whether to enable the codegen (defaults to checking NODE_ENV === 'development')
   */
  enabled?: boolean;

  /**
   * Base directory for cache storage (defaults to process.cwd())
   */
  cacheDir?: string;

  /**
   * Maximum number of retries when fetching the spec (default: 5)
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds (default: 1000)
   */
  retryDelay?: number;

  /**
   * Whether to disable the cache and always regenerate SDKs (default: false)
   * Useful for development when you want to force regeneration
   */
  disableCache?: boolean;
}
