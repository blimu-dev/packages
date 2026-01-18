import type { Config } from './config.schema';
import { ConfigSchema } from './config.schema';

/**
 * Helper function to define a codegen configuration with full TypeScript type inference and runtime validation.
 * Use this in MJS config files for type safety and validation.
 *
 * This function validates the config at runtime using Zod, ensuring that:
 * - All required fields are present
 * - All field types are correct
 * - Generator-specific options are valid
 * - Template overrides use valid template names
 *
 * @example
 * ```javascript
 * import { defineConfig } from '@blimu/codegen';
 *
 * export default defineConfig({
 *   spec: 'http://localhost:3020/docs/backend-api/json',
 *   clients: [{
 *     type: 'typescript',
 *     outDir: './my-sdk',
 *     packageName: 'my-sdk',
 *     name: 'MyClient',
 *     templates: {
 *       'client.ts.hbs': './custom/client.ts.hbs',
 *     },
 *   }]
 * });
 * ```
 *
 * @param config - The configuration object to validate
 * @returns The validated configuration object
 * @throws Error if the configuration is invalid
 */
export function defineConfig(config: Config): Config {
  // Validate the config using Zod schema
  return ConfigSchema.parse(config);
}
