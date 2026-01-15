import { createFetchError, FetchError } from './errors';
import { HookRegistry } from './hooks';
import { calculateRetryDelay } from './retry';
import {
  parseSSEStream,
  parseNDJSONStream,
  parseChunkedStream,
} from './streaming';
import type {
  FetchClientConfig,
  RequestOptions,
  StreamingRequestOptions,
  AuthStrategy,
} from './types';
import {
  buildUrl,
  serializeBody,
  getContentType,
  parseResponse,
  isSuccessResponse,
} from './utils';
import {
  isFetchAvailable,
  getFetchErrorMessage,
  encodeBase64,
} from './utils/environment';

/**
 * Universal HTTP fetch client with hooks, retries, and streaming support
 */
export class FetchClient {
  private hookRegistry: HookRegistry;
  private cfg: FetchClientConfig;

  constructor(config: FetchClientConfig = {}) {
    this.cfg = config;

    // Set default base URL if not provided
    if (!this.cfg.baseURL) {
      this.cfg.baseURL = '';
    }

    // Initialize hook registry
    this.hookRegistry = new HookRegistry(this.cfg.hooks);

    // Check fetch availability
    if (!isFetchAvailable() && !this.cfg.fetch) {
      throw new Error(getFetchErrorMessage());
    }
  }

  /**
   * Add an authentication strategy
   */
  addAuthStrategy(strategy: AuthStrategy): void {
    if (!this.cfg.auth) {
      this.cfg.auth = { strategies: [] };
    }
    this.cfg.auth.strategies.push(strategy);
  }

  /**
   * Remove all authentication strategies
   */
  clearAuthStrategies(): void {
    if (this.cfg.auth) {
      this.cfg.auth.strategies = [];
    }
  }

  /**
   * Register a hook for a specific lifecycle stage
   */
  useHook(stage: string, hook: any): void {
    this.hookRegistry.register(stage as any, hook);
  }

  /**
   * Remove a hook
   */
  removeHook(stage: string, hook: any): boolean {
    return this.hookRegistry.remove(stage as any, hook);
  }

  /**
   * Clear hooks for a stage or all hooks
   */
  clearHooks(stage?: string): void {
    this.hookRegistry.clear(stage as any);
  }

  /**
   * Make an HTTP request
   */
  async request<T = any>(init: RequestOptions): Promise<T> {
    let url = buildUrl(this.cfg.baseURL || '', init.path, init.query);
    // Create headers, handling both plain objects and Headers instances
    const headers = new Headers(this.cfg.headers || {});
    if (init.headers) {
      if (init.headers instanceof Headers) {
        // Copy from Headers object
        init.headers.forEach((value, key) => {
          headers.set(key, value);
        });
      } else {
        // Merge from plain object
        Object.entries(init.headers).forEach(([key, value]) => {
          headers.set(key, String(value));
        });
      }
    }

    // Apply authentication (may modify URL for query-based auth)
    await this.applyAuthentication(headers, url);

    // Set content type if body is provided (check before serialization)
    let bodyContentType: string | undefined;
    if (init.body !== undefined) {
      // Check if Content-Type is already set in headers
      bodyContentType = headers.get('Content-Type') || undefined;
      if (!bodyContentType) {
        bodyContentType = getContentType(init.body);
        if (bodyContentType) {
          headers.set('Content-Type', bodyContentType);
        }
      }
    }

    const retries = this.cfg.retry?.retries ?? 0;
    const baseBackoff = this.cfg.retry?.backoffMs ?? 300;
    const retryOn = this.cfg.retry?.retryOn ?? [429, 500, 502, 503, 504];
    const retryStrategy = this.cfg.retry?.strategy ?? 'exponential';

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries + 1; attempt++) {
      try {
        // Rebuild URL for each attempt (in case query params were modified by auth)
        let attemptUrl = buildUrl(
          this.cfg.baseURL || '',
          init.path,
          init.query
        );
        // Clone headers for each attempt
        const attemptHeaders = new Headers(headers);
        // Re-apply authentication for each attempt
        await this.applyAuthentication(attemptHeaders, attemptUrl);
        return await this.doRequest<T>(
          attemptUrl,
          init,
          attemptHeaders,
          attempt,
          bodyContentType
        );
      } catch (err: any) {
        lastError = err;

        // Check if we should retry
        const shouldRetry = this.shouldRetry(err, attempt, retries, retryOn);

        if (shouldRetry) {
          // Execute beforeRetry hook
          if (this.hookRegistry.has('beforeRetry')) {
            await this.hookRegistry.execute('beforeRetry', {
              url: url.toString(),
              init: { ...init, headers },
              attempt,
              error: err,
              retryCount: attempt,
            });
          }

          // Calculate delay
          const delay = calculateRetryDelay(
            attempt,
            retryStrategy,
            baseBackoff
          );
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Execute afterRetry hook
          if (this.hookRegistry.has('afterRetry')) {
            await this.hookRegistry.execute('afterRetry', {
              url: url.toString(),
              init: { ...init, headers },
              attempt,
              error: err,
              retryCount: attempt,
              success: false, // Will be updated if retry succeeds
            });
          }

          continue;
        }

        // Not retrying - throw the error
        throw err;
      }
    }

    throw lastError as any;
  }

  /**
   * Make a streaming HTTP request
   */
  async *requestStream<T = any>(
    init: StreamingRequestOptions
  ): AsyncGenerator<T, void, unknown> {
    let url = buildUrl(this.cfg.baseURL || '', init.path, init.query);
    // Create headers, handling both plain objects and Headers instances
    const headers = new Headers(this.cfg.headers || {});
    if (init.headers) {
      if (init.headers instanceof Headers) {
        // Copy from Headers object
        init.headers.forEach((value, key) => {
          headers.set(key, value);
        });
      } else {
        // Merge from plain object
        Object.entries(init.headers).forEach(([key, value]) => {
          headers.set(key, String(value));
        });
      }
    }

    // Apply authentication (may modify URL for query-based auth)
    await this.applyAuthentication(headers, url);

    // Determine content type for body serialization
    let bodyContentType: string | undefined =
      headers.get('Content-Type') || undefined;
    if (init.contentType && !bodyContentType) {
      bodyContentType = init.contentType;
      headers.set('Content-Type', bodyContentType);
    }

    const fetchInit: RequestInit & {
      path: string;
      method: string;
      query?: Record<string, any>;
      headers: Headers;
    } = {
      ...init,
      headers,
      body: serializeBody(init.body, bodyContentType),
    };

    // Set credentials from config if provided
    if (this.cfg.credentials !== undefined) {
      fetchInit.credentials = this.cfg.credentials;
    }

    // Execute beforeRequest hook
    if (this.hookRegistry.has('beforeRequest')) {
      await this.hookRegistry.execute('beforeRequest', {
        url: url.toString(),
        init: fetchInit,
        attempt: 0,
      });
    }

    let controller: AbortController | undefined;
    let timeoutId: any;
    const existingSignal = fetchInit.signal;

    // Setup timeout
    if (this.cfg.timeoutMs && typeof AbortController !== 'undefined') {
      controller = new AbortController();
      if (existingSignal) {
        if (existingSignal.aborted) {
          controller.abort();
        } else {
          existingSignal.addEventListener('abort', () => {
            controller?.abort();
          });
        }
      }
      fetchInit.signal = controller.signal;
      timeoutId = setTimeout(() => {
        controller?.abort();
        // Execute onTimeout hook
        if (this.hookRegistry.has('onTimeout')) {
          this.hookRegistry.execute('onTimeout', {
            url: url.toString(),
            init: fetchInit,
            attempt: 0,
            timeoutMs: this.cfg.timeoutMs!,
          });
        }
      }, this.cfg.timeoutMs);
    }

    try {
      const fetchFn = this.cfg.fetch || fetch;
      const res = await fetchFn(url.toString(), fetchInit);

      // Execute afterRequest hook
      if (this.hookRegistry.has('afterRequest')) {
        await this.hookRegistry.execute('afterRequest', {
          url: url.toString(),
          init: fetchInit,
          attempt: 0,
          response: res,
        });
      }

      if (!res.ok) {
        const parsed = await parseResponse(res);
        const error = createFetchError(
          res.status,
          parsed?.message || `HTTP ${res.status}`,
          parsed,
          res.headers
        );

        // Execute onError hook
        if (this.hookRegistry.has('onError')) {
          await this.hookRegistry.execute('onError', {
            url: url.toString(),
            init: fetchInit,
            attempt: 0,
            error,
          });
        }

        throw error;
      }

      // Execute onStreamStart hook
      if (this.hookRegistry.has('onStreamStart')) {
        await this.hookRegistry.execute('onStreamStart', {
          url: url.toString(),
          init: fetchInit,
          attempt: 0,
          response: res,
        });
      }

      // Route to appropriate parser based on streaming format
      const streamingFormat = init.streamingFormat || 'chunked';

      if (streamingFormat === 'sse') {
        for await (const chunk of parseSSEStream(res)) {
          let transformedChunk = chunk;
          // Execute onStreamChunk hook if present
          if (this.hookRegistry.has('onStreamChunk')) {
            await this.hookRegistry.execute('onStreamChunk', {
              url: url.toString(),
              init: fetchInit,
              attempt: 0,
              chunk,
            });
          }
          yield transformedChunk as T;
        }
      } else if (streamingFormat === 'ndjson') {
        for await (const chunk of parseNDJSONStream<T>(res)) {
          let transformedChunk = chunk;
          // Execute onStreamChunk hook if present
          if (this.hookRegistry.has('onStreamChunk')) {
            await this.hookRegistry.execute('onStreamChunk', {
              url: url.toString(),
              init: fetchInit,
              attempt: 0,
              chunk,
            });
          }
          yield transformedChunk as T;
        }
      } else {
        // Generic chunked streaming
        for await (const chunk of parseChunkedStream<T>(res)) {
          let transformedChunk = chunk;
          // Execute onStreamChunk hook if present
          if (this.hookRegistry.has('onStreamChunk')) {
            await this.hookRegistry.execute('onStreamChunk', {
              url: url.toString(),
              init: fetchInit,
              attempt: 0,
              chunk,
            });
          }
          yield transformedChunk as T;
        }
      }

      // Execute onStreamEnd hook
      if (this.hookRegistry.has('onStreamEnd')) {
        await this.hookRegistry.execute('onStreamEnd', {
          url: url.toString(),
          init: fetchInit,
          attempt: 0,
          response: res,
        });
      }
    } catch (err) {
      // Execute onError hook
      if (this.hookRegistry.has('onError')) {
        await this.hookRegistry.execute('onError', {
          url: url.toString(),
          init: fetchInit,
          attempt: 0,
          error: err,
        });
      }
      throw err;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Internal method to execute a single request attempt
   */
  private async doRequest<T>(
    url: URL,
    init: RequestOptions,
    baseHeaders: Headers,
    attempt: number,
    contentType?: string
  ): Promise<T> {
    // Headers are already cloned and auth is already applied
    const requestHeaders = baseHeaders;

    const fetchInit: RequestInit & {
      path: string;
      method: string;
      query?: Record<string, any>;
      headers: Headers;
    } = {
      ...init,
      headers: requestHeaders,
      body: serializeBody(init.body, contentType),
    };

    // Set credentials from config if provided
    if (this.cfg.credentials !== undefined) {
      fetchInit.credentials = this.cfg.credentials;
    }

    // Execute beforeRequest hook
    if (this.hookRegistry.has('beforeRequest')) {
      await this.hookRegistry.execute('beforeRequest', {
        url: url.toString(),
        init: fetchInit,
        attempt,
      });
    }

    let controller: AbortController | undefined;
    let timeoutId: any;
    const existingSignal = fetchInit.signal;

    // Setup timeout
    if (this.cfg.timeoutMs && typeof AbortController !== 'undefined') {
      controller = new AbortController();
      if (existingSignal) {
        if (existingSignal.aborted) {
          controller.abort();
        } else {
          existingSignal.addEventListener('abort', () => {
            controller?.abort();
          });
        }
      }
      fetchInit.signal = controller.signal;
      timeoutId = setTimeout(() => {
        controller?.abort();
        // Execute onTimeout hook
        if (this.hookRegistry.has('onTimeout')) {
          this.hookRegistry.execute('onTimeout', {
            url: url.toString(),
            init: fetchInit,
            attempt,
            timeoutMs: this.cfg.timeoutMs!,
          });
        }
      }, this.cfg.timeoutMs);
    }

    try {
      const fetchFn = this.cfg.fetch || fetch;
      const res = await fetchFn(url.toString(), fetchInit);

      // Execute afterRequest hook
      if (this.hookRegistry.has('afterRequest')) {
        await this.hookRegistry.execute('afterRequest', {
          url: url.toString(),
          init: fetchInit,
          attempt,
          response: res,
        });
      }

      const parsed = await parseResponse(res);

      // Execute afterResponse hook
      if (this.hookRegistry.has('afterResponse')) {
        await this.hookRegistry.execute('afterResponse', {
          url: url.toString(),
          init: fetchInit,
          attempt,
          response: res,
          data: parsed,
        });
      }

      if (!isSuccessResponse(res)) {
        const error = createFetchError(
          res.status,
          parsed?.message || `HTTP ${res.status}`,
          parsed,
          res.headers
        );

        // Execute onError hook
        if (this.hookRegistry.has('onError')) {
          await this.hookRegistry.execute('onError', {
            url: url.toString(),
            init: fetchInit,
            attempt,
            error,
          });
        }

        throw error;
      }

      return parsed as T;
    } catch (err) {
      // Execute onError hook
      if (this.hookRegistry.has('onError')) {
        await this.hookRegistry.execute('onError', {
          url: url.toString(),
          init: fetchInit,
          attempt,
          error: err,
        });
      }

      // Re-throw with proper error type if needed
      if (err instanceof DOMException) {
        throw err;
      }
      if (err instanceof FetchError) {
        throw err;
      }

      // For network errors, try to extract status if available
      const status = (err as any)?.status as number | undefined;
      const statusCode = typeof status === 'number' ? status : 0;
      if (typeof err === 'string') {
        throw createFetchError(statusCode, err);
      }
      throw createFetchError(
        statusCode,
        (err as Error)?.message || 'Network error'
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Apply authentication strategies
   */
  private async applyAuthentication(headers: Headers, url: URL): Promise<void> {
    if (!this.cfg.auth?.strategies) {
      return;
    }

    for (const strategy of this.cfg.auth.strategies) {
      await this.applyAuthStrategy(strategy, headers, url);
    }
  }

  /**
   * Apply a single authentication strategy
   */
  private async applyAuthStrategy(
    strategy: AuthStrategy,
    headers: Headers,
    url: URL
  ): Promise<void> {
    switch (strategy.type) {
      case 'bearer': {
        const token =
          typeof strategy.token === 'function'
            ? await strategy.token()
            : strategy.token;
        if (token != null) {
          const headerName = strategy.headerName || 'Authorization';
          headers.set(headerName, `Bearer ${String(token)}`);
        }
        break;
      }

      case 'basic': {
        const encoded = encodeBase64(
          `${strategy.username}:${strategy.password}`
        );
        headers.set('Authorization', `Basic ${encoded}`);
        break;
      }

      case 'apiKey': {
        const key =
          typeof strategy.key === 'function'
            ? await strategy.key()
            : strategy.key;
        if (key != null) {
          switch (strategy.location) {
            case 'header':
              headers.set(strategy.name, String(key));
              break;
            case 'query':
              url.searchParams.set(strategy.name, String(key));
              break;
            case 'cookie':
              headers.set('Cookie', `${strategy.name}=${String(key)}`);
              break;
          }
        }
        break;
      }

      case 'custom':
        await strategy.apply(headers, url);
        break;
    }
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(
    error: unknown,
    attempt: number,
    maxRetries: number,
    retryOn: number[]
  ): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    // Check custom retry condition
    if (this.cfg.retry?.retryOnError) {
      return this.cfg.retry.retryOnError(error);
    }

    // Check if it's a FetchError with a retryable status code
    if (error instanceof FetchError) {
      return retryOn.includes(error.status);
    }

    // Network errors (no status code) should be retried
    return true;
  }
}
