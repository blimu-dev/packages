import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import type {
  IR,
  IROperation,
  IRService,
  IRSchema,
  IRSecurityScheme,
} from '../../ir/ir.types';
import type {
  TypeScriptClient,
  PredefinedType,
} from '../../config/config.schema';
import type { Generator } from '../generator.interface';
import { ConfigService } from '../../config/config.service';
import { registerCommonHandlebarsHelpers } from '../handlebars-helpers';
import {
  schemaToTSType,
  resolveMethodName,
  deriveMethodName,
  buildPathTemplate,
  buildQueryKeyBase,
  orderPathParams,
  buildMethodSignature,
  collectPredefinedTypesUsedInSchema,
  queryKeyArgs,
  quoteTSPropertyName,
  isStreamingOperation,
  getStreamingItemType,
  collectPredefinedTypesUsedInService,
  sortModelDefsByDependencies,
} from './helpers';
import { schemaToZodSchema } from './zod-schema-converter';
import { toPascalCase, toSnakeCase } from '../../utils/string.utils';
import { formatWithPrettier } from './prettier-formatter';

@Injectable()
export class TypeScriptGeneratorService implements Generator<TypeScriptClient> {
  private readonly logger = new Logger(TypeScriptGeneratorService.name);

  constructor(private readonly configService: ConfigService) {}

  getType(): string {
    return 'typescript';
  }

  async generate(client: TypeScriptClient, ir: IR): Promise<void> {
    // Extract defaultBaseURL from OpenAPI servers if not already set
    if (!client.defaultBaseURL && ir.openApiDocument) {
      const doc = ir.openApiDocument as { servers?: { url?: string }[] };
      const servers = doc.servers;
      if (Array.isArray(servers) && servers.length > 0) {
        client.defaultBaseURL = servers[0]?.url || '';
      }
    }

    // Set default srcDir if not specified (for template access)
    if (!client.srcDir) {
      client.srcDir = 'src';
    }

    // Ensure directories
    const srcDirPath = client.srcDir;
    const srcDir = path.join(client.outDir, srcDirPath);
    const servicesDir = path.join(srcDir, 'services');
    await fs.promises.mkdir(servicesDir, { recursive: true });

    // Pre-process operations to resolve method names (async operation)
    const processedIR = await this.preprocessIR(client, ir);

    // Register Handlebars helpers
    this.registerHandlebarsHelpers(client);

    // Generate files and track all generated TypeScript files for formatting
    const generatedTypeScriptFiles: string[] = [];

    generatedTypeScriptFiles.push(
      ...(await this.generateClient(client, processedIR, srcDir))
    );
    generatedTypeScriptFiles.push(
      ...(await this.generateAuthStrategies(client, processedIR, srcDir))
    );
    generatedTypeScriptFiles.push(
      ...(await this.generateIndex(client, processedIR, srcDir))
    );
    generatedTypeScriptFiles.push(
      ...(await this.generateUtils(client, processedIR, srcDir))
    );
    generatedTypeScriptFiles.push(
      ...(await this.generateServices(client, processedIR, servicesDir))
    );
    generatedTypeScriptFiles.push(
      ...(await this.generateSchema(client, processedIR, srcDir))
    );
    generatedTypeScriptFiles.push(
      ...(await this.generateZodSchema(client, processedIR, srcDir))
    );
    await this.generatePackageJson(client);
    await this.generateTsConfig(client);
    generatedTypeScriptFiles.push(...(await this.generateTsupConfig(client)));
    await this.generateReadme(client, processedIR);

    // Format generated TypeScript files with Prettier (if enabled)
    // Default to true if formatCode is not specified
    const shouldFormat = client.formatCode !== false;
    if (shouldFormat) {
      // Generate .prettierrc config before formatting to ensure single quotes are used
      await this.generatePrettierConfig(client);
      this.logger.debug(
        'Formatting generated TypeScript files with Prettier...'
      );
      await formatWithPrettier(
        client.outDir,
        generatedTypeScriptFiles,
        this.logger
      );
    } else {
      this.logger.debug('Code formatting is disabled for this client.');
    }
  }

  /**
   * Pre-process IR to resolve method names and add cached values
   */
  private async preprocessIR(client: TypeScriptClient, ir: IR): Promise<IR> {
    // Create a copy of IR with resolved method names
    const processedServices = await Promise.all(
      ir.services.map(async (service) => ({
        ...service,
        operations: await Promise.all(
          service.operations.map(async (op) => {
            const methodName = await resolveMethodName(client, op);
            return {
              ...op,
              _resolvedMethodName: methodName, // Cache the resolved name
            };
          })
        ),
      }))
    );

    return {
      ...ir,
      services: processedServices,
    };
  }

  private registerHandlebarsHelpers(_client: TypeScriptClient): void {
    // Register common helpers shared across all generators
    registerCommonHandlebarsHelpers();

    // TypeScript-specific helpers
    // Use pre-resolved method names from _resolvedMethodName
    // Operations are spread with _resolvedMethodName added during processing
    type OperationWithResolvedName = IROperation & {
      _resolvedMethodName?: string;
    };
    Handlebars.registerHelper('methodName', (op: OperationWithResolvedName) => {
      return op._resolvedMethodName || deriveMethodName(op);
    });
    Handlebars.registerHelper(
      'queryTypeName',
      (op: OperationWithResolvedName) => {
        const methodName = op._resolvedMethodName || deriveMethodName(op);
        return toPascalCase(op.tag) + toPascalCase(methodName) + 'Query';
      }
    );
    Handlebars.registerHelper(
      'pathTemplate',
      (op: OperationWithResolvedName) => {
        const result = buildPathTemplate(op);
        // Return as Handlebars.SafeString to prevent HTML escaping
        return new Handlebars.SafeString(result);
      }
    );
    Handlebars.registerHelper(
      'queryKeyBase',
      (op: OperationWithResolvedName) => {
        const result = buildQueryKeyBase(op);
        // Return as Handlebars.SafeString to prevent HTML escaping
        return new Handlebars.SafeString(result);
      }
    );
    Handlebars.registerHelper(
      'pathParamsInOrder',
      (op: OperationWithResolvedName) => orderPathParams(op)
    );
    Handlebars.registerHelper(
      'methodSignature',
      (op: OperationWithResolvedName, options: Handlebars.HelperOptions) => {
        const methodName = op._resolvedMethodName || deriveMethodName(op);
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        // Service files are not in the same file as schema.ts, so isSameFile=false
        const isSameFile = options?.data?.root?.isSameFile || false;
        const signature = buildMethodSignature(
          op,
          methodName,
          modelDefs,
          predefinedTypes,
          isSameFile
        );
        // Return as SafeString array to prevent HTML escaping
        return signature.map((s) => new Handlebars.SafeString(s));
      }
    );
    Handlebars.registerHelper(
      'methodSignatureNoInit',
      (op: OperationWithResolvedName, options: Handlebars.HelperOptions) => {
        const methodName = op._resolvedMethodName || deriveMethodName(op);
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        // Service files are not in the same file as schema.ts, so isSameFile=false
        const isSameFile = options?.data?.root?.isSameFile || false;
        const parts = buildMethodSignature(
          op,
          methodName,
          modelDefs,
          predefinedTypes,
          isSameFile
        );
        return parts.slice(0, -1); // Remove init parameter
      }
    );
    Handlebars.registerHelper(
      'queryKeyArgs',
      (op: OperationWithResolvedName) => {
        const args = queryKeyArgs(op);
        // Return as SafeString array to prevent HTML escaping
        return args.map((arg) => new Handlebars.SafeString(arg));
      }
    );
    Handlebars.registerHelper(
      'tsType',
      (x: IRSchema | string, options: Handlebars.HelperOptions) => {
        if (x && typeof x === 'object' && 'kind' in x) {
          const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
          const modelDefs = options?.data?.root?.IR?.modelDefs || [];
          // When generating schema.ts, isSameFile=true; for service files, isSameFile=false
          const isSameFile = options?.data?.root?.isSameFile || false;
          return schemaToTSType(x, predefinedTypes, modelDefs, isSameFile);
        }
        return 'unknown';
      }
    );
    Handlebars.registerHelper('stripSchemaNs', (s: string) =>
      s.replace(/^Schema\./, '')
    );
    Handlebars.registerHelper(
      'tsTypeStripNs',
      (x: IRSchema | string, options: Handlebars.HelperOptions) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        // When generating schema.ts, isSameFile=true; for service files, isSameFile=false
        const isSameFile = options?.data?.root?.isSameFile || false;

        if (x && typeof x === 'object' && 'kind' in x) {
          // Use schemaToTSType with predefinedTypes and modelDefs to get correct type
          // When isSameFile=true, schemaToTSType already returns types without Schema. prefix for local types
          const typeStr = schemaToTSType(
            x,
            predefinedTypes,
            modelDefs,
            isSameFile
          );
          // Strip ALL occurrences of Schema. prefix (including nested ones in inline objects)
          // For inline objects like ({ type: Schema.ResourceType }[]), we need to strip all Schema. references
          const stripped = typeStr.replace(/Schema\./g, '');
          // Return as SafeString to prevent Handlebars HTML escaping
          return new Handlebars.SafeString(stripped);
        }

        // If it's a string that looks like "Schema.TypeName", check for predefined types
        if (typeof x === 'string') {
          if (x.startsWith('Schema.')) {
            const typeName = x.replace(/^Schema\./, '');
            const predefinedType = predefinedTypes.find(
              (pt: PredefinedType) => pt.type === typeName
            );
            if (predefinedType) {
              return new Handlebars.SafeString(typeName);
            }
            // Not a predefined type, return with Schema. prefix stripped (for non-predefined types)
            return new Handlebars.SafeString(typeName);
          }
          return new Handlebars.SafeString(x);
        }

        return 'unknown';
      }
    );
    // Helper to check if a type is predefined
    Handlebars.registerHelper(
      'isPredefinedType',
      (typeName: string, options: Handlebars.HelperOptions) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        return predefinedTypes.some(
          (pt: PredefinedType) => pt.type === typeName
        );
      }
    );
    // Helper to get predefined type info
    Handlebars.registerHelper(
      'getPredefinedType',
      (typeName: string, options: Handlebars.HelperOptions) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        return predefinedTypes.find(
          (pt: PredefinedType) => pt.type === typeName
        );
      }
    );
    // Helper to group predefined types by package
    Handlebars.registerHelper(
      'groupByPackage',
      (predefinedTypes: PredefinedType[]) => {
        const grouped: Record<string, { package: string; types: string[] }> =
          {};
        for (const pt of predefinedTypes || []) {
          if (!grouped[pt.package]) {
            grouped[pt.package] = { package: pt.package, types: [] };
          }
          grouped[pt.package]?.types.push(pt.type);
        }
        return Object.values(grouped);
      }
    );
    // Helper to get predefined types used in a service
    Handlebars.registerHelper(
      'getServicePredefinedTypes',
      (service: IRService, options: Handlebars.HelperOptions) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        return collectPredefinedTypesUsedInService(
          service,
          predefinedTypes,
          modelDefs
        );
      }
    );
    // Helper to get predefined types used in the schema file
    Handlebars.registerHelper(
      'getSchemaPredefinedTypes',
      (options: Handlebars.HelperOptions) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        return collectPredefinedTypesUsedInSchema(modelDefs, predefinedTypes);
      }
    );
    // Helper to join type names with commas
    Handlebars.registerHelper('joinTypes', (types: string[]) => {
      return types.join(', ');
    });
    // Helper to get unique packages from predefined types
    Handlebars.registerHelper(
      'uniquePackages',
      (predefinedTypes: PredefinedType[]) => {
        const packages = new Set<string>();
        for (const pt of predefinedTypes || []) {
          if (pt.package) {
            packages.add(pt.package);
          }
        }
        return Array.from(packages);
      }
    );
    // Helper to check if a package is in predefined types
    Handlebars.registerHelper(
      'isPredefinedPackage',
      (packageName: string, predefinedTypes: PredefinedType[]) => {
        if (!predefinedTypes) return false;
        return predefinedTypes.some((pt) => pt.package === packageName);
      }
    );
    // Helper to get all dependencies (predefined types + explicit dependencies)
    Handlebars.registerHelper(
      'getAllDependencies',
      (client: TypeScriptClient) => {
        const deps: Record<string, string> = {
          '@blimu/fetch': '^0.2.0', // Always include @blimu/fetch (the generated client extends FetchClient)
          zod: '^4.3.5', // Always include zod
        };

        // Add predefined type packages
        if (client.predefinedTypes) {
          for (const pt of client.predefinedTypes) {
            if (pt.package && !deps[pt.package]) {
              // Use explicit version if provided, otherwise "*"
              deps[pt.package] = client.dependencies?.[pt.package] || '*';
            }
          }
        }

        // Add any other explicit dependencies (excluding zod and predefined packages)
        if (client.dependencies) {
          for (const [pkg, version] of Object.entries(client.dependencies)) {
            if (pkg !== 'zod' && !deps[pkg]) {
              deps[pkg] = version;
            }
          }
        }

        return deps;
      }
    );
    // Decode HTML entities in strings
    // Note: &amp; must be replaced last to avoid double-decoding
    // Also handle cases where entities are already escaped by Handlebars (e.g., &amp;#x60;)
    Handlebars.registerHelper('decodeHtml', (str: string) => {
      if (typeof str !== 'string') return str;
      // First decode double-encoded entities (e.g., &amp;#x60; -> &#x60;)
      let decoded = str
        .replace(/&amp;#x60;/g, '&#x60;')
        .replace(/&amp;#96;/g, '&#96;')
        .replace(/&amp;quot;/g, '&quot;')
        .replace(/&amp;lt;/g, '&lt;')
        .replace(/&amp;gt;/g, '&gt;');
      // Then decode all HTML entities
      decoded = decoded
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x60;/g, '`')
        .replace(/&#96;/g, '`')
        .replace(/&amp;/g, '&');
      // Return as SafeString to prevent Handlebars from escaping it again
      return new Handlebars.SafeString(decoded);
    });
    Handlebars.registerHelper('quotePropName', (name: string) =>
      quoteTSPropertyName(name)
    );
    Handlebars.registerHelper(
      'zodSchema',
      (x: IRSchema | string, options: Handlebars.HelperOptions) => {
        // Use zod schema converter for generating Zod schemas
        if (x && typeof x === 'object' && 'kind' in x) {
          const modelDefs = options?.data?.root?.IR?.modelDefs || [];
          // When generating schema.zod.ts, use local schema references (same file)
          // The template name is passed in the root context
          const useLocalSchemaTypes =
            options?.data?.root?._templateName === 'schema.zod.ts.hbs';
          return new Handlebars.SafeString(
            schemaToZodSchema(x, '', modelDefs, useLocalSchemaTypes)
          );
        }
        return 'z.unknown()';
      }
    );
    // Streaming helpers
    Handlebars.registerHelper(
      'isStreaming',
      (op: OperationWithResolvedName) => {
        return isStreamingOperation(op);
      }
    );
    // Security scheme helpers
    Handlebars.registerHelper(
      'hasBearerScheme',
      (schemes: IRSecurityScheme[]) => {
        if (!Array.isArray(schemes)) return false;
        return schemes.some((s) => s.type === 'http' && s.scheme === 'bearer');
      }
    );
    Handlebars.registerHelper(
      'hasApiKeyScheme',
      (schemes: IRSecurityScheme[]) => {
        if (!Array.isArray(schemes)) return false;
        return schemes.some((s) => s.type === 'apiKey');
      }
    );
    Handlebars.registerHelper('serviceUsesSchema', (service: IRService) => {
      if (
        !service ||
        !service.operations ||
        !Array.isArray(service.operations)
      ) {
        return false;
      }
      // Check if any operation uses Schema types
      // Schema is used when:
      // 1. Response schema is a ref (uses Schema.TypeName)
      // 2. Request body schema is a ref (uses Schema.TypeName)
      // 3. Query params exist (uses Schema.QueryType interfaces)
      // 4. Any schema that's not a primitive type
      return service.operations.some((op: OperationWithResolvedName) => {
        // Check response schema - if it's a ref or complex type, it uses Schema
        if (op.response?.schema) {
          const schema = op.response.schema;
          if (
            schema.kind === 'ref' ||
            schema.kind === 'object' ||
            schema.kind === 'array' ||
            schema.kind === 'oneOf' ||
            schema.kind === 'anyOf' ||
            schema.kind === 'allOf'
          ) {
            return true;
          }
        }
        // Check request body schema
        if (op.requestBody?.schema) {
          const schema = op.requestBody.schema;
          if (
            schema.kind === 'ref' ||
            schema.kind === 'object' ||
            schema.kind === 'array' ||
            schema.kind === 'oneOf' ||
            schema.kind === 'anyOf' ||
            schema.kind === 'allOf'
          ) {
            return true;
          }
        }
        // Check query params (they always use Schema.QueryType interfaces)
        if (op.queryParams && op.queryParams.length > 0) {
          return true;
        }
        return false;
      });
    });
    Handlebars.registerHelper(
      'streamingItemType',
      (op: OperationWithResolvedName) => {
        return new Handlebars.SafeString(getStreamingItemType(op));
      }
    );
  }

  private async renderTemplate(
    templateName: string,
    data: {
      Client?: TypeScriptClient;
      IR?: IR;
      Service?: IRService;
      PredefinedTypes?: PredefinedType[];
      isSameFile?: boolean;
      [key: string]: unknown;
    },
    outputPath: string,
    client: TypeScriptClient
  ): Promise<void> {
    // 1. Check for template override
    const overridePath =
      client.templates?.[templateName as keyof typeof client.templates];
    if (overridePath) {
      this.logger.debug(
        `Using template override for ${templateName}: ${overridePath}`
      );
      try {
        // Validate that override path exists and is readable
        await fs.promises.access(overridePath, fs.constants.R_OK);
        const templateContent = await fs.promises.readFile(
          overridePath,
          'utf-8'
        );
        const template = Handlebars.compile(templateContent);
        // Add template name to context so helpers know which template is being rendered
        const contextWithTemplate = {
          ...data,
          _templateName: templateName,
        };
        const rendered = template(contextWithTemplate);
        await fs.promises.writeFile(outputPath, rendered, 'utf-8');
        return;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Template override file not found or not readable: ${overridePath}. Error: ${errorMsg}`
        );
        throw new Error(
          `Template override file not found or not readable: ${overridePath}`
        );
      }
    }

    // 2. Fall back to default template resolution
    // Templates are now co-located with the generator
    // Try multiple possible template paths (handles both source and compiled locations)
    // Note: When bundled by tsup, __dirname will be 'dist/generator/typescript', so we need to look for templates
    // in dist/generator/typescript/templates/
    const possiblePaths = [
      path.join(__dirname, 'templates', templateName), // Source: src/generator/typescript/templates/ or Bundled: dist/generator/typescript/templates/
      path.join(__dirname, '../typescript/templates', templateName), // Fallback for different bundling scenarios
      path.join(
        process.cwd(),
        'src/generator/typescript/templates',
        templateName
      ), // Development from root
      path.join(
        process.cwd(),
        'packages/codegen/src/generator/typescript/templates',
        templateName
      ), // Development from monorepo root
    ];

    let templatePath: string | null = null;
    for (const possiblePath of possiblePaths) {
      try {
        await fs.promises.access(possiblePath);
        templatePath = possiblePath;

        break;
      } catch {
        this.logger.debug(`Template not found at: ${possiblePath}`);
        // Continue to next path
      }
    }

    if (!templatePath) {
      this.logger.error(`Template not found: ${templateName}`);
      this.logger.error(`Checked paths: ${possiblePaths.join(', ')}`);
      this.logger.error(`__dirname: ${__dirname}`);
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    // Add template name to context so helpers know which template is being rendered
    const contextWithTemplate = {
      ...data,
      _templateName: templateName,
    };
    const rendered = template(contextWithTemplate);
    // Ensure output directory exists before writing
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    await fs.promises.writeFile(outputPath, rendered, 'utf-8');
  }

  private async generateClient(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<string[]> {
    const clientPath = path.join(srcDir, 'client.ts');
    if (this.configService.shouldExcludeFile(client, clientPath)) {
      return [];
    }
    try {
      await this.renderTemplate(
        'client.ts.hbs',
        { Client: client, IR: ir },
        clientPath,
        client
      );
      return [path.relative(client.outDir, clientPath)];
    } catch (error) {
      // Fallback if template doesn't exist yet
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template client.ts.hbs not found: ${errorMsg}, using placeholder`
      );
      const content = `// Generated client - template rendering to be implemented`;
      await fs.promises.writeFile(clientPath, content, 'utf-8');
      return [path.relative(client.outDir, clientPath)];
    }
  }

  private async generateAuthStrategies(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<string[]> {
    const authStrategiesPath = path.join(srcDir, 'auth-strategies.ts');
    if (this.configService.shouldExcludeFile(client, authStrategiesPath)) {
      return [];
    }
    try {
      await this.renderTemplate(
        'auth-strategies.ts.hbs',
        { Client: client, IR: ir },
        authStrategiesPath,
        client
      );
      return [path.relative(client.outDir, authStrategiesPath)];
    } catch {
      this.logger.warn(
        `Template auth-strategies.ts.hbs not found, using placeholder`
      );
      const content = `// Generated auth-strategies - template rendering to be implemented`;
      await fs.promises.writeFile(authStrategiesPath, content, 'utf-8');
      return [path.relative(client.outDir, authStrategiesPath)];
    }
  }

  private async generateIndex(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<string[]> {
    const indexPath = path.join(srcDir, 'index.ts');
    if (this.configService.shouldExcludeFile(client, indexPath)) {
      return [];
    }

    // Skip generation if index.ts already exists (allows user customization)
    try {
      await fs.promises.access(indexPath);
      this.logger.debug(
        `index.ts already exists at ${indexPath}, skipping generation to preserve customizations`
      );
      return [];
    } catch {
      // File doesn't exist, proceed with generation
    }

    try {
      await this.renderTemplate(
        'index.ts.hbs',
        { Client: client, IR: ir },
        indexPath,
        client
      );
      return [path.relative(client.outDir, indexPath)];
    } catch {
      this.logger.warn(`Template index.ts.hbs not found, using placeholder`);
      const content = `// Generated index - template rendering to be implemented`;
      await fs.promises.writeFile(indexPath, content, 'utf-8');
      return [path.relative(client.outDir, indexPath)];
    }
  }

  private async generateUtils(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<string[]> {
    const utilsPath = path.join(srcDir, 'utils.ts');
    if (this.configService.shouldExcludeFile(client, utilsPath)) {
      return [];
    }
    try {
      await this.renderTemplate(
        'utils.ts.hbs',
        { Client: client, IR: ir },
        utilsPath,
        client
      );
      return [path.relative(client.outDir, utilsPath)];
    } catch {
      this.logger.warn(`Template utils.ts.hbs not found, using placeholder`);
      const content = `// Generated utils - template rendering to be implemented`;
      await fs.promises.writeFile(utilsPath, content, 'utf-8');
      return [path.relative(client.outDir, utilsPath)];
    }
  }

  private async generateServices(
    client: TypeScriptClient,
    ir: IR,
    servicesDir: string
  ): Promise<string[]> {
    const generatedFiles: string[] = [];
    for (const service of ir.services) {
      const servicePath = path.join(
        servicesDir,
        `${toSnakeCase(service.tag).toLowerCase()}.ts`
      );
      if (this.configService.shouldExcludeFile(client, servicePath)) {
        continue;
      }
      try {
        await this.renderTemplate(
          'service.ts.hbs',
          {
            Client: client,
            Service: service,
            IR: ir,
            PredefinedTypes: client.predefinedTypes || [],
            isSameFile: false, // Service files are separate from schema.ts
          },
          servicePath,
          client
        );
        generatedFiles.push(path.relative(client.outDir, servicePath));
      } catch {
        this.logger.warn(
          `Template service.ts.hbs not found, using placeholder`
        );
        const content = `// Generated service ${service.tag} - template rendering to be implemented`;
        await fs.promises.writeFile(servicePath, content, 'utf-8');
        generatedFiles.push(path.relative(client.outDir, servicePath));
      }
    }
    return generatedFiles;
  }

  private async generateSchema(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<string[]> {
    const schemaPath = path.join(srcDir, 'schema.ts');
    if (this.configService.shouldExcludeFile(client, schemaPath)) {
      return [];
    }
    try {
      await this.renderTemplate(
        'schema.ts.hbs',
        {
          Client: client,
          IR: ir,
          PredefinedTypes: client.predefinedTypes || [],
          isSameFile: true, // Types in schema.ts are in the same file
        },
        schemaPath,
        client
      );
      return [path.relative(client.outDir, schemaPath)];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template schema.ts.hbs error: ${errorMsg}, using placeholder`
      );
      const content = `// Generated schema - template rendering to be implemented`;
      await fs.promises.writeFile(schemaPath, content, 'utf-8');
      return [path.relative(client.outDir, schemaPath)];
    }
  }

  private async generateZodSchema(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<string[]> {
    const zodSchemaPath = path.join(srcDir, 'schema.zod.ts');
    if (this.configService.shouldExcludeFile(client, zodSchemaPath)) {
      return [];
    }
    try {
      // Sort modelDefs by dependencies to ensure const declarations are in correct order
      const sortedModelDefs = sortModelDefsByDependencies(ir.modelDefs);
      const sortedIR = {
        ...ir,
        modelDefs: sortedModelDefs,
      };
      await this.renderTemplate(
        'schema.zod.ts.hbs',
        { Client: client, IR: sortedIR as IR },
        zodSchemaPath,
        client
      );
      return [path.relative(client.outDir, zodSchemaPath)];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template schema.zod.ts.hbs error: ${errorMsg}, using placeholder`
      );
      const content = `// Generated Zod schemas - template rendering to be implemented`;
      await fs.promises.writeFile(zodSchemaPath, content, 'utf-8');
      return [path.relative(client.outDir, zodSchemaPath)];
    }
  }

  private async generatePackageJson(client: TypeScriptClient): Promise<void> {
    const packageJsonPath = path.join(client.outDir, 'package.json');
    if (this.configService.shouldExcludeFile(client, packageJsonPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        'package.json.hbs',
        { Client: client },
        packageJsonPath,
        client
      );
    } catch {
      this.logger.warn(`Template package.json.hbs not found, using fallback`);
      const content = JSON.stringify(
        {
          name: client.packageName,
          version: '0.0.1',
          main: 'dist/index.js',
          types: 'dist/index.d.ts',
        },
        null,
        2
      );
      await fs.promises.writeFile(packageJsonPath, content, 'utf-8');
    }
  }

  private async generateTsConfig(client: TypeScriptClient): Promise<void> {
    const tsConfigPath = path.join(client.outDir, 'tsconfig.json');
    if (this.configService.shouldExcludeFile(client, tsConfigPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        'tsconfig.json.hbs',
        { Client: client },
        tsConfigPath,
        client
      );
    } catch {
      this.logger.warn(`Template tsconfig.json.hbs not found, using fallback`);
      const srcDir = client.srcDir || 'src';
      const content = JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['ES2020'],
            declaration: true,
            outDir: './dist',
            rootDir: `./${srcDir}`,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
          },
          include: [`${srcDir}/**/*`],
        },
        null,
        2
      );
      // Ensure output directory exists before writing
      const outputDir = path.dirname(tsConfigPath);
      await fs.promises.mkdir(outputDir, { recursive: true });
      await fs.promises.writeFile(tsConfigPath, content, 'utf-8');
    }
  }

  private async generateTsupConfig(
    client: TypeScriptClient
  ): Promise<string[]> {
    const tsupConfigPath = path.join(client.outDir, 'tsup.config.ts');
    if (this.configService.shouldExcludeFile(client, tsupConfigPath)) {
      return [];
    }
    try {
      await this.renderTemplate(
        'tsup.config.ts.hbs',
        { Client: client },
        tsupConfigPath,
        client
      );
    } catch {
      this.logger.warn(`Template tsup.config.ts.hbs not found, using fallback`);
      const srcDir = client.srcDir || 'src';
      const content = `import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["${srcDir}/**/*.ts"],
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  tsconfig: "./tsconfig.json",
  external: [],
});
`;
      await fs.promises.writeFile(tsupConfigPath, content, 'utf-8');
    }
    return ['tsup.config.ts'];
  }

  private async generateReadme(
    client: TypeScriptClient,
    ir: IR
  ): Promise<void> {
    const readmePath = path.join(client.outDir, 'README.md');
    if (this.configService.shouldExcludeFile(client, readmePath)) {
      return;
    }
    try {
      await this.renderTemplate(
        'README.md.hbs',
        { Client: client, IR: ir },
        readmePath,
        client
      );
    } catch {
      this.logger.warn(`Template README.md.hbs not found, using fallback`);
      const content = `# ${client.name}\n\nGenerated SDK from OpenAPI specification.`;
      await fs.promises.writeFile(readmePath, content, 'utf-8');
    }
  }

  private async generatePrettierConfig(
    client: TypeScriptClient
  ): Promise<void> {
    const prettierConfigPath = path.join(client.outDir, '.prettierrc');
    if (this.configService.shouldExcludeFile(client, prettierConfigPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        '.prettierrc.hbs',
        { Client: client },
        prettierConfigPath,
        client
      );
    } catch {
      this.logger.warn(`Template .prettierrc.hbs not found, using fallback`);
      const content = JSON.stringify(
        {
          semi: true,
          trailingComma: 'es5',
          singleQuote: true,
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
        },
        null,
        2
      );
      await fs.promises.writeFile(prettierConfigPath, content, 'utf-8');
    }
  }
}
