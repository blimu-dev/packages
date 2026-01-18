import type { HooksConfig } from './hooks';
import type { RetryConfig } from './retry';
import type { StreamingFormat } from './streaming';

/**
 * Bearer token authentication strategy
 */
export interface BearerAuthStrategy {
  type: 'bearer';
  token: string | (() => string | undefined | Promise<string | undefined>);
  headerName?: string; // Default: "Authorization"
}

/**
 * Basic authentication strategy
 */
export interface BasicAuthStrategy {
  type: 'basic';
  username: string;
  password: string;
}

/**
 * API key authentication strategy
 */
export interface ApiKeyAuthStrategy {
  type: 'apiKey';
  key: string | (() => string | undefined | Promise<string | undefined>);
  location: 'header' | 'query' | 'cookie';
  name: string; // Header name, query param name, or cookie name
}

/**
 * Custom authentication strategy
 */
export interface CustomAuthStrategy {
  type: 'custom';
  apply: (headers: Headers, url: URL) => void | Promise<void>;
}

/**
 * Authentication configuration
 */
export type AuthStrategy =
  | BearerAuthStrategy
  | BasicAuthStrategy
  | ApiKeyAuthStrategy
  | CustomAuthStrategy;

/**
 * Main configuration interface for FetchClient
 */
export interface FetchClientConfig {
  /**
   * Base URL for all requests
   */
  baseURL?: string;
  /**
   * Default headers to include in all requests
   */
  headers?: Record<string, string>;
  /**
   * Request timeout in milliseconds
   */
  timeoutMs?: number;
  /**
   * Retry configuration
   */
  retry?: RetryConfig;
  /**
   * Hooks configuration
   */
  hooks?: HooksConfig;
  /**
   * Authentication strategies
   */
  authStrategies?: AuthStrategy[];
  /**
   * Custom fetch implementation (useful for polyfills or testing)
   */
  fetch?: typeof fetch;
  /**
   * Request credentials
   */
  credentials?: RequestInit['credentials'];
}

/**
 * Query parameter value types
 * Query parameters can be strings, numbers, booleans, arrays of strings (including string literal unions), or null/undefined
 *
 * Note: Arrays of string literal unions (e.g., ('active' | 'inactive')[]) are accepted
 * because they are assignable to arrays of string-like values at runtime. The runtime
 * serialization converts all values to strings using String().
 *
 * We use a more permissive array type to accept arrays of string literals, which TypeScript
 * doesn't automatically widen to string[] due to array covariance rules. The type accepts
 * arrays of any primitive type since they all get stringified at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryParamValue = any;

/**
 * Query parameters object
 * Maps parameter names to their values
 *
 * The runtime implementation uses Object.entries() which works with any object type.
 * TypeScript interfaces are not directly assignable to Record types, so when passing
 * interface types (like generated SDK query interfaces), a type assertion may be needed.
 * The runtime serialization code safely handles the conversion.
 */
export type QueryParams = Record<string, QueryParamValue>;

/**
 * Body type that can be serialized by the fetch client
 * Includes standard BodyInit types plus plain objects/arrays that will be JSON serialized
 */
export type SerializableBody =
  | RequestInit['body']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | any[]
  | null
  | undefined;

/**
 * Request options for a single request
 */
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /**
   * Request path (will be appended to baseURL)
   */
  path: string;
  /**
   * HTTP method
   */
  method: string;
  /**
   * Query parameters
   */
  query?: QueryParams | undefined;
  /**
   * Request body - can be BodyInit, plain object/array (will be JSON serialized), or null/undefined
   */
  body?: SerializableBody | undefined;
}

/**
 * Streaming request options
 */
export interface StreamingRequestOptions extends RequestOptions {
  /**
   * Content type for the request
   */
  contentType: string;
  /**
   * Streaming format
   */
  streamingFormat?: StreamingFormat;
}
