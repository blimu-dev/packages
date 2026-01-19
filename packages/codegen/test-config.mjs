import { defineConfig } from './src/config/config-helper.js';

export default defineConfig({
  spec: 'http://localhost:3020/docs/backend-api/json',
  clients: [
    {
      type: 'typescript',
      outDir: './test-sdk-output',
      packageName: 'test-sdk',
      name: 'TestClient',
      operationIdParser: (operationId) => {
        // Test function transform
        if (operationId.includes('Controller')) {
          return operationId.replace(/Controller/g, '');
        }
        return operationId;
      },
    },
  ],
});
