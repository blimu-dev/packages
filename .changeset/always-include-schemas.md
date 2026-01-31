---
'@blimu/codegen': patch
---

Add `alwaysIncludeSchemas` client option so component schemas that are not referenced by any operation (e.g. `OAuthAccessTokenPayload`) are still included in the generated SDK. This allows API specs to expose types for documentation and SDK consumers without attaching them to an endpoint.
