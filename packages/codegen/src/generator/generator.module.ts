import { Module } from "@nestjs/common";
import { GeneratorService } from "./generator.service";
import { IrBuilderService } from "./ir-builder.service";
import { SchemaConverterService } from "./schema-converter.service";
import { OpenApiModule } from "../openapi/openapi.module";
import { ConfigModule } from "../config/config.module";
import { TypeScriptGeneratorService } from "./typescript/typescript-generator.service";

@Module({
  imports: [OpenApiModule, ConfigModule],
  providers: [
    GeneratorService,
    IrBuilderService,
    SchemaConverterService,
    TypeScriptGeneratorService,
  ],
  exports: [GeneratorService, IrBuilderService, SchemaConverterService],
})
export class GeneratorModule {
  constructor(
    private readonly generatorService: GeneratorService,
    private readonly typeScriptGenerator: TypeScriptGeneratorService
  ) {
    // Register default generators
    this.generatorService.register(this.typeScriptGenerator);
  }
}
