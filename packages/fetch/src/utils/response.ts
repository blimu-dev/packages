/**
 * Parses a response based on its content type
 * @param response - Fetch Response object
 * @returns Parsed response data
 */
export async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  } else if (contentType.startsWith("text/")) {
    return await response.text();
  } else {
    // Binary or unknown content type - return ArrayBuffer
    return await response.arrayBuffer();
  }
}

/**
 * Checks if a response indicates success (status 200-299)
 * @param response - Fetch Response object
 * @returns true if response is successful
 */
export function isSuccessResponse(response: Response): boolean {
  return response.ok;
}
