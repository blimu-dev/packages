import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import { OpenApiService } from "../openapi/openapi.service";

interface ValidateOptions {
  input: string;
}

@Injectable()
@Command({
  name: "validate",
  description: "Validate an OpenAPI spec",
})
export class ValidateCommand extends CommandRunner {
  private readonly logger = new Logger(ValidateCommand.name);

  constructor(private readonly openApiService: OpenApiService) {
    super();
  }

  async run(passedParams: string[], options: ValidateOptions): Promise<void> {
    try {
      if (!options.input) {
        this.logger.error("❌ Error: --input is required");
        process.exit(1);
      }

      this.logger.log(`Validating OpenAPI spec: ${options.input}`);
      await this.openApiService.validateDocument(options.input);
      this.logger.log("✅ OpenAPI spec is valid");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Invalid OpenAPI spec: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
      process.exit(1);
    }
  }

  @Option({
    flags: "--input <path>",
    description: "OpenAPI spec file or URL (yaml/json)",
    required: true,
  })
  parseInput(value: string): string {
    return value;
  }
}
