import { Injectable, Logger } from '@nestjs/common';
import type { Client } from '../config/config.schema';
import type { Generator } from './generator.interface';
import { IrBuilderService } from './ir-builder.service';
import { OpenApiService } from '../openapi/openapi.service';

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);
  private readonly generators = new Map<string, Generator>();

  constructor(
    private readonly irBuilder: IrBuilderService,
    private readonly openApiService: OpenApiService
  ) {}

  /**
   * Register a generator
   */
  register<TClient extends Client>(generator: Generator<TClient>): void {
    this.generators.set(generator.getType(), generator as Generator);
    this.logger.debug(`Registered generator: ${generator.getType()}`);
  }

  /**
   * Get a generator by type
   */
  getGenerator(type: string): Generator | undefined {
    return this.generators.get(type);
  }

  /**
   * Get all available generator types
   */
  getAvailableTypes(): string[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Generate SDK for a client
   * TypeScript will narrow the client type based on the discriminated union
   */
  async generate(spec: string, client: Client): Promise<void> {
    const generator = this.getGenerator(client.type);
    if (!generator) {
      throw new Error(`Unsupported client type: ${client.type}`);
    }

    // Load OpenAPI document
    const doc = await this.openApiService.loadDocument(spec);
    // Build IR
    const fullIR = this.irBuilder.buildIR(doc);
    // Filter IR based on client configuration
    const filteredIR = this.irBuilder.filterIR(fullIR, client);
    // Generate - TypeScript will ensure type safety through the discriminated union
    // The generator's generate method will receive the correctly narrowed client type
    await generator.generate(client, filteredIR);
  }
}
