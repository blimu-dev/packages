import { z } from "zod";

/**
 * Type definition for operationId parser function.
 * Transforms operationId, method, and path into a method name.
 * Can be synchronous or asynchronous.
 */
export type OperationIdParser = (
  operationId: string,
  method: string,
  path: string
) => string | Promise<string>;

/**
 * Pre-defined type schema for importing types from external packages
 */
export const PredefinedTypeSchema = z.object({
  // Component schema name (e.g., "ResourceType")
  type: z.string().min(1, "Type name is required"),
  // Package name (e.g., "@blimu/types")
  package: z.string().min(1, "Package name is required"),
  // Optional import path (defaults to package root)
  importPath: z.string().optional(),
});

export type PredefinedType = z.infer<typeof PredefinedTypeSchema>;

/**
 * Valid template names for TypeScript generator
 */
export const TYPESCRIPT_TEMPLATE_NAMES = [
  "client.ts.hbs",
  "index.ts.hbs",
  "package.json.hbs",
  "README.md.hbs",
  "schema.ts.hbs",
  "schema.zod.ts.hbs",
  "service.ts.hbs",
  "tsconfig.json.hbs",
  "utils.ts.hbs",
] as const;

export type TypeScriptTemplateName = (typeof TYPESCRIPT_TEMPLATE_NAMES)[number];

/**
 * Base client schema with common options shared across all generators
 */
const BaseClientSchema = z.object({
  type: z.string().min(1, "Type is required"),
  outDir: z.string().min(1, "OutDir is required"),
  name: z.string().min(1, "Name is required"),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  // OperationIDParser is an optional function to transform operationId to a method name.
  // Function signature: (operationId: string, method: string, path: string) => string | Promise<string>
  // Note: Zod doesn't validate function signatures at runtime, but TypeScript will enforce the type
  operationIdParser: z.custom<OperationIdParser>().optional(),
  // PreCommand is an optional command to run before SDK generation starts.
  // Uses Docker Compose array format: ["goimports", "-w", "."]
  // The command will be executed in the output directory.
  preCommand: z.array(z.string()).optional(),
  // PostCommand is an optional command to run after SDK generation completes.
  // Uses Docker Compose array format: ["goimports", "-w", "."]
  // The command will be executed in the output directory.
  postCommand: z.array(z.string()).optional(),
  // DefaultBaseURL is the default base URL that will be used if no base URL is provided when creating a client
  defaultBaseURL: z.string().optional(),
  // ExcludeFiles is a list of file paths (relative to outDir) that should not be generated
  // Example: ["package.json", "src/client.ts"]
  exclude: z.array(z.string()).optional(),
});

/**
 * TypeScript-specific client schema
 */
export const TypeScriptClientSchema = BaseClientSchema.extend({
  type: z.literal("typescript"),
  packageName: z.string().min(1, "PackageName is required"),
  moduleName: z.string().optional(),
  // IncludeQueryKeys toggles generation of __queryKeys helper methods in services
  includeQueryKeys: z.boolean().optional(),
  // Pre-defined types to import from external packages instead of generating locally
  predefinedTypes: z.array(PredefinedTypeSchema).optional(),
  // Dependencies with explicit versions (e.g., { "@blimu/types": "^0.1.0" })
  // If not specified, predefined type packages will use "*" version
  dependencies: z.record(z.string(), z.string()).optional(),
  // DevDependencies with explicit versions (e.g., { "@types/jsonwebtoken": "^9" })
  devDependencies: z.record(z.string(), z.string()).optional(),
  // FormatCode enables automatic formatting of generated TypeScript files using Biome
  // Defaults to true if not specified
  formatCode: z.boolean().optional(),
  // Template overrides - maps valid template names to file paths
  templates: z
    .record(z.string(), z.string())
    .refine(
      (templates) => {
        // Validate that all keys are valid template names
        return Object.keys(templates).every((key) =>
          TYPESCRIPT_TEMPLATE_NAMES.includes(key as TypeScriptTemplateName)
        );
      },
      {
        message: `Template names must be one of: ${TYPESCRIPT_TEMPLATE_NAMES.join(", ")}`,
      }
    )
    .optional(),
});

/**
 * Discriminated union of all client types
 * Add new generator types here as they are implemented
 */
export const ClientSchema = z.discriminatedUnion("type", [
  TypeScriptClientSchema,
  // Future generators can be added here:
  // PythonClientSchema,
  // GoClientSchema,
  // etc.
]);

export const ConfigSchema = z.object({
  spec: z.string().min(1, "Spec is required"),
  name: z.string().optional(),
  clients: z.array(ClientSchema).min(1, "At least one client is required"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type TypeScriptClient = z.infer<typeof TypeScriptClientSchema>;
