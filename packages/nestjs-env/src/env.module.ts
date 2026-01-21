import {
  type DynamicModule,
  Global,
  Module,
  type Provider,
  type InjectionToken,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { z } from 'zod';

import { ENVIRONMENT_VARIABLES } from './env.const';
import {
  ConfigurableModuleClass,
  ENV_MODULE_OPTIONS_TOKEN,
} from './env.module-definition';
import { getEnvironmentFilePaths } from './env.utils';

/**
 * Type guard to check if the module option is a class created by createEnvironmentVariables
 */
function isEnvironmentVariablesClass(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: z.ZodTypeAny | (new (values: any) => any)
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
option is new (values: any) => any {
  return typeof option === 'function' && '__schema' in option;
}

/**
 * Extract the Zod schema from either a direct schema or a class created by createEnvironmentVariables
 */
function getSchemaFromOption(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: z.ZodTypeAny | (new (values: any) => any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): z.ZodObject<any> {
  if (isEnvironmentVariablesClass(option)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (option as any).__schema;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return option as z.ZodObject<any>;
}

@Global()
@Module({})
export class EnvModule extends ConfigurableModuleClass {
  static register(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option: z.ZodTypeAny | (new (values: any) => any)
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: ENVIRONMENT_VARIABLES,
        inject: [ENV_MODULE_OPTIONS_TOKEN, ConfigService],
        useFactory(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          moduleOption: z.ZodTypeAny | (new (values: any) => any),
          configService: ConfigService
        ) {
          const type = getSchemaFromOption(moduleOption);
          const env = Object.fromEntries(
            Object.keys(type.shape).map((key) => {
              // try to get from ConfigService (env files)
              // if not exists, return undefined to Zod apply the default
              const value = configService.get(key, { infer: true });
              return [key, value];
            })
          );

          if (process.env.IS_EXTRACTING_SCHEMA) {
            // make every field optional when extracting schema
            return type.partial().parse(env);
          }

          const parsed = type.parse(env);

          // If it's a class, instantiate it; otherwise return the plain object
          if (isEnvironmentVariablesClass(moduleOption)) {
            return new moduleOption(parsed);
          }

          return parsed;
        },
      },
    ];

    const exports: InjectionToken[] = [ENVIRONMENT_VARIABLES];

    // If it's a class, also register it as a provider and export it
    if (isEnvironmentVariablesClass(option)) {
      providers.push({
        provide: option,
        inject: [ENVIRONMENT_VARIABLES],
        useFactory: (envValues: InjectionToken) => envValues,
      });
      exports.push(option);
    }

    return {
      module: EnvModule,
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: process.env.NODE_ENV === 'production',
          envFilePath: getEnvironmentFilePaths(process.env.NODE_ENV),
          cache: false,
        }),
      ],
      providers: [
        {
          provide: ENV_MODULE_OPTIONS_TOKEN,
          useValue: option,
        },
        ...providers,
      ],
      exports,
    };
  }
}
