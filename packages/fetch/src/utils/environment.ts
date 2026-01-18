/**
 * Detects if the code is running in a browser environment
 */
export function isBrowser(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as unknown as { window: unknown }).window !==
      'undefined' &&
    typeof (globalThis as unknown as { window: { document: unknown } }).window
      .document !== 'undefined'
  );
}

/**
 * Detects if the code is running in a Node.js environment
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  );
}

/**
 * Encodes a string to Base64, using the appropriate method for the environment
 * @param str - String to encode
 * @returns Base64 encoded string
 */
export function encodeBase64(str: string): string {
  if (isBrowser()) {
    // Browser environment - use btoa
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    // Fallback for environments where btoa might not be available
    throw new Error(
      'btoa is not available. This should not happen in a browser environment.'
    );
  } else {
    // Node.js environment - use Buffer
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    throw new Error(
      "Buffer is not available. Please ensure you're running in Node.js or provide a polyfill."
    );
  }
}

/**
 * Checks if the native fetch API is available
 * @returns true if fetch is available, false otherwise
 */
export function isFetchAvailable(): boolean {
  return typeof fetch !== 'undefined';
}

/**
 * Checks if AbortController is available
 * @returns true if AbortController is available, false otherwise
 */
export function isAbortControllerAvailable(): boolean {
  return typeof AbortController !== 'undefined';
}

/**
 * Gets a helpful error message if fetch is not available
 * @returns Error message with suggestions
 */
export function getFetchErrorMessage(): string {
  if (isBrowser()) {
    return 'fetch is not available in this browser. Please use a modern browser or provide a polyfill.';
  } else {
    return "fetch is not available. Node.js 22+ includes native fetch. For older versions, please provide a custom fetch implementation (e.g., from 'undici' or 'node-fetch').";
  }
}
