import type {
  DynamicModule,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { CodegenService } from './codegen.service';
import type { CodegenModuleOptions } from './codegen.types';

@Module({})
export class CodegenModule {
  static forRoot(options: CodegenModuleOptions): DynamicModule {
    return {
      module: CodegenModule,
      providers: [
        {
          provide: CodegenService,
          useFactory: () => new CodegenService(options),
        },
      ],
      exports: [CodegenService],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) => Promise<CodegenModuleOptions> | CodegenModuleOptions;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    return {
      module: CodegenModule,
      providers: [
        {
          provide: CodegenService,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args);
            return new CodegenService(config);
          },
          inject: options.inject || ([] as unknown as InjectionToken[]),
        },
      ],
      exports: [CodegenService],
    };
  }
}
