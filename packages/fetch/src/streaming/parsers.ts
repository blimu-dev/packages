/**
 * Parse Server-Sent Events (SSE) stream
 * Extracts data fields from text/event-stream format
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<string, void, unknown> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      let currentEvent: { type?: string; data?: string; id?: string } = {};

      for (const line of lines) {
        if (line.trim() === '') {
          // Empty line indicates end of event
          if (currentEvent.data !== undefined) {
            yield currentEvent.data;
          }
          currentEvent = {};
          continue;
        }

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const field = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        if (field === 'data') {
          currentEvent.data = currentEvent.data
            ? currentEvent.data + '\n' + value
            : value;
        } else if (field === 'event') {
          currentEvent.type = value;
        } else if (field === 'id') {
          currentEvent.id = value;
        }
      }
    }

    // Handle any remaining event in buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      let currentEvent: { data?: string } = {};
      for (const line of lines) {
        if (line.trim() === '' && currentEvent.data !== undefined) {
          yield currentEvent.data;
          currentEvent = {};
          continue;
        }
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const field = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (field === 'data') {
            currentEvent.data = currentEvent.data
              ? currentEvent.data + '\n' + value
              : value;
          }
        }
      }
      if (currentEvent.data !== undefined) {
        yield currentEvent.data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

type AnyParsedNDJSON = string | object | ArrayBuffer | unknown;

/**
 * Parse NDJSON (Newline-Delimited JSON) stream
 * Yields each JSON object as it arrives
 */
export async function* parseNDJSONStream<T = AnyParsedNDJSON>(
  response: Response
): AsyncGenerator<T, void, unknown> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;

        try {
          const parsed = JSON.parse(trimmed) as T;
          yield parsed;
        } catch {
          // Skip invalid JSON lines
          console.warn('Skipping invalid JSON line:', trimmed);
        }
      }
    }

    // Handle any remaining line in buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim()) as T;
        yield parsed;
      } catch {
        // Skip invalid JSON
        console.warn('Skipping invalid JSON in buffer:', buffer.trim());
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse generic chunked stream
 * Yields raw chunks as strings
 */
export async function* parseChunkedStream<T = string>(
  response: Response
): AsyncGenerator<T, void, unknown> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      yield chunk as T;
    }
  } finally {
    reader.releaseLock();
  }
}
