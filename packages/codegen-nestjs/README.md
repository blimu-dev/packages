# @blimu/codegen-nestjs

NestJS module for automatically generating type-safe SDKs from OpenAPI specifications.

## Installation

```bash
npm install @blimu/codegen-nestjs @blimu/codegen
# or
yarn add @blimu/codegen-nestjs @blimu/codegen
# or
pnpm add @blimu/codegen-nestjs @blimu/codegen
```

## Requirements

- Node.js >= 18.0.0
- NestJS >= 10.0.0

## Usage

### Basic Setup

Import the `CodegenModule` in your NestJS application:

```typescript
import { Module } from '@nestjs/common';
import { CodegenModule } from '@blimu/codegen-nestjs';

@Module({
  imports: [
    CodegenModule.forRoot({
      enabled: process.env.NODE_ENV === 'development',
      configs: [
        {
          name: 'platform-sdk',
          specUrl: 'http://localhost:3000/api/openapi.json',
          config: './blimu-codegen.config.mjs',
        },
      ],
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

For dynamic configuration (e.g., from ConfigService):

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CodegenModule } from '@blimu/codegen-nestjs';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CodegenModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        enabled: configService.get('NODE_ENV') === 'development',
        configs: [
          {
            name: 'platform-sdk',
            specUrl: configService.get('OPENAPI_SPEC_URL'),
            config: './blimu-codegen.config.mjs',
          },
        ],
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Configuration Options

```typescript
interface CodegenModuleOptions {
  // Enable/disable SDK regeneration (default: true in development)
  enabled?: boolean;

  // Directory for cache files (default: process.cwd())
  cacheDir?: string;

  // Maximum retry attempts for fetching OpenAPI specs (default: 5)
  maxRetries?: number;

  // Delay between retries in milliseconds (default: 1000)
  retryDelay?: number;

  // SDK generation configurations
  configs: CodegenConfig[];

  // Disable caching (default: false)
  disableCache?: boolean;
}

interface CodegenConfig {
  // Unique name for this SDK configuration
  name: string;

  // URL to fetch the OpenAPI specification from
  specUrl: string;

  // Path to the codegen configuration file
  config: string;
}
```

## How It Works

1. **On Application Bootstrap**: The module checks if SDK regeneration is enabled
2. **Hash Comparison**: It fetches the OpenAPI spec and compares it with cached hashes
3. **Automatic Regeneration**: If the spec or config has changed, it automatically regenerates the SDK
4. **Caching**: Uses file-based caching to avoid unnecessary regenerations

## Features

- ✅ Automatic SDK regeneration on application startup
- ✅ Smart caching to avoid unnecessary regenerations
- ✅ Retry logic for fetching OpenAPI specs
- ✅ Works seamlessly with NestJS dependency injection
- ✅ Supports both synchronous and asynchronous configuration
- ✅ Development mode only (disabled in production by default)

## License

MIT
