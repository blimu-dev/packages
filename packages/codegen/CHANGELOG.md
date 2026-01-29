# @blimu/codegen

## 0.5.2

### Patch Changes

- 88cd5a2: Patch release: replace-workspace-deps script, release workflow, and related tooling
- Patch release

## 0.5.1

### Patch Changes

- 6a1395e: Fix tsup.config template to use explicit entry points instead of glob pattern for better build output

## 0.5.0

### Minor Changes

- fedf7cd: ### Improvements
  - Enhanced type handling in codegen helpers
  - Improved template compatibility
  - Added additional test coverage

## 0.4.1

### Patch Changes

- d063379: Fix Prettier formatting to only format files that were explicitly generated, rather than using glob patterns that could format unintended files. This makes the formatter safer and more explicit.

## 0.4.0

### Minor Changes

- 37830ba: Add `srcDir` configuration option to customize the source directory path for generated SDK output. This allows placing generated code in subdirectories like `src/sdk` instead of the default `src`.

## 0.3.1

### Patch Changes

- Fix typecheck in integration tests to handle missing external dependencies gracefully.
  - Made typecheck filter out TS2307 errors (module not found) for external dependencies
  - Allows predefined-types tests to pass when external packages aren't installed
  - Still catches actual type errors in generated code
  - All integration tests now run typecheck on generated SDKs

## 0.3.0

### Minor Changes

- Refactor authentication configuration to use `authStrategies` directly instead of nested `auth: { strategies: [...] }`. This simplifies the API and merging logic.
  - Changed `auth?: AuthConfig` to `authStrategies?: AuthStrategy[]` in FetchClientConfig
  - Removed `CoreClient` wrapper class - services now use `FetchClient` directly
  - Added `buildAuthStrategies` utility function for building auth strategies from OpenAPI security schemes
  - Improved body type safety - removed need for `body as any` casts in generated services
  - Added `SerializableBody` type that accepts plain objects/arrays for JSON serialization
  - Made `index.ts` generation conditional (only generated once, safe to customize)
  - Added conditional imports for auth strategy types based on security schemes
  - Added `isNotUndefined` utility for filtering undefined values from query keys

### Patch Changes

- 533c712: - Fix: Add post-command execution to programmatic API (was only working in CLI)
  - Fix: Add comprehensive tests for post-command execution
  - Fix: Reduce Prettier log noise by using --loglevel=error flag
  - Fix: Correct import paths in post-command tests
  - Fix: Update tsconfig template with better defaults (ES2022, Bundler module resolution, strict mode)
  - Fix: Move @blimu/fetch to devDependencies (not needed at runtime)
  - Fix: Widen NestJS version range to ^11.1.0 to avoid conflicts
  - Fix: Remove unused Schema import from schema.zod.ts template
  - Fix: Use zodSchema helper for ref types in schema.zod.ts template
