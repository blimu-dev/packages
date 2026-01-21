import type { z } from 'zod';

/**
 * Factory function to create an EnvironmentVariables class from a Zod schema.
 *
 * @param schema - The Zod schema to validate environment variables
 * @returns A class that can be used as a NestJS provider
 *
 * @example
 * ```typescript
 * const EnvironmentVariables = createEnvironmentVariables(
 *   z.object({
 *     DATABASE_URL: z.string(),
 *     PORT: z.coerce.number().default(3000),
 *   })
 * );
 *
 * // In your module
 * EnvModule.register(EnvironmentVariables);
 *
 * // In your service
 * constructor(private readonly env: EnvironmentVariables) {}
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createEnvironmentVariables<T extends z.ZodObject<any>>(
  schema: T
): new (values: z.infer<T>) => z.infer<T> {
  class EnvironmentVariablesClass {
    constructor(values: z.infer<T>) {
      // Copy all properties from values to this instance
      Object.assign(this, values);
    }
  }

  // Store the schema as a static property so the module can access it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (EnvironmentVariablesClass as any).__schema = schema;

  // Preserve the class name for better debugging
  Object.defineProperty(EnvironmentVariablesClass, 'name', {
    value: 'EnvironmentVariables',
    configurable: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return EnvironmentVariablesClass as any;
}
