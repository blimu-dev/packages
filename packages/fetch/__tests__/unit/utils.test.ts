import { describe, it, expect } from 'vitest';
import {
  buildUrl,
  serializeQueryParams,
  serializeBody,
  getContentType,
  parseResponse,
  encodeBase64,
  isBrowser,
  isNode,
  isFetchAvailable,
} from '../../src/utils';

describe('buildUrl', () => {
  it('should build URL with base and path', () => {
    const url = buildUrl('https://api.example.com', '/users');
    expect(url.toString()).toBe('https://api.example.com/users');
  });

  it('should normalize trailing slashes', () => {
    const url = buildUrl('https://api.example.com', '/users/');
    expect(url.toString()).toBe('https://api.example.com/users');
  });

  it('should append query parameters', () => {
    const url = buildUrl('https://api.example.com', '/users', {
      page: 1,
      limit: 10,
    });
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('10');
  });

  it('should handle array query parameters', () => {
    const url = buildUrl('https://api.example.com', '/users', {
      tags: ['a', 'b'],
    });
    expect(url.searchParams.getAll('tags')).toEqual(['a', 'b']);
  });
});

describe('serializeQueryParams', () => {
  it('should serialize simple query params', () => {
    const params = serializeQueryParams({ a: '1', b: '2' });
    expect(params.get('a')).toBe('1');
    expect(params.get('b')).toBe('2');
  });

  it('should skip undefined and null values', () => {
    const params = serializeQueryParams({ a: '1', b: undefined, c: null });
    expect(params.has('a')).toBe(true);
    expect(params.has('b')).toBe(false);
    expect(params.has('c')).toBe(false);
  });

  it('should handle arrays', () => {
    const params = serializeQueryParams({ tags: ['a', 'b'] });
    expect(params.getAll('tags')).toEqual(['a', 'b']);
  });
});

describe('serializeBody', () => {
  it('should return null for null/undefined', () => {
    expect(serializeBody(null)).toBeNull();
    expect(serializeBody(undefined)).toBeNull();
  });

  it('should return string as-is', () => {
    expect(serializeBody('test')).toBe('test');
  });

  it('should stringify objects to JSON', () => {
    const body = serializeBody({ a: 1 });
    expect(body).toBe('{"a":1}');
  });

  it('should return FormData as-is', () => {
    const formData = new FormData();
    formData.append('key', 'value');
    expect(serializeBody(formData)).toBe(formData);
  });
});

describe('getContentType', () => {
  it('should return undefined for null/undefined', () => {
    expect(getContentType(null)).toBeUndefined();
    expect(getContentType(undefined)).toBeUndefined();
  });

  it('should return undefined for FormData', () => {
    expect(getContentType(new FormData())).toBeUndefined();
  });

  it('should return application/json for objects', () => {
    expect(getContentType({ a: 1 })).toBe('application/json');
  });

  it('should return application/x-www-form-urlencoded for URLSearchParams', () => {
    expect(getContentType(new URLSearchParams())).toBe(
      'application/x-www-form-urlencoded'
    );
  });
});

describe('parseResponse', () => {
  it('should parse JSON response', async () => {
    const response = new Response('{"a":1}', {
      headers: { 'Content-Type': 'application/json' },
    });
    const parsed = await parseResponse(response);
    expect(parsed).toEqual({ a: 1 });
  });

  it('should parse text response', async () => {
    const response = new Response('Hello', {
      headers: { 'Content-Type': 'text/plain' },
    });
    const parsed = await parseResponse(response);
    expect(parsed).toBe('Hello');
  });

  it('should parse binary response', async () => {
    const data = new Uint8Array([1, 2, 3]);
    const response = new Response(data, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const parsed = await parseResponse(response);
    expect(parsed).toBeInstanceOf(ArrayBuffer);
  });
});

describe('encodeBase64', () => {
  it('should encode string to Base64', () => {
    const encoded = encodeBase64('test');
    // Base64 of "test" is "dGVzdA=="
    expect(encoded).toBe('dGVzdA==');
  });

  it('should handle special characters', () => {
    const encoded = encodeBase64('hello:world');
    expect(encoded).toBeTruthy();
  });
});

describe('environment detection', () => {
  it('should detect environment', () => {
    // These tests depend on the actual environment
    expect(typeof isBrowser()).toBe('boolean');
    expect(typeof isNode()).toBe('boolean');
    expect(typeof isFetchAvailable()).toBe('boolean');
  });
});
