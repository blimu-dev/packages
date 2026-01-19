import { describe, it, expect, vi } from 'vitest';
import { HookRegistry } from '../../src/hooks';
import type { Hook } from '../../src/hooks';

describe('HookRegistry', () => {
  it('should create an empty registry', () => {
    const registry = new HookRegistry();
    expect(registry.get('beforeRequest')).toEqual([]);
  });

  it('should register hooks from config', () => {
    const hook1: Hook = vi.fn();
    const hook2: Hook = vi.fn();
    const registry = new HookRegistry({
      beforeRequest: [hook1, hook2],
    });

    expect(registry.get('beforeRequest')).toEqual([hook1, hook2]);
  });

  it('should register a hook', () => {
    const registry = new HookRegistry();
    const hook: Hook = vi.fn();
    registry.register('beforeRequest', hook);
    expect(registry.get('beforeRequest')).toEqual([hook]);
  });

  it('should register multiple hooks for the same stage', () => {
    const registry = new HookRegistry();
    const hook1: Hook = vi.fn();
    const hook2: Hook = vi.fn();
    registry.register('beforeRequest', hook1);
    registry.register('beforeRequest', hook2);
    expect(registry.get('beforeRequest')).toEqual([hook1, hook2]);
  });

  it('should remove a hook', () => {
    const registry = new HookRegistry();
    const hook1: Hook = vi.fn();
    const hook2: Hook = vi.fn();
    registry.register('beforeRequest', hook1);
    registry.register('beforeRequest', hook2);
    expect(registry.remove('beforeRequest', hook1)).toBe(true);
    expect(registry.get('beforeRequest')).toEqual([hook2]);
  });

  it('should return false when removing non-existent hook', () => {
    const registry = new HookRegistry();
    const hook: Hook = vi.fn();
    expect(registry.remove('beforeRequest', hook)).toBe(false);
  });

  it('should clear hooks for a stage', () => {
    const registry = new HookRegistry();
    const hook: Hook = vi.fn();
    registry.register('beforeRequest', hook);
    registry.clear('beforeRequest');
    expect(registry.get('beforeRequest')).toEqual([]);
  });

  it('should clear all hooks', () => {
    const registry = new HookRegistry();
    const hook1: Hook = vi.fn();
    const hook2: Hook = vi.fn();
    registry.register('beforeRequest', hook1);
    registry.register('afterRequest', hook2);
    registry.clear();
    expect(registry.get('beforeRequest')).toEqual([]);
    expect(registry.get('afterRequest')).toEqual([]);
  });

  it('should execute hooks in registration order', async () => {
    const registry = new HookRegistry();
    const calls: number[] = [];
    const hook1: Hook = vi.fn(() => {
      calls.push(1);
    });
    const hook2: Hook = vi.fn(() => {
      calls.push(2);
    });
    registry.register('beforeRequest', hook1);
    registry.register('beforeRequest', hook2);

    await registry.execute('beforeRequest', {
      url: 'https://example.com',
      init: { method: 'GET' },
      attempt: 0,
    });

    expect(calls).toEqual([1, 2]);
  });

  it('should execute async hooks', async () => {
    const registry = new HookRegistry();
    const hook: Hook = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    registry.register('beforeRequest', hook);

    await registry.execute('beforeRequest', {
      url: 'https://example.com',
      init: { method: 'GET' },
      attempt: 0,
    });

    expect(hook).toHaveBeenCalled();
  });

  it('should check if hooks exist for a stage', () => {
    const registry = new HookRegistry();
    expect(registry.has('beforeRequest')).toBe(false);
    registry.register('beforeRequest', vi.fn());
    expect(registry.has('beforeRequest')).toBe(true);
  });
});
