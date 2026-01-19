import { describe, it, expect } from 'vitest';
import {
  parseSSEStream,
  parseNDJSONStream,
  parseChunkedStream,
} from '../../src/streaming';

describe('parseSSEStream', () => {
  it('should parse SSE stream', async () => {
    const sseData = 'data: message1\n\ndata: message2\n\n';
    const response = new Response(sseData, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const chunks: string[] = [];
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['message1', 'message2']);
  });

  it('should handle empty stream', async () => {
    const response = new Response('', {
      headers: { 'Content-Type': 'text/event-stream' },
    });

    const chunks: string[] = [];
    for await (const chunk of parseSSEStream(response)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([]);
  });
});

describe('parseNDJSONStream', () => {
  it('should parse NDJSON stream', async () => {
    const ndjsonData = '{"a":1}\n{"b":2}\n{"c":3}\n';
    const response = new Response(ndjsonData, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

    const chunks: unknown[] = [];
    for await (const chunk of parseNDJSONStream(response)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it('should skip invalid JSON lines', async () => {
    const ndjsonData = '{"a":1}\ninvalid\n{"b":2}\n';
    const response = new Response(ndjsonData, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

    const chunks: unknown[] = [];
    const consoleWarn = console.warn;
    console.warn = () => {}; // Suppress warnings in test

    for await (const chunk of parseNDJSONStream(response)) {
      chunks.push(chunk);
    }

    console.warn = consoleWarn;

    expect(chunks).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe('parseChunkedStream', () => {
  it('should parse chunked stream', async () => {
    const textData = 'chunk1chunk2chunk3';
    const response = new Response(textData);

    const chunks: string[] = [];
    for await (const chunk of parseChunkedStream<string>(response)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toBe(textData);
  });
});
