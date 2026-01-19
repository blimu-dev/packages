import { beforeAll, afterAll } from 'vitest';
import { initMSWServer, setMSWServer } from './helpers/msw-setup';
import { cleanupRegisteredDirectories } from './helpers/sdk-generator';

// Setup MSW before all tests
beforeAll(() => {
  // Initialize MSW server (empty handlers initially, will be set per test)
  const server = initMSWServer();
  setMSWServer(server);
});

// Cleanup after all tests in this file
afterAll(() => {
  const server = initMSWServer();
  server.close();
  setMSWServer(null);

  // Clean up directories registered by tests in this file
  // Each test file has its own cleanup tracker
  cleanupRegisteredDirectories();
});
