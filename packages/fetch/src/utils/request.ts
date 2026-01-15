/**
 * Serializes query parameters into a URLSearchParams object
 * Handles arrays, objects, and primitive values
 */
export function serializeQueryParams(
  query: Record<string, any>
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      // Append each array item
      for (const item of value) {
        if (item !== undefined && item !== null) {
          params.append(key, String(item));
        }
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

/**
 * Builds a URL with query parameters
 * @param baseUrl - Base URL
 * @param path - Path to append
 * @param query - Query parameters object
 * @returns Complete URL with query string
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, any>
): URL {
  // Normalize path - remove trailing slash if present (except for root)
  let normalizedPath = path || "";
  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  const url = new URL(normalizedPath, baseUrl);

  if (query) {
    const params = serializeQueryParams(query);
    // Merge with existing search params
    // Get all unique keys first
    const keys = Array.from(new Set(params.keys()));
    for (const key of keys) {
      // Remove existing values for this key
      url.searchParams.delete(key);
      // Append all values (handles arrays correctly)
      for (const value of params.getAll(key)) {
        url.searchParams.append(key, value);
      }
    }
  }

  return url;
}

/**
 * Determines the content type from a body value
 * @param body - Request body
 * @returns Content type string or undefined
 */
export function getContentType(body: unknown): string | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }

  if (body instanceof FormData) {
    // FormData sets its own content-type with boundary
    return undefined; // Let the browser set it
  }

  if (body instanceof URLSearchParams) {
    return "application/x-www-form-urlencoded";
  }

  if (typeof body === "string") {
    // Try to detect if it's JSON
    try {
      JSON.parse(body);
      return "application/json";
    } catch {
      return "text/plain";
    }
  }

  if (typeof body === "object") {
    return "application/json";
  }

  return undefined;
}

/**
 * Serializes a request body based on its type
 * @param body - Request body to serialize
 * @returns Serialized body (string, FormData, Blob, ArrayBuffer, etc.)
 */
export function serializeBody(body: unknown): RequestInit["body"] | null {
  if (body === null || body === undefined) {
    return null;
  }

  // If it's already a valid body type, return as-is
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body as RequestInit["body"];
  }

  // For objects, serialize to JSON
  if (typeof body === "object") {
    return JSON.stringify(body);
  }

  // For primitives, convert to string
  return String(body);
}
