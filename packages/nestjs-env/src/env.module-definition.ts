import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { z } from 'zod';

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: ENV_MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  z.ZodTypeAny | (new (values: any) => any)
>().build();
