# @blimu/codegen

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
