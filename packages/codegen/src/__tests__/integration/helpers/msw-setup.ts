import { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';

// Global server instance - will be initialized by setup.ts
let server: ReturnType<typeof setupServer> | null = null;

/**
 * Initialize MSW server (called from setup.ts)
 */
export function initMSWServer(): ReturnType<typeof setupServer> {
  if (!server) {
    server = setupServer();
    server.listen({ onUnhandledRequest: 'warn' });
  }
  return server;
}

/**
 * Get the current MSW server instance
 */
export function getMSWServer(): ReturnType<typeof setupServer> | null {
  return server;
}

/**
 * Set the MSW server instance (used by setup.ts)
 */
export function setMSWServer(
  instance: ReturnType<typeof setupServer> | null
): void {
  server = instance;
}

/**
 * Setup MSW server with handlers
 * @param handlers - Array of MSW request handlers
 */
export function setupMSW(handlers: RequestHandler[]): void {
  if (!server) {
    // If server not initialized, initialize it
    server = initMSWServer();
  }
  // Use the handlers (adds them to the server)
  server.use(...handlers);
}

/**
 * Teardown MSW server (no-op since server is managed globally)
 */
export function teardownMSW(): void {
  // Don't close the server here - it's managed globally
  // Just reset handlers
  if (server) {
    server.resetHandlers();
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
