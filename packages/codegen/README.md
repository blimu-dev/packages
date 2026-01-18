# @blimu/codegen

A powerful TypeScript library and CLI tool for generating type-safe SDKs from OpenAPI specifications. Built with NestJS Commander and following NestJS conventions.

## Features

- 🚀 **Multiple Language Support**: TypeScript, Go, Python (with more planned)
- 📝 **OpenAPI 3.x Support**: Full support for modern OpenAPI specifications
- 🎯 **Tag Filtering**: Include/exclude specific API endpoints by tags
- 🔧 **Highly Configurable**: Flexible configuration via MJS config files with TypeScript hints
- 📦 **Library & CLI**: Use as a TypeScript library or standalone CLI tool
- 🎨 **Beautiful Generated Code**: Clean, idiomatic code with excellent TypeScript types
- ⚡ **Function-Based Transforms**: Use JavaScript functions for operationId transformation with full type safety

## Installation

```bash
yarn add @blimu/codegen
# or
npm install @blimu/codegen
```

## CLI Usage

### Using Command Line Arguments

```bash
# Generate TypeScript SDK from OpenAPI spec
codegen generate \
  --input https://petstore3.swagger.io/api/v3/openapi.json \
  --type typescript \
  --out ./petstore-sdk \
  --package-name petstore-client \
  --client-name PetStoreClient
```

### Using Configuration File

The CLI automatically looks for `chunkflow-codegen.config.mjs` in the current directory and parent directories. You can also specify a custom path:

```bash
# Auto-discover chunkflow-codegen.config.mjs
codegen generate

# Use explicit config file path
codegen generate --config ./chunkflow-codegen.config.mjs

# Generate only a specific client from config
codegen generate --client MyClient
```

### Configuration File Example

Create `chunkflow-codegen.config.mjs` in your project root:

```javascript
// @ts-check
import { defineConfig } from '@blimu/codegen';

export default defineConfig({
  spec: 'http://localhost:3020/docs/backend-api/json',
  clients: [
    {
      type: 'typescript',
      outDir: './my-sdk',
      packageName: 'my-sdk',
      name: 'MyClient',
      operationIdParser: (operationId, method, path) => {
        // Custom transform logic
        return operationId.replace(/Controller/g, '');
      },
    },
  ],
});
```

The `// @ts-check` directive enables TypeScript type checking and autocomplete in your config file!

See `examples/chunkflow-codegen.config.mjs.example` for a complete example with all available options.

## Programmatic API

Use the codegen library programmatically in your TypeScript code:

```typescript
import { generate, loadConfig, defineConfig } from '@blimu/codegen';

// Generate from config object
await generate({
  spec: 'http://localhost:3020/docs/backend-api/json',
  clients: [
    {
      type: 'typescript',
      outDir: './my-sdk',
      packageName: 'my-sdk',
      name: 'MyClient',
      operationIdParser: (operationId, method, path) => {
        return operationId.replace(/Controller/g, '');
      },
    },
  ],
});

// Generate from config file path
await generate('./chunkflow-codegen.config.mjs');

// Generate only a specific client
await generate('./chunkflow-codegen.config.mjs', { client: 'MyClient' });

// Load config programmatically
const config = await loadConfig('./chunkflow-codegen.config.mjs');
```

## Configuration Options

### Top-Level Config

- `spec` (required): OpenAPI spec file path or URL
- `name` (optional): Name for this configuration
- `clients` (required): Array of client configurations

### Client Configuration

- `type` (required): Generator type (e.g., `'typescript'`)
- `outDir` (required): Output directory for generated SDK
- `packageName` (required): Package name for the generated SDK
- `name` (required): Client class name
- `moduleName` (optional): Module name for type augmentation generators
- `includeTags` (optional): Array of regex patterns for tags to include
- `excludeTags` (optional): Array of regex patterns for tags to exclude
- `includeQueryKeys` (optional): Generate query key helper methods
- `operationIdParser` (optional): Function to transform operationId to method name
  - Signature: `(operationId: string, method: string, path: string) => string | Promise<string>`
- `preCommand` (optional): Commands to run before SDK generation
- `postCommand` (optional): Commands to run after SDK generation
- `defaultBaseURL` (optional): Default base URL for the client
- `exclude` (optional): Array of file paths to exclude from generation

## License

MIT
