export default {
  spec: 'http://localhost:3020/docs/backend-api/json',
  clients: [
    {
      type: 'typescript',
      outDir: './test-default-config-output',
      packageName: 'test-default',
      name: 'DefaultClient',
    },
  ],
};
