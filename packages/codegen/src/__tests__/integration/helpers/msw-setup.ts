import { setupServer } from "msw/node";
import { RequestHandler } from "msw";

let server: ReturnType<typeof setupServer> | null = null;

/**
 * Setup MSW server with handlers
 * @param handlers - Array of MSW request handlers
 */
export function setupMSW(handlers: RequestHandler[]): void {
  if (server) {
    server.resetHandlers(...handlers);
  } else {
    server = setupServer(...handlers);
    server.listen({ onUnhandledRequest: "warn" });
  }
}

/**
 * Teardown MSW server
 */
export function teardownMSW(): void {
  if (server) {
    server.close();
    server = null;
  }
}

/**
 * Reset MSW handlers
 * @param handlers - New handlers to use
 */
export function resetMSWHandlers(handlers: RequestHandler[]): void {
  if (server) {
    server.resetHandlers(...handlers);
  }
}

/**
 * Get the current MSW server instance
 */
export function getMSWServer(): ReturnType<typeof setupServer> | null {
  return server;
}
