import type { RetryStrategyFunction } from './types';

/**
 * Exponential backoff strategy
 * Delay = baseBackoffMs * 2^attempt
 */
export const exponentialStrategy: RetryStrategyFunction = (
  attempt: number,
  baseBackoffMs: number
): number => {
  return baseBackoffMs * Math.pow(2, attempt);
};

/**
 * Linear backoff strategy
 * Delay = baseBackoffMs * (attempt + 1)
 */
export const linearStrategy: RetryStrategyFunction = (
  attempt: number,
  baseBackoffMs: number
): number => {
  return baseBackoffMs * (attempt + 1);
};

/**
 * Get the retry strategy function based on the strategy name or function
 */
export function getRetryStrategy(
  strategy: 'exponential' | 'linear' | RetryStrategyFunction
): RetryStrategyFunction {
  if (typeof strategy === 'function') {
    return strategy;
  }

  switch (strategy) {
    case 'exponential':
      return exponentialStrategy;
    case 'linear':
      return linearStrategy;
    default:
      return exponentialStrategy;
  }
}

/**
 * Calculate the delay for a retry attempt
 */
export function calculateRetryDelay(
  attempt: number,
  strategy: 'exponential' | 'linear' | RetryStrategyFunction,
  baseBackoffMs: number
): number {
  const strategyFn = getRetryStrategy(strategy);
  return strategyFn(attempt, baseBackoffMs);
}
