import { beforeAll, afterAll } from 'vitest';
import { initMSWServer, setMSWServer } from './helpers/msw-setup';

// Setup MSW before all tests
beforeAll(() => {
  // Initialize MSW server (empty handlers initially, will be set per test)
  const server = initMSWServer();
  setMSWServer(server);
});

// Cleanup after all tests
afterAll(() => {
  const server = initMSWServer();
  server.close();
  setMSWServer(null);
});
