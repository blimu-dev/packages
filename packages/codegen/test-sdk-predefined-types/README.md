# TestClient TypeScript SDK

This is an auto-generated TypeScript/JavaScript SDK for the TestClient API.

## Installation

```bash
npm install test-sdk
# or
yarn add test-sdk
```

## Quick Start

```typescript
import { TestClientClient } from 'test-sdk';

// Create a new client
const client = new TestClientClient({
  baseURL: '',
  timeoutMs: 10000,
  retry: {
    retries: 2,
    strategy: 'exponential',
    backoffMs: 300,
    retryOn: [429, 500, 502, 503, 504],
  },
  // Auth configuration
  authStrategies: [
    {
      type: 'bearer',
      token: process.env.API_TOKEN,
    },
  ],
});

// Example: Check if a user has a specific entitlement on a resource
try {
  const result = await client.entitlements.checkEntitlement({
    // Request body data
  });
  console.log('Result:', result);
} catch (error) {
  // FetchError with structured data
  console.error(error);
}
// Example: List resources
try {
  const result = await client.resources.list('resourceType', {});
  console.log('Result:', result);
} catch (error) {
  // FetchError with structured data
  console.error(error);
}
// Example: Get wallet balance
try {
  const result = await client.usage.getBalance('resourceType', 'resourceId', 'limitType', {
    period: undefined,
  });
  console.log('Result:', result);
} catch (error) {
  // FetchError with structured data
  console.error(error);
}
```

## TypeScript Support

This SDK is written in TypeScript and provides full type safety:

```typescript
import { TestClientClient, Schema } from 'test-sdk';

const client = new TestClientClient({
  /* config */
});

// All methods are fully typed
// Schema types are available
const data: Schema.BalanceResponse = {
  // Fully typed object
};
```

## Node.js Usage

For Node.js environments, you may need to provide a fetch implementation:

```bash
npm install undici
```

```typescript
import { fetch } from 'undici';
import { TestClientClient } from 'test-sdk';

const client = new TestClientClient({
  baseURL: '',
  fetch,
});
```

## Models and Types

The SDK includes the following TypeScript interfaces:

- **BalanceResponse**
- **EntitlementCheckBody**
- **EntitlementCheckResult**
- **EntitlementType**: Entitlement identifier
- **ResourceList**
- **ResourceType**: Resource type identifier
- **UsageLimitType**: Usage-based limit type identifier

All types are available under the `Schema` namespace:

```typescript
import { Schema } from 'test-sdk';

// Use any model type
const user: Schema.User = {
  /* ... */
};
```

## Contributing

This SDK is auto-generated. Please do not edit the generated files directly.
If you find issues, please report them in the main project repository.

## License

This SDK is generated from the TestClient API specification.
