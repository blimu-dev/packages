import { describe, it, expect } from 'vitest';
import {
  exponentialStrategy,
  linearStrategy,
  getRetryStrategy,
  calculateRetryDelay,
} from '../../src/retry';

describe('exponentialStrategy', () => {
  it('should calculate exponential backoff', () => {
    expect(exponentialStrategy(0, 100)).toBe(100); // 100 * 2^0
    expect(exponentialStrategy(1, 100)).toBe(200); // 100 * 2^1
    expect(exponentialStrategy(2, 100)).toBe(400); // 100 * 2^2
    expect(exponentialStrategy(3, 100)).toBe(800); // 100 * 2^3
  });
});

describe('linearStrategy', () => {
  it('should calculate linear backoff', () => {
    expect(linearStrategy(0, 100)).toBe(100); // 100 * (0 + 1)
    expect(linearStrategy(1, 100)).toBe(200); // 100 * (1 + 1)
    expect(linearStrategy(2, 100)).toBe(300); // 100 * (2 + 1)
    expect(linearStrategy(3, 100)).toBe(400); // 100 * (3 + 1)
  });
});

describe('getRetryStrategy', () => {
  it("should return exponential strategy for 'exponential'", () => {
    const strategy = getRetryStrategy('exponential');
    expect(strategy(0, 100)).toBe(100);
    expect(strategy(1, 100)).toBe(200);
  });

  it("should return linear strategy for 'linear'", () => {
    const strategy = getRetryStrategy('linear');
    expect(strategy(0, 100)).toBe(100);
    expect(strategy(1, 100)).toBe(200);
  });

  it('should return custom function as-is', () => {
    const customStrategy = (attempt: number, base: number) => attempt * base;
    const strategy = getRetryStrategy(customStrategy);
    expect(strategy).toBe(customStrategy);
    expect(strategy(2, 100)).toBe(200);
  });
});

describe('calculateRetryDelay', () => {
  it('should calculate delay with exponential strategy', () => {
    expect(calculateRetryDelay(0, 'exponential', 100)).toBe(100);
    expect(calculateRetryDelay(1, 'exponential', 100)).toBe(200);
  });

  it('should calculate delay with linear strategy', () => {
    expect(calculateRetryDelay(0, 'linear', 100)).toBe(100);
    expect(calculateRetryDelay(1, 'linear', 100)).toBe(200);
  });

  it('should calculate delay with custom strategy', () => {
    const customStrategy = (attempt: number, base: number) => base * 5;
    expect(calculateRetryDelay(0, customStrategy, 100)).toBe(500);
    expect(calculateRetryDelay(1, customStrategy, 100)).toBe(500);
  });
});
