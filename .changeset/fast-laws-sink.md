---
'@blimu/codegen': patch
---

- Fix: Add post-command execution to programmatic API (was only working in CLI)
- Fix: Add comprehensive tests for post-command execution
- Fix: Reduce Prettier log noise by using --loglevel=error flag
- Fix: Correct import paths in post-command tests
- Fix: Update tsconfig template with better defaults (ES2022, Bundler module resolution, strict mode)
- Fix: Move @blimu/fetch to devDependencies (not needed at runtime)
- Fix: Widen NestJS version range to ^11.1.0 to avoid conflicts
- Fix: Remove unused Schema import from schema.zod.ts template
- Fix: Use zodSchema helper for ref types in schema.zod.ts template
