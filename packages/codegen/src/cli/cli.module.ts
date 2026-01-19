import { Module } from '@nestjs/common';
import { GenerateCommand } from './generate.command';
import { ValidateCommand } from './validate.command';
import { GeneratorModule } from '../generator/generator.module';
import { ConfigModule } from '../config/config.module';
import { OpenApiModule } from '../openapi/openapi.module';

@Module({
  imports: [ConfigModule, GeneratorModule, OpenApiModule],
  providers: [GenerateCommand, ValidateCommand],
})
export class CliModule {}
