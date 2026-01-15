/**
 * Retry strategy function type
 * @param attempt - Current attempt number (0-based)
 * @param baseBackoffMs - Base backoff time in milliseconds
 * @returns Delay in milliseconds before the next retry
 */
export type RetryStrategyFunction = (
  attempt: number,
  baseBackoffMs: number
) => number;

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Number of retries to attempt
   */
  retries: number;
  /**
   * Retry strategy: 'exponential', 'linear', or a custom function
   */
  strategy: "exponential" | "linear" | RetryStrategyFunction;
  /**
   * Base backoff time in milliseconds (used for exponential and linear strategies)
   */
  backoffMs?: number;
  /**
   * HTTP status codes to retry on
   */
  retryOn?: number[];
  /**
   * Custom function to determine if an error should be retried
   */
  retryOnError?: (error: unknown) => boolean;
}
