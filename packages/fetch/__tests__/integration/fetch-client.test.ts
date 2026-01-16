import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { FetchClient } from '../../src/client';
import {
  NotFoundError,
  UnauthorizedError,
  InternalServerError,
} from '../../src/errors';

// Setup MSW server
const server = setupServer(
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json({ data: [{ id: 1, name: 'John' }] });
  }),

  http.get('https://api.example.com/users/:id', ({ params }) => {
    const id = params.id as string;
    if (id === '404') {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ id: Number(id), name: 'John' });
  }),

  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 1, ...(body as any) }, { status: 201 });
  }),

  http.get('https://api.example.com/protected', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ data: 'protected' });
  }),

  http.get('https://api.example.com/error', () => {
    return HttpResponse.json({ message: 'Server error' }, { status: 500 });
  }),

  http.get('https://api.example.com/retry', ({ request }) => {
    const retryCount = request.headers.get('X-Retry-Count');
    if (!retryCount || Number(retryCount) < 2) {
      return HttpResponse.json({ message: 'Retry' }, { status: 500 });
    }
    return HttpResponse.json({ data: 'success' });
  }),

  http.get('https://api.example.com/stream', () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: chunk1\n\n'));
        controller.enqueue(new TextEncoder().encode('data: chunk2\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }),

  http.get('https://api.example.com/ndjson', () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"a":1}\n'));
        controller.enqueue(new TextEncoder().encode('{"b":2}\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('FetchClient Integration Tests', () => {
  describe('Basic Requests', () => {
    it('should make a successful GET request', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });
      const result = await client.request({
        path: '/users',
        method: 'GET',
      });

      expect(result).toEqual({ data: [{ id: 1, name: 'John' }] });
    });

    it('should make a successful POST request', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });
      const result = await client.request({
        path: '/users',
        method: 'POST',
        body: JSON.stringify({ name: 'Jane' }),
      });

      expect(result).toEqual({ id: 1, name: 'Jane' });
    });

    it('should handle query parameters', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });
      const result = await client.request({
        path: '/users',
        method: 'GET',
        query: { page: 1, limit: 10 },
      });

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundError for 404', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });

      await expect(
        client.request({ path: '/users/404', method: 'GET' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError for 401', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });

      await expect(
        client.request({ path: '/protected', method: 'GET' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw InternalServerError for 500', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });

      await expect(
        client.request({ path: '/error', method: 'GET' })
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('Authentication', () => {
    it('should include Authorization header with bearer token', async () => {
      const client = new FetchClient({
        baseURL: 'https://api.example.com',
        authStrategies: [
          {
            type: 'bearer',
            token: 'test-token',
          },
        ],
      });

      const result = await client.request({
        path: '/protected',
        method: 'GET',
      });

      expect(result).toEqual({ data: 'protected' });
    });

    it('should support dynamic bearer token', async () => {
      const getToken = async () => 'dynamic-token';
      const client = new FetchClient({
        baseURL: 'https://api.example.com',
        authStrategies: [
          {
            type: 'bearer',
            token: getToken,
          },
        ],
      });

      const result = await client.request({
        path: '/protected',
        method: 'GET',
      });

      expect(result).toEqual({ data: 'protected' });
    });
  });

  describe('Retry', () => {
    it('should retry on server errors', async () => {
      let retryCount = 0;

      // Temporarily close the main server
      server.close();

      const serverWithRetry = setupServer(
        http.get('https://api.example.com/retry-test', () => {
          retryCount++;
          if (retryCount < 2) {
            return HttpResponse.json({ message: 'Retry' }, { status: 500 });
          }
          return HttpResponse.json({ data: 'success' });
        })
      );

      serverWithRetry.listen({ onUnhandledRequest: 'error' });

      const client = new FetchClient({
        baseURL: 'https://api.example.com',
        retry: {
          retries: 2,
          strategy: 'exponential',
          backoffMs: 10,
          retryOn: [500],
        },
      });

      const result = await client.request({
        path: '/retry-test',
        method: 'GET',
      });

      expect(result).toEqual({ data: 'success' });
      expect(retryCount).toBe(2);

      serverWithRetry.close();

      // Restart the main server
      server.listen({ onUnhandledRequest: 'bypass' });
    });
  });

  describe('Streaming', () => {
    it('should parse SSE stream', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });
      const chunks: string[] = [];

      for await (const chunk of client.requestStream({
        path: '/stream',
        method: 'GET',
        contentType: 'text/event-stream',
        streamingFormat: 'sse',
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should parse NDJSON stream', async () => {
      const client = new FetchClient({ baseURL: 'https://api.example.com' });
      const chunks: any[] = [];

      for await (const chunk of client.requestStream({
        path: '/ndjson',
        method: 'GET',
        contentType: 'application/x-ndjson',
        streamingFormat: 'ndjson',
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(2);
      expect(chunks[0]).toEqual({ a: 1 });
      expect(chunks[1]).toEqual({ b: 2 });
    });
  });

  describe('Hooks', () => {
    it('should execute hooks during request', async () => {
      const beforeRequestHook = vi.fn();
      const afterResponseHook = vi.fn();

      const client = new FetchClient({
        baseURL: 'https://api.example.com',
        hooks: {
          beforeRequest: [beforeRequestHook],
          afterResponse: [afterResponseHook],
        },
      });

      await client.request({ path: '/users', method: 'GET' });

      expect(beforeRequestHook).toHaveBeenCalled();
      expect(afterResponseHook).toHaveBeenCalled();
    });
  });
});
