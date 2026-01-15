import { generate } from "./dist/index.js";

await generate({
  spec: "http://localhost:3020/docs/backend-api/json",
  clients: [
    {
      type: "typescript",
      outDir: "./test-api-output",
      packageName: "test-api",
      name: "ApiClient",
      operationIdParser: (operationId, method, path) => {
        console.log(`Parsing: ${operationId} (${method} ${path})`);
        return operationId;
      },
    },
  ],
});

console.log("✅ Programmatic API works!");
