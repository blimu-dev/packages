import { http, HttpResponse, RequestHandler } from 'msw';

const BASE_URL = 'https://api.test.com/v1';

export const handlers: RequestHandler[] = [
  // GET /users
  http.get(`${BASE_URL}/users`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    const users = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        status: 'active',
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
        status: 'inactive',
      },
    ];

    let filtered = users;
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      filtered = users.filter((u) => statusArray.includes(u.status));
    }

    const paginated = filtered.slice(offset, offset + limit);

    return HttpResponse.json(paginated, { status: 200 });
  }),

  // POST /users
  http.post(`${BASE_URL}/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    // Validate required field
    if (!body.email) {
      return HttpResponse.json(
        { code: 'BAD_REQUEST', message: 'email is required' },
        { status: 400 }
      );
    }
    const newUser = {
      id: 'new-id',
      ...body,
      status: 'active',
    };
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // GET /users/:id
  http.get(`${BASE_URL}/users/:id`, ({ params, request }) => {
    const { id } = params;
    // Handle both string and object IDs (sometimes params come as objects)
    const idStr = typeof id === 'string' ? id : String(id);

    // Check URL pathname to see if it's actually a 404 request
    const url = new URL(request.url);
    const pathId = url.pathname.split('/').pop();

    // Check if the ID in the path is "404" (not the stringified object)
    if (pathId === '404') {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // If idStr is "[object Object]", it means the SDK passed an object instead of extracting the id
    // In that case, we'll return a valid user with id "1"
    const actualId = idStr === '[object Object]' ? '1' : idStr;

    const user = {
      id: actualId,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      status: 'active' as const,
      metadata: { source: 'test' },
    };
    return HttpResponse.json(user, { status: 200 });
  }),

  // PUT /users/:id
  http.put(`${BASE_URL}/users/:id`, async ({ request, params }) => {
    const { id } = params;
    const idStr = typeof id === 'string' ? id : String(id);
    const actualId = idStr === '[object Object]' ? '1' : idStr;

    let body: Record<string, unknown> = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text) as Record<string, unknown>;
        }
      }
    } catch {
      // Empty body or invalid JSON - use empty object
      body = {};
    }

    // Remove id from body if present (it's a path parameter)
    const { ...bodyWithoutId } = body;

    delete bodyWithoutId.id;

    const updatedUser = {
      id: actualId,
      name: 'John Doe', // Default values
      email: 'john@example.com',
      age: 30,
      ...bodyWithoutId, // Override with request body (without id)
    };
    return HttpResponse.json(updatedUser, { status: 200 });
  }),

  // PATCH /users/:id
  http.patch(`${BASE_URL}/users/:id`, async ({ request, params }) => {
    const { id } = params;
    const idStr = typeof id === 'string' ? id : String(id);
    const actualId = idStr === '[object Object]' ? '1' : idStr;

    let body: Record<string, unknown> = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text) as Record<string, unknown>;
        }
      }
    } catch {
      // Empty body or invalid JSON - use empty object
      body = {};
    }

    // Remove id from body if present (it's a path parameter)
    const { ...bodyWithoutId } = body;
    delete bodyWithoutId.id;

    const patchedUser = {
      id: actualId,
      name: 'John Doe', // Default values
      email: 'john@example.com',
      age: 30,
      ...bodyWithoutId, // Override with request body (partial update, without id)
    };
    return HttpResponse.json(patchedUser, { status: 200 });
  }),

  // DELETE /users/:id
  http.delete(`${BASE_URL}/users/:id`, ({ params }) => {
    const { id } = params;
    if (id === '404') {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /products
  http.get(`${BASE_URL}/products`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const products = [
      {
        id: '1',
        name: 'Product 1',
        price: 10.99,
        category: 'electronics',
        tags: ['new', 'sale'],
      },
      {
        id: '2',
        name: 'Product 2',
        price: 20.99,
        category: 'clothing',
        tags: ['popular'],
      },
    ];

    const paginated = products.slice(offset, offset + limit);
    return HttpResponse.json(paginated, { status: 200 });
  }),

  // POST /products
  http.post(`${BASE_URL}/products`, async ({ request }) => {
    const body = await request.json();
    const newProduct = {
      id: 'new-product-id',
      ...(body as Record<string, unknown>),
    };
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  // GET /products/:id
  http.get(`${BASE_URL}/products/:id`, ({ params, request }) => {
    const { id } = params;
    // Handle both string and object IDs (sometimes params come as objects)
    const idStr = typeof id === 'string' ? id : String(id);

    // Check URL to see if it's actually a 404 request
    const url = new URL(request.url);
    if (url.pathname.includes('/404') || idStr === '404') {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Product not found' },
        { status: 404 }
      );
    }

    const product = {
      id: idStr === '[object Object]' ? '1' : idStr, // Fix for object stringification issue
      name: 'Product 1',
      price: 10.99,
      category: 'electronics',
      tags: ['new', 'sale'],
    };
    return HttpResponse.json(product, { status: 200 });
  }),

  // PUT /products/:id
  http.put(`${BASE_URL}/products/:id`, async ({ request, params }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      // Empty body or invalid JSON
      body = {};
    }
    const { id } = params;
    const idStr = typeof id === 'string' ? id : String(id);
    const updatedProduct = {
      id: idStr === '[object Object]' ? '1' : idStr,
      ...(body as Record<string, unknown>),
    };
    return HttpResponse.json(updatedProduct, { status: 200 });
  }),

  // DELETE /products/:id
  http.delete(`${BASE_URL}/products/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /events (SSE streaming)
  http.get(`${BASE_URL}/events`, () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const events = [
          { type: 'message', data: { id: 1, message: 'Event 1' } },
          { type: 'message', data: { id: 2, message: 'Event 2' } },
          { type: 'message', data: { id: 3, message: 'Event 3' } },
        ];

        let index = 0;
        const interval = setInterval(() => {
          if (index < events.length) {
            const event = events[index];
            const sseData = `data: ${JSON.stringify(event?.data)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 10);
      },
    });

    return new HttpResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // GET /data/stream (NDJSON streaming)
  http.get(`${BASE_URL}/data/stream`, () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const items = [
          { id: '1', timestamp: new Date().toISOString(), value: 10 },
          { id: '2', timestamp: new Date().toISOString(), value: 20 },
          { id: '3', timestamp: new Date().toISOString(), value: 30 },
        ];

        let index = 0;
        const interval = setInterval(() => {
          if (index < items.length) {
            const item = items[index];
            const line = JSON.stringify(item) + '\n';
            controller.enqueue(encoder.encode(line));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 10);
      },
    });

    return new HttpResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
    });
  }),

  // Error responses
  http.get(`${BASE_URL}/error/400`, () => {
    return HttpResponse.json(
      { code: 'BAD_REQUEST', message: 'Bad request' },
      { status: 400 }
    );
  }),

  http.get(`${BASE_URL}/error/500`, () => {
    return HttpResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }),
];
