import * as path from 'path';

/**
 * Extracted types from customer config
 */
export interface ExtractedTypes {
  resourceTypes?: string[];
  entitlementTypes?: string[];
  planTypes?: string[];
  limitTypes?: string[];
  usageLimitTypes?: string[];
}

/**
 * Customer config structure (from .blimu config files)
 */
export interface BlimuConfig {
  resources?: Record<string, unknown>;
  entitlements?: Record<string, unknown>;
  plans?: Record<string, PlanConfig>;
  features?: Record<string, unknown>;
}

export interface PlanConfig {
  name?: string;
  summary?: string;
  description?: string;
  resource_limits?: Record<string, number>;
  usage_based_limits?: Record<string, { value: number; period: string }>;
}

/**
 * Extract types from customer config file (TS or MJS)
 *
 * @param configPath - Path to the config file
 * @returns Extracted types
 */
export async function extractTypesFromConfig(
  configPath: string
): Promise<ExtractedTypes> {
  const config = await loadConfigFile(configPath);
  return extractTypes(config);
}

/**
 * Load config file (supports TS and MJS)
 */
async function loadConfigFile(filePath: string): Promise<BlimuConfig> {
  const ext = path.extname(filePath);

  if (ext === '.mjs' || ext === '.js') {
    // Dynamic import for MJS/JS files
    const module = await import(path.resolve(filePath));
    // Config should be exported as default or named export
    const config = module.default || module.config || module;

    // If it's a function (factory), call it
    if (typeof config === 'function') {
      return await config();
    }

    return config as BlimuConfig;
  } else if (ext === '.ts') {
    // For TS files, we'd need to use tsx or ts-node
    // For now, throw an error suggesting to use MJS
    throw new Error(
      'TypeScript config files require tsx or ts-node. Please use .mjs instead or ensure tsx is available.'
    );
  } else {
    throw new Error(
      `Unsupported config file format: ${ext}. Supported: .mjs, .js, .ts`
    );
  }
}

/**
 * Extract types from config object
 */
function extractTypes(config: BlimuConfig): ExtractedTypes {
  const extracted: ExtractedTypes = {};

  // Extract resource types (keys from resources object)
  if (config.resources) {
    extracted.resourceTypes = Object.keys(config.resources);
  }

  // Extract entitlement types (keys from entitlements object)
  if (config.entitlements) {
    extracted.entitlementTypes = Object.keys(config.entitlements);
  }

  // Extract plan types (keys from plans object)
  if (config.plans) {
    extracted.planTypes = Object.keys(config.plans);
  }

  // Extract limit types from plans
  const limitTypes = new Set<string>();
  const usageLimitTypes = new Set<string>();

  if (config.plans) {
    for (const plan of Object.values(config.plans)) {
      // Resource limits
      if (plan.resource_limits) {
        for (const limitType of Object.keys(plan.resource_limits)) {
          limitTypes.add(limitType);
        }
      }

      // Usage-based limits
      if (plan.usage_based_limits) {
        for (const limitType of Object.keys(plan.usage_based_limits)) {
          usageLimitTypes.add(limitType);
        }
      }
    }
  }

  if (limitTypes.size > 0) {
    extracted.limitTypes = Array.from(limitTypes);
  }

  if (usageLimitTypes.size > 0) {
    extracted.usageLimitTypes = Array.from(usageLimitTypes);
  }

  return extracted;
}
