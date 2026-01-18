---
"@blimu/codegen": patch
---

Fix Prettier formatting to only format files that were explicitly generated, rather than using glob patterns that could format unintended files. This makes the formatter safer and more explicit.
