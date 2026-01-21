# @blimu/nestjs-env

Type-safe environment variable management for NestJS using Zod schemas. Validate and inject environment variables with full TypeScript support.

## Installation

```bash
npm install @blimu/nestjs-env @nestjs/config zod
# or
yarn add @blimu/nestjs-env @nestjs/config zod
# or
pnpm add @blimu/nestjs-env @nestjs/config zod
```

## Requirements

- Node.js >= 18.0.0
- NestJS >= 11.0.0
- Zod >= 3.0.0

## Usage

### Basic Setup with Zod Schema

Define your environment variables using a Zod schema and register the module:

```typescript
import { Module } from '@nestjs/common';
import { EnvModule, ENVIRONMENT_VARIABLES } from '@blimu/nestjs-env';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  API_KEY: z.string().min(1),
});

@Module({
  imports: [EnvModule.register(envSchema)],
})
export class AppModule {}
```

Inject validated environment variables in your services:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ENVIRONMENT_VARIABLES } from '@blimu/nestjs-env';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

type EnvironmentVariables = z.infer<typeof envSchema>;

@Injectable()
export class AppService {
  constructor(
    @Inject(ENVIRONMENT_VARIABLES)
    private readonly env: EnvironmentVariables
  ) {}

  getDatabaseUrl() {
    return this.env.DATABASE_URL; // Fully typed!
  }
}
```

### Using Class-Based Environment Variables

For better type safety and IDE support, use the `createEnvironmentVariables` factory:

```typescript
import { Module } from '@nestjs/common';
import { EnvModule, createEnvironmentVariables } from '@blimu/nestjs-env';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

const EnvironmentVariables = createEnvironmentVariables(envSchema);

@Module({
  imports: [EnvModule.register(EnvironmentVariables)],
})
export class AppModule {}
```

Inject the class directly in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { EnvironmentVariables } from './app.module';

@Injectable()
export class AppService {
  constructor(private readonly env: EnvironmentVariables) {}

  getDatabaseUrl() {
    return this.env.DATABASE_URL; // Fully typed with class instance!
  }
}
```

## Features

- ✅ **Type-safe**: Full TypeScript support with inferred types from Zod schemas
- ✅ **Validation**: Automatic validation of environment variables on application startup
- ✅ **Default values**: Support for default values via Zod
- ✅ **Environment files**: Automatic loading of `.env` and `.env.{NODE_ENV}` files
- ✅ **Class-based**: Optional class-based injection for better IDE support
- ✅ **Global module**: Register once, use anywhere in your application
- ✅ **Production-ready**: Ignores `.env` files in production (uses system environment variables)

## Environment File Loading

The module automatically loads environment files in the following order:

1. `.env.{NODE_ENV}` (e.g., `.env.development`, `.env.production`)
2. `.env`

Files are loaded relative to the current working directory (`process.cwd()`).

**Note**: In production (`NODE_ENV=production`), `.env` files are ignored and only system environment variables are used.

## Schema Validation

All environment variables are validated against your Zod schema on application startup. If validation fails, the application will not start and you'll get a clear error message indicating which variables are missing or invalid.

### Example Schema with Validation

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Required string
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Number with coercion and default
  PORT: z.coerce.number().int().positive().default(3000),

  // Enum with default
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Optional string
  API_KEY: z.string().optional(),

  // Boolean with coercion
  ENABLE_LOGGING: z.coerce.boolean().default(true),

  // Array of strings
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(',')),
});
```

## API Reference

### `EnvModule.register(schema | class)`

Registers the environment module with a Zod schema or a class created by `createEnvironmentVariables`.

**Parameters:**

- `schema`: A Zod object schema (`z.ZodObject`)
- `class`: A class created by `createEnvironmentVariables()`

**Returns:** `DynamicModule`

### `createEnvironmentVariables(schema)`

Factory function that creates a class from a Zod schema for better type safety.

**Parameters:**

- `schema`: A Zod object schema (`z.ZodObject`)

**Returns:** A class constructor that can be used as a NestJS provider

### `ENVIRONMENT_VARIABLES`

Injection token for accessing validated environment variables when using schema-based registration.

## License

MIT
