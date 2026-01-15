import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import { ConfigService } from "../config/config.service";
import { GeneratorService } from "../generator/generator.service";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

interface GenerateOptions {
  config?: string;
  client?: string;
  input?: string;
  type?: string;
  out?: string;
  "package-name"?: string;
  "client-name"?: string;
  "include-tags"?: string[];
  "exclude-tags"?: string[];
}

@Injectable()
@Command({
  name: "generate",
  description: "Generate client SDKs from OpenAPI specifications",
  aliases: ["gen"],
})
export class GenerateCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateCommand.name);

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async run(passedParams: string[], options: GenerateOptions): Promise<void> {
    try {
      let config: any = null;
      let configPath: string | null = null;

      // Debug: log received options
      this.logger.debug(`Received options: ${JSON.stringify(options)}`);

      // Config lookup order:
      // 1. --config flag (explicit)
      // 2. chunkflow-codegen.config.mjs in current directory and parents
      // 3. Fall back to CLI arguments only

      if (options.config) {
        // Explicit config file
        configPath = options.config;
        config = await this.configService.load(configPath);
      } else {
        // Try to find default config file
        const defaultConfigPath = await this.configService.findDefaultConfig();
        if (defaultConfigPath) {
          this.logger.debug(`Found default config file: ${defaultConfigPath}`);
          configPath = defaultConfigPath;
          config = await this.configService.load(defaultConfigPath);
        }
      }

      // If we have CLI args, merge them with config (CLI takes precedence)
      if (
        options.input &&
        options.type &&
        options.out &&
        (options["package-name"] || (options as any).packageName) &&
        (options["client-name"] || (options as any).clientName)
      ) {
        const packageName =
          options["package-name"] || (options as any).packageName;
        const clientName =
          options["client-name"] || (options as any).clientName;

        // If we have a config, merge CLI args; otherwise create new config
        if (config) {
          // Merge: CLI args override config values
          config.spec = options.input;
          if (config.clients.length > 0) {
            // Update first client with CLI args
            // For discriminated unions, we need to reconstruct the object with the correct type
            const existingClient = config.clients[0];
            if (options.type === "typescript") {
              config.clients[0] = {
                ...existingClient,
                type: "typescript",
                outDir: path.resolve(options.out),
                packageName: packageName,
                name: clientName,
                includeTags:
                  options["include-tags"] || (options as any).includeTags,
                excludeTags:
                  options["exclude-tags"] || (options as any).excludeTags,
              };
            } else {
              // For other generator types, preserve their specific properties
              config.clients[0] = {
                ...existingClient,
                type: options.type,
                outDir: path.resolve(options.out),
                name: clientName,
                includeTags:
                  options["include-tags"] || (options as any).includeTags,
                excludeTags:
                  options["exclude-tags"] || (options as any).excludeTags,
              } as any; // Type assertion needed for unknown generator types
            }
          } else {
            // No clients in config, add one from CLI args
            if (options.type === "typescript") {
              config.clients.push({
                type: "typescript",
                outDir: path.resolve(options.out),
                packageName: packageName,
                name: clientName,
                includeTags:
                  options["include-tags"] || (options as any).includeTags,
                excludeTags:
                  options["exclude-tags"] || (options as any).excludeTags,
              });
            } else {
              // For other generator types, create minimal client
              // This will need to be updated when other generators are added
              throw new Error(`Unsupported client type: ${options.type}`);
            }
          }
        } else {
          // No config found, create from CLI args only
          if (options.type === "typescript") {
            config = {
              spec: options.input,
              name: clientName,
              clients: [
                {
                  type: "typescript",
                  outDir: path.resolve(options.out),
                  packageName: packageName,
                  name: clientName,
                  includeTags:
                    options["include-tags"] || (options as any).includeTags,
                  excludeTags:
                    options["exclude-tags"] || (options as any).excludeTags,
                },
              ],
            };
          } else {
            throw new Error(`Unsupported client type: ${options.type}`);
          }
        }
      } else if (!config) {
        // No config file and no CLI args
        this.logger.error(
          "❌ Error: Either --config, chunkflow-codegen.config.mjs, or all fallback options (--input, --type, --out, --package-name, --client-name) must be provided"
        );
        process.exit(1);
      }

      // Generate for each client
      for (const client of config.clients) {
        if (options.client && client.name !== options.client) {
          continue;
        }

        // Ensure output directory exists before pre-commands
        await fs.promises.mkdir(client.outDir, { recursive: true });

        // Execute pre-generation commands if specified
        await this.executePreCommands(client);

        // Generate the SDK
        this.logger.log(`Generating ${client.type} SDK for ${client.name}...`);
        await this.generatorService.generate(config.spec, client);

        // Execute post-generation commands if specified
        await this.executePostGenCommands(client);

        this.logger.log(`✅ SDK generated successfully for ${client.name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error during SDK generation: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
      process.exit(1);
    }
  }

  @Option({
    flags: "-c, --config <path>",
    description: "Path to chunkflow-codegen.config.mjs config file",
  })
  parseConfig(value: string): string {
    return value;
  }

  @Option({
    flags: "--client <name>",
    description: "Generate only the named client from config",
  })
  parseClient(value: string): string {
    return value;
  }

  @Option({
    flags: "--input <path>",
    description: "OpenAPI spec file or URL (yaml/json)",
  })
  parseInput(value: string): string {
    return value;
  }

  @Option({
    flags: "--type <type>",
    description: "Client type (e.g., typescript)",
  })
  parseType(value: string): string {
    return value;
  }

  @Option({
    flags: "--out <dir>",
    description: "Output directory",
  })
  parseOut(value: string): string {
    return value;
  }

  @Option({
    flags: "--package-name <name>",
    description: "Package name",
  })
  parsePackageName(value: string): string {
    return value;
  }

  @Option({
    flags: "--client-name <name>",
    description: "Client class name",
  })
  parseClientName(value: string): string {
    return value;
  }

  @Option({
    flags: "--include-tags <tags>",
    description:
      "Regex patterns for tags to include (can be specified multiple times)",
  })
  parseIncludeTags(value: string, previous: string[] = []): string[] {
    return [...previous, value];
  }

  @Option({
    flags: "--exclude-tags <tags>",
    description:
      "Regex patterns for tags to exclude (can be specified multiple times)",
  })
  parseExcludeTags(value: string, previous: string[] = []): string[] {
    return [...previous, value];
  }

  private async executePreCommands(client: any): Promise<void> {
    const command = this.configService.getPreCommand(client);
    if (command.length === 0) {
      return;
    }
    await this.executeCommand(command, client.outDir, "pre-command");
  }

  private async executePostGenCommands(client: any): Promise<void> {
    const command = this.configService.getPostCommand(client);
    if (command.length === 0) {
      return;
    }
    await this.executeCommand(command, client.outDir, "post-command");
  }

  private async executeCommand(
    command: string[],
    cwd: string,
    label: string
  ): Promise<void> {
    try {
      const [cmd, ...args] = command;
      this.logger.debug(`Executing ${label}: ${cmd} ${args.join(" ")}`);
      const { stdout, stderr } = await execAsync(
        `${cmd} ${args.map((a) => `"${a}"`).join(" ")}`,
        {
          cwd,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );
      if (stdout) {
        this.logger.debug(stdout);
      }
      if (stderr && !stderr.includes("warning")) {
        this.logger.warn(stderr);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`${label} failed: ${errorMessage}`);
    }
  }
}
