# @blimu/fetch

Universal HTTP fetch client with hooks, retries, and streaming support for browser and Node.js.

## Features

- 🌐 **Universal**: Works in both browser and Node.js environments
- 🔄 **Smart Retries**: Configurable retry strategies (exponential, linear, custom)
- 🎣 **Hooks System**: Extensible lifecycle hooks for request/response handling
- 📡 **Streaming Support**: SSE, NDJSON, and chunked streaming parsers
- 🚨 **Type-Safe Errors**: Specific error classes for different HTTP status codes
- 🔒 **Authentication**: Built-in support for Bearer tokens, Basic auth, and API keys
- ⚡ **Zero Dependencies**: Uses native fetch API

## Installation

```bash
npm install @blimu/fetch
# or
yarn add @blimu/fetch
# or
pnpm add @blimu/fetch
```

## Quick Start

```typescript
import { FetchClient } from '@blimu/fetch';

const client = new FetchClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Make a request
const data = await client.request({
  path: '/users',
  method: 'GET',
});
```

## Configuration

### Basic Configuration

```typescript
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  headers: {
    'X-Custom-Header': 'value',
  },
  timeoutMs: 5000,
  credentials: 'include',
});
```

### Authentication

Authentication is configured using the `authStrategies` option:

```typescript
// Bearer token authentication
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'bearer',
      token: 'your-token-here',
    },
  ],
});

// Dynamic bearer token
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'bearer',
      token: async () => {
        // Fetch or refresh token
        return await getToken();
      },
      headerName: 'Authorization', // Optional, defaults to "Authorization"
    },
  ],
});

// Basic authentication
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'basic',
      username: 'user',
      password: 'pass',
    },
  ],
});

// API key in header
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'apiKey',
      key: 'your-api-key',
      location: 'header',
      name: 'X-API-Key',
    },
  ],
});

// API key in query parameter
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'apiKey',
      key: 'your-api-key',
      location: 'query',
      name: 'api_key',
    },
  ],
});

// Multiple authentication strategies
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'bearer',
      token: 'token',
    },
    {
      type: 'apiKey',
      key: 'api-key',
      location: 'header',
      name: 'X-API-Key',
    },
  ],
});

// Custom authentication strategy
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  authStrategies: [
    {
      type: 'custom',
      apply: async (headers, url) => {
        // Custom authentication logic
        const token = await getCustomToken();
        headers.set('X-Custom-Auth', token);
      },
    },
  ],
});
```

## Hooks System

The hooks system allows you to intercept and modify requests at different lifecycle stages.

### Available Hooks

- `beforeRequest`: Before the request is made (can modify request)
- `afterRequest`: After response is received, before parsing
- `afterResponse`: After response is parsed
- `onError`: When an error occurs
- `beforeRetry`: Before a retry attempt
- `afterRetry`: After a retry attempt
- `onTimeout`: When a timeout occurs
- `onStreamStart`: When streaming starts
- `onStreamChunk`: For each stream chunk (can transform)
- `onStreamEnd`: When streaming ends

### Using Hooks

```typescript
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  hooks: {
    beforeRequest: [
      (ctx) => {
        // Add custom header
        ctx.init.headers.set('X-Request-ID', generateId());
      },
      async (ctx) => {
        // Refresh token if needed
        const token = await refreshToken();
        ctx.init.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      (ctx) => {
        // Log response
        console.log('Response:', ctx.data);
      },
    ],
    onError: [
      (ctx) => {
        // Log errors
        console.error('Request failed:', ctx.error);
      },
    ],
  },
});
```

### Dynamic Hook Registration

```typescript
const client = new FetchClient({ baseURL: 'https://api.example.com' });

// Register a hook
client.useHook('beforeRequest', (ctx) => {
  console.log('Making request to:', ctx.url);
});

// Remove a hook
const hook = (ctx) => console.log(ctx);
client.useHook('beforeRequest', hook);
client.removeHook('beforeRequest', hook);

// Clear all hooks for a stage
client.clearHooks('beforeRequest');

// Clear all hooks
client.clearHooks();
```

## Retry Configuration

### Exponential Backoff (Default)

```typescript
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  retry: {
    retries: 3,
    strategy: 'exponential',
    backoffMs: 100,
    retryOn: [429, 500, 502, 503, 504],
  },
});
```

### Linear Backoff

```typescript
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  retry: {
    retries: 3,
    strategy: 'linear',
    backoffMs: 200,
    retryOn: [500, 502, 503],
  },
});
```

### Custom Retry Strategy

```typescript
const client = new FetchClient({
  baseURL: 'https://api.example.com',
  retry: {
    retries: 3,
    strategy: (attempt, baseBackoff) => {
      // Custom delay calculation
      return baseBackoff * (attempt + 1) * 2;
    },
    retryOn: [500],
    retryOnError: (error) => {
      // Custom retry condition
      return error instanceof NetworkError;
    },
  },
});
```

## Streaming

### Server-Sent Events (SSE)

```typescript
for await (const chunk of client.requestStream({
  path: '/events',
  method: 'GET',
  contentType: 'text/event-stream',
  streamingFormat: 'sse',
})) {
  console.log('Event:', chunk);
}
```

### NDJSON (Newline-Delimited JSON)

```typescript
for await (const item of client.requestStream({
  path: '/items',
  method: 'GET',
  contentType: 'application/x-ndjson',
  streamingFormat: 'ndjson',
})) {
  console.log('Item:', item);
}
```

### Chunked Streaming

```typescript
for await (const chunk of client.requestStream({
  path: '/stream',
  method: 'GET',
  contentType: 'application/octet-stream',
  streamingFormat: 'chunked',
})) {
  console.log('Chunk:', chunk);
}
```

## Error Handling

The package provides specific error classes for different HTTP status codes, enabling `instanceof` checks in catch blocks.

### Error Classes

**4xx Client Errors:**

- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `MethodNotAllowedError` (405)
- `ConflictError` (409)
- `UnprocessableEntityError` (422)
- `TooManyRequestsError` (429)
- `ClientError` (generic 4xx)

**5xx Server Errors:**

- `InternalServerError` (500)
- `BadGatewayError` (502)
- `ServiceUnavailableError` (503)
- `GatewayTimeoutError` (504)
- `ServerError` (generic 5xx)

### Using Error Classes

```typescript
import {
  FetchClient,
  NotFoundError,
  UnauthorizedError,
  ServerError,
} from '@blimu/fetch';

try {
  await client.request({ path: '/users/123', method: 'GET' });
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle 404
    console.log('User not found');
  } else if (error instanceof UnauthorizedError) {
    // Handle 401
    console.log('Unauthorized - refresh token');
  } else if (error instanceof ServerError) {
    // Handle any 5xx
    console.log('Server error:', error.status);
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## Browser vs Node.js

### Browser

Works out of the box in modern browsers (Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+):

```typescript
import { FetchClient } from '@blimu/fetch';

const client = new FetchClient({
  baseURL: 'https://api.example.com',
});
```

### Node.js

**Node.js 22+**: Native fetch is available, works out of the box.

**Node.js < 22**: Provide a custom fetch implementation:

```typescript
import { FetchClient } from '@blimu/fetch';
import { fetch } from 'undici'; // or "node-fetch"

const client = new FetchClient({
  baseURL: 'https://api.example.com',
  fetch, // Provide custom fetch
});
```

## API Reference

### FetchClient

#### Constructor

```typescript
new FetchClient(config?: FetchClientConfig)
```

#### Methods

- `request<T>(options: RequestOptions): Promise<T>` - Make an HTTP request
- `requestStream<T>(options: StreamingRequestOptions): AsyncGenerator<T>` - Make a streaming request
- `addAuthStrategy(strategy: AuthStrategy): void` - Add an authentication strategy
- `clearAuthStrategies(): void` - Remove all authentication strategies
- `useHook(stage: string, hook: Hook): void` - Register a hook
- `removeHook(stage: string, hook: Hook): boolean` - Remove a hook
- `clearHooks(stage?: string): void` - Clear hooks

### Types

```typescript
interface FetchClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retry?: RetryConfig;
  hooks?: HooksConfig;
  authStrategies?: AuthStrategy[];
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
}

type AuthStrategy =
  | BearerAuthStrategy
  | BasicAuthStrategy
  | ApiKeyAuthStrategy
  | CustomAuthStrategy;

interface RequestOptions extends RequestInit {
  path: string;
  method: string;
  query?: Record<string, any> | undefined;
}

interface StreamingRequestOptions extends RequestOptions {
  contentType: string;
  streamingFormat?: 'sse' | 'ndjson' | 'chunked';
}
```

## License

MIT
