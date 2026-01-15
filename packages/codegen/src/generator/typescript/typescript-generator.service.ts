import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
import { IR } from "../../ir/ir.types";
import { TypeScriptClient } from "../../config/config.schema";
import { Generator } from "../generator.interface";
import { ConfigService } from "../../config/config.service";
import { registerCommonHandlebarsHelpers } from "../handlebars-helpers";
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
} from "./helpers";
import { schemaToSchema } from "./schema-converter";
import { toPascalCase, toSnakeCase } from "../../utils/string.utils";
import { formatWithBiome } from "./biome-formatter";

@Injectable()
export class TypeScriptGeneratorService implements Generator<TypeScriptClient> {
  private readonly logger = new Logger(TypeScriptGeneratorService.name);

  constructor(private readonly configService: ConfigService) {}

  getType(): string {
    return "typescript";
  }

  async generate(client: TypeScriptClient, ir: IR): Promise<void> {
    // Ensure directories
    const srcDir = path.join(client.outDir, "src");
    const servicesDir = path.join(srcDir, "services");
    await fs.promises.mkdir(servicesDir, { recursive: true });

    // Pre-process operations to resolve method names (async operation)
    const processedIR = await this.preprocessIR(client, ir);

    // Register Handlebars helpers
    this.registerHandlebarsHelpers(client);

    // Generate files
    await this.generateClient(client, processedIR, srcDir);
    await this.generateIndex(client, processedIR, srcDir);
    await this.generateUtils(client, processedIR, srcDir);
    await this.generateServices(client, processedIR, servicesDir);
    await this.generateSchema(client, processedIR, srcDir);
    await this.generateZodSchema(client, processedIR, srcDir);
    await this.generatePackageJson(client);
    await this.generateTsConfig(client);
    await this.generateReadme(client, processedIR);

    // Format generated TypeScript files with Biome (if enabled)
    // Default to true if formatCode is not specified
    const shouldFormat = client.formatCode !== false;
    if (shouldFormat) {
      this.logger.debug("Formatting generated TypeScript files with Biome...");
      await formatWithBiome(client.outDir, this.logger);
    } else {
      this.logger.debug("Code formatting is disabled for this client.");
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

  private registerHandlebarsHelpers(client: TypeScriptClient): void {
    // Register common helpers shared across all generators
    registerCommonHandlebarsHelpers();

    // TypeScript-specific helpers
    // Use pre-resolved method names from _resolvedMethodName
    Handlebars.registerHelper("methodName", (op: any) => {
      return op._resolvedMethodName || deriveMethodName(op);
    });
    Handlebars.registerHelper("queryTypeName", (op: any) => {
      const methodName = op._resolvedMethodName || deriveMethodName(op);
      return toPascalCase(op.tag) + toPascalCase(methodName) + "Query";
    });
    Handlebars.registerHelper("pathTemplate", (op: any) => {
      const result = buildPathTemplate(op);
      // Return as Handlebars.SafeString to prevent HTML escaping
      return new Handlebars.SafeString(result);
    });
    Handlebars.registerHelper("queryKeyBase", (op: any) => {
      const result = buildQueryKeyBase(op);
      // Return as Handlebars.SafeString to prevent HTML escaping
      return new Handlebars.SafeString(result);
    });
    Handlebars.registerHelper("pathParamsInOrder", (op: any) =>
      orderPathParams(op)
    );
    Handlebars.registerHelper("methodSignature", (op: any, options: any) => {
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
    });
    Handlebars.registerHelper(
      "methodSignatureNoInit",
      (op: any, options: any) => {
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
    Handlebars.registerHelper("queryKeyArgs", (op: any) => {
      const args = queryKeyArgs(op);
      // Return as SafeString array to prevent HTML escaping
      return args.map((arg) => new Handlebars.SafeString(arg));
    });
    Handlebars.registerHelper("tsType", (x: any, options: any) => {
      if (x && typeof x === "object" && "kind" in x) {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        // When generating schema.ts, isSameFile=true; for service files, isSameFile=false
        const isSameFile = options?.data?.root?.isSameFile || false;
        return schemaToTSType(x, predefinedTypes, modelDefs, isSameFile);
      }
      return "unknown";
    });
    Handlebars.registerHelper("stripSchemaNs", (s: string) =>
      s.replace(/^Schema\./, "")
    );
    Handlebars.registerHelper("tsTypeStripNs", (x: any, options: any) => {
      const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
      const modelDefs = options?.data?.root?.IR?.modelDefs || [];
      // When generating schema.ts, isSameFile=true; for service files, isSameFile=false
      const isSameFile = options?.data?.root?.isSameFile || false;

      if (x && typeof x === "object" && "kind" in x) {
        // Use schemaToTSType with predefinedTypes and modelDefs to get correct type
        // When isSameFile=true, schemaToTSType already returns types without Schema. prefix for local types
        const typeStr = schemaToTSType(
          x,
          predefinedTypes,
          modelDefs,
          isSameFile
        );
        // Strip ALL occurrences of Schema. prefix (including nested ones in inline objects)
        // For inline objects like Array<({ type: Schema.ResourceType })>, we need to strip all Schema. references
        const stripped = typeStr.replace(/Schema\./g, "");
        // Return as SafeString to prevent Handlebars HTML escaping
        return new Handlebars.SafeString(stripped);
      }

      // If it's a string that looks like "Schema.TypeName", check for predefined types
      if (typeof x === "string") {
        if (x.startsWith("Schema.")) {
          const typeName = x.replace(/^Schema\./, "");
          const predefinedType = predefinedTypes.find(
            (pt: any) => pt.type === typeName
          );
          if (predefinedType) {
            return new Handlebars.SafeString(typeName);
          }
          // Not a predefined type, return with Schema. prefix stripped (for non-predefined types)
          return new Handlebars.SafeString(typeName);
        }
        return new Handlebars.SafeString(x);
      }

      return "unknown";
    });
    // Helper to check if a type is predefined
    Handlebars.registerHelper(
      "isPredefinedType",
      (typeName: string, options: any) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        return predefinedTypes.some((pt: any) => pt.type === typeName);
      }
    );
    // Helper to get predefined type info
    Handlebars.registerHelper(
      "getPredefinedType",
      (typeName: string, options: any) => {
        const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
        return predefinedTypes.find((pt: any) => pt.type === typeName);
      }
    );
    // Helper to group predefined types by package
    Handlebars.registerHelper("groupByPackage", (predefinedTypes: any[]) => {
      const grouped: Record<string, { package: string; types: string[] }> = {};
      for (const pt of predefinedTypes || []) {
        if (!grouped[pt.package]) {
          grouped[pt.package] = { package: pt.package, types: [] };
        }
        grouped[pt.package].types.push(pt.type);
      }
      return Object.values(grouped);
    });
    // Helper to get predefined types used in a service
    Handlebars.registerHelper(
      "getServicePredefinedTypes",
      (service: any, options: any) => {
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
    Handlebars.registerHelper("getSchemaPredefinedTypes", (options: any) => {
      const predefinedTypes = options?.data?.root?.PredefinedTypes || [];
      const modelDefs = options?.data?.root?.IR?.modelDefs || [];
      return collectPredefinedTypesUsedInSchema(modelDefs, predefinedTypes);
    });
    // Helper to join type names with commas
    Handlebars.registerHelper("joinTypes", (types: string[]) => {
      return types.join(", ");
    });
    // Helper to get unique packages from predefined types
    Handlebars.registerHelper("uniquePackages", (predefinedTypes: any[]) => {
      const packages = new Set<string>();
      for (const pt of predefinedTypes || []) {
        if (pt.package) {
          packages.add(pt.package);
        }
      }
      return Array.from(packages);
    });
    // Helper to check if a package is in predefined types
    Handlebars.registerHelper(
      "isPredefinedPackage",
      (packageName: string, predefinedTypes: any[]) => {
        if (!predefinedTypes) return false;
        return predefinedTypes.some((pt: any) => pt.package === packageName);
      }
    );
    // Helper to get all dependencies (predefined types + explicit dependencies)
    Handlebars.registerHelper(
      "getAllDependencies",
      (client: TypeScriptClient) => {
        const deps: Record<string, string> = {
          zod: "^4.3.5", // Always include zod
        };

        // Add predefined type packages
        if (client.predefinedTypes) {
          for (const pt of client.predefinedTypes) {
            if (pt.package && !deps[pt.package]) {
              // Use explicit version if provided, otherwise "*"
              deps[pt.package] = client.dependencies?.[pt.package] || "*";
            }
          }
        }

        // Add any other explicit dependencies (excluding zod and predefined packages)
        if (client.dependencies) {
          for (const [pkg, version] of Object.entries(client.dependencies)) {
            if (pkg !== "zod" && !deps[pkg]) {
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
    Handlebars.registerHelper("decodeHtml", (str: string) => {
      if (typeof str !== "string") return str;
      // First decode double-encoded entities (e.g., &amp;#x60; -> &#x60;)
      let decoded = str
        .replace(/&amp;#x60;/g, "&#x60;")
        .replace(/&amp;#96;/g, "&#96;")
        .replace(/&amp;quot;/g, "&quot;")
        .replace(/&amp;lt;/g, "&lt;")
        .replace(/&amp;gt;/g, "&gt;");
      // Then decode all HTML entities
      decoded = decoded
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x60;/g, "`")
        .replace(/&#96;/g, "`")
        .replace(/&amp;/g, "&");
      // Return as SafeString to prevent Handlebars from escaping it again
      return new Handlebars.SafeString(decoded);
    });
    Handlebars.registerHelper("quotePropName", (name: string) =>
      quoteTSPropertyName(name)
    );
    Handlebars.registerHelper("zodSchema", (x: any, options: any) => {
      // Use new schema converter (backward compatible name)
      if (x && typeof x === "object" && "kind" in x) {
        const modelDefs = options?.data?.root?.IR?.modelDefs || [];
        // When generating schema.zod.ts, use local SchemaTypes namespace
        // The template name is passed in the root context
        const useLocalSchemaTypes =
          options?.data?.root?._templateName === "schema.zod.ts.hbs";
        return new Handlebars.SafeString(
          schemaToSchema(x, "", modelDefs, useLocalSchemaTypes)
        );
      }
      return "schema.unknown()";
    });
    // Streaming helpers
    Handlebars.registerHelper("isStreaming", (op: any) => {
      return isStreamingOperation(op);
    });
    Handlebars.registerHelper("streamingItemType", (op: any) => {
      return new Handlebars.SafeString(getStreamingItemType(op));
    });
  }

  private async renderTemplate(
    templateName: string,
    data: any,
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
          "utf-8"
        );
        const template = Handlebars.compile(templateContent);
        // Add template name to context so helpers know which template is being rendered
        const contextWithTemplate = {
          ...data,
          _templateName: templateName,
        };
        const rendered = template(contextWithTemplate);
        await fs.promises.writeFile(outputPath, rendered, "utf-8");
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
    // Note: When bundled by tsup, __dirname will be 'dist', so we need to look for templates
    // in dist/generator/typescript/templates/
    const possiblePaths = [
      path.join(__dirname, "generator/typescript/templates", templateName), // Bundled: dist/generator/typescript/templates/
      path.join(__dirname, "templates", templateName), // If __dirname is dist/generator/typescript/
      path.join(__dirname, "../typescript/templates", templateName), // Fallback
      path.join(
        process.cwd(),
        "src/generator/typescript/templates",
        templateName
      ), // Development
    ];

    let templatePath: string | null = null;
    for (const possiblePath of possiblePaths) {
      try {
        await fs.promises.access(possiblePath);
        templatePath = possiblePath;
        this.logger.debug(`Found template at: ${templatePath}`);
        break;
      } catch (error) {
        this.logger.debug(`Template not found at: ${possiblePath}`);
        // Continue to next path
      }
    }

    if (!templatePath) {
      this.logger.error(`Template not found: ${templateName}`);
      this.logger.error(`Checked paths: ${possiblePaths.join(", ")}`);
      this.logger.error(`__dirname: ${__dirname}`);
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateContent = await fs.promises.readFile(templatePath, "utf-8");
    const template = Handlebars.compile(templateContent);
    // Add template name to context so helpers know which template is being rendered
    const contextWithTemplate = {
      ...data,
      _templateName: templateName,
    };
    const rendered = template(contextWithTemplate);
    await fs.promises.writeFile(outputPath, rendered, "utf-8");
  }

  private async generateClient(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<void> {
    const clientPath = path.join(srcDir, "client.ts");
    if (this.configService.shouldExcludeFile(client, clientPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "client.ts.hbs",
        { Client: client, IR: ir },
        clientPath,
        client
      );
    } catch (error) {
      // Fallback if template doesn't exist yet
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template client.ts.hbs not found: ${errorMsg}, using placeholder`
      );
      const content = `// Generated client - template rendering to be implemented`;
      await fs.promises.writeFile(clientPath, content, "utf-8");
    }
  }

  private async generateIndex(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<void> {
    const indexPath = path.join(srcDir, "index.ts");
    if (this.configService.shouldExcludeFile(client, indexPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "index.ts.hbs",
        { Client: client, IR: ir },
        indexPath,
        client
      );
    } catch (error) {
      this.logger.warn(`Template index.ts.hbs not found, using placeholder`);
      const content = `// Generated index - template rendering to be implemented`;
      await fs.promises.writeFile(indexPath, content, "utf-8");
    }
  }

  private async generateUtils(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<void> {
    const utilsPath = path.join(srcDir, "utils.ts");
    if (this.configService.shouldExcludeFile(client, utilsPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "utils.ts.hbs",
        { Client: client, IR: ir },
        utilsPath,
        client
      );
    } catch (error) {
      this.logger.warn(`Template utils.ts.hbs not found, using placeholder`);
      const content = `// Generated utils - template rendering to be implemented`;
      await fs.promises.writeFile(utilsPath, content, "utf-8");
    }
  }

  private async generateServices(
    client: TypeScriptClient,
    ir: IR,
    servicesDir: string
  ): Promise<void> {
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
          "service.ts.hbs",
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
      } catch (error) {
        this.logger.warn(
          `Template service.ts.hbs not found, using placeholder`
        );
        const content = `// Generated service ${service.tag} - template rendering to be implemented`;
        await fs.promises.writeFile(servicePath, content, "utf-8");
      }
    }
  }

  private async generateSchema(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<void> {
    const schemaPath = path.join(srcDir, "schema.ts");
    if (this.configService.shouldExcludeFile(client, schemaPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "schema.ts.hbs",
        {
          Client: client,
          IR: ir,
          PredefinedTypes: client.predefinedTypes || [],
          isSameFile: true, // Types in schema.ts are in the same file
        },
        schemaPath,
        client
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template schema.ts.hbs error: ${errorMsg}, using placeholder`
      );
      const content = `// Generated schema - template rendering to be implemented`;
      await fs.promises.writeFile(schemaPath, content, "utf-8");
    }
  }

  private async generateZodSchema(
    client: TypeScriptClient,
    ir: IR,
    srcDir: string
  ): Promise<void> {
    const zodSchemaPath = path.join(srcDir, "schema.zod.ts");
    if (this.configService.shouldExcludeFile(client, zodSchemaPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "schema.zod.ts.hbs",
        { Client: client, IR: ir },
        zodSchemaPath,
        client
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Template schema.zod.ts.hbs error: ${errorMsg}, using placeholder`
      );
      const content = `// Generated Zod schemas - template rendering to be implemented`;
      await fs.promises.writeFile(zodSchemaPath, content, "utf-8");
    }
  }

  private async generatePackageJson(client: TypeScriptClient): Promise<void> {
    const packageJsonPath = path.join(client.outDir, "package.json");
    if (this.configService.shouldExcludeFile(client, packageJsonPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "package.json.hbs",
        { Client: client },
        packageJsonPath,
        client
      );
    } catch (error) {
      this.logger.warn(`Template package.json.hbs not found, using fallback`);
      const content = JSON.stringify(
        {
          name: client.packageName,
          version: "0.0.1",
          main: "dist/index.js",
          types: "dist/index.d.ts",
        },
        null,
        2
      );
      await fs.promises.writeFile(packageJsonPath, content, "utf-8");
    }
  }

  private async generateTsConfig(client: TypeScriptClient): Promise<void> {
    const tsConfigPath = path.join(client.outDir, "tsconfig.json");
    if (this.configService.shouldExcludeFile(client, tsConfigPath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "tsconfig.json.hbs",
        { Client: client },
        tsConfigPath,
        client
      );
    } catch (error) {
      this.logger.warn(`Template tsconfig.json.hbs not found, using fallback`);
      const content = JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            lib: ["ES2020"],
            declaration: true,
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
          },
          include: ["src/**/*"],
        },
        null,
        2
      );
      await fs.promises.writeFile(tsConfigPath, content, "utf-8");
    }
  }

  private async generateReadme(
    client: TypeScriptClient,
    ir: IR
  ): Promise<void> {
    const readmePath = path.join(client.outDir, "README.md");
    if (this.configService.shouldExcludeFile(client, readmePath)) {
      return;
    }
    try {
      await this.renderTemplate(
        "README.md.hbs",
        { Client: client, IR: ir },
        readmePath,
        client
      );
    } catch (error) {
      this.logger.warn(`Template README.md.hbs not found, using fallback`);
      const content = `# ${client.name}\n\nGenerated SDK from OpenAPI specification.`;
      await fs.promises.writeFile(readmePath, content, "utf-8");
    }
  }
}
