# @blimu/fetch

## 0.4.0

### Minor Changes

- fedf7cd: ### Improvements
  - Improved request utility handling

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
