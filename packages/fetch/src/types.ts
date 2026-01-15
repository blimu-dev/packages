import type { HooksConfig } from "./hooks";
import type { RetryConfig } from "./retry";
import type { StreamingFormat } from "./streaming";

/**
 * Bearer token authentication strategy
 */
export interface BearerAuthStrategy {
  type: "bearer";
  token: string | (() => string | undefined | Promise<string | undefined>);
  headerName?: string; // Default: "Authorization"
}

/**
 * Basic authentication strategy
 */
export interface BasicAuthStrategy {
  type: "basic";
  username: string;
  password: string;
}

/**
 * API key authentication strategy
 */
export interface ApiKeyAuthStrategy {
  type: "apiKey";
  key: string | (() => string | undefined | Promise<string | undefined>);
  location: "header" | "query" | "cookie";
  name: string; // Header name, query param name, or cookie name
}

/**
 * Custom authentication strategy
 */
export interface CustomAuthStrategy {
  type: "custom";
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

export interface AuthConfig {
  strategies: AuthStrategy[];
}

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
   * Authentication configuration
   */
  auth?: AuthConfig;
  /**
   * Custom fetch implementation (useful for polyfills or testing)
   */
  fetch?: typeof fetch;
  /**
   * Request credentials
   */
  credentials?: RequestInit["credentials"];
}

/**
 * Request options for a single request
 */
export interface RequestOptions extends RequestInit {
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
  query?: Record<string, any>;
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
