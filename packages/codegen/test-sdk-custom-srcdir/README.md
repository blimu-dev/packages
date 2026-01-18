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
  baseURL: 'https://api.test.com/v1',
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

// Example: Stream data as NDJSON
try {
  const result = await client.data.streamData();
  console.log('Result:', result);
} catch (error) {
  // FetchError with structured data
  console.error(error);
}
// Example: Stream server-sent events
try {
  const result = await client.events.streamEvents();
  console.log('Result:', result);
} catch (error) {
  // FetchError with structured data
  console.error(error);
}
// Example: List all users
try {
  const result = await client.users.listUsers({});
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
const data: Schema.CreateUserRequest = {
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
  baseURL: 'https://api.test.com/v1',
  fetch,
});
```

## Models and Types

The SDK includes the following TypeScript interfaces:

- **CreateUserRequest**
- **DataItem**
- **PatchUserRequest**
- **UpdateUserRequest**
- **User**

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
