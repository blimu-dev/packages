import { describe, it, expect, beforeEach } from "vitest";
import { IrBuilderService } from "../ir-builder.service";
import { SchemaConverterService } from "../schema-converter.service";
import {
  createMockOpenAPI30Document,
  createMockOpenAPI31Document,
} from "../../__tests__/helpers/test-utils";
import {
  createMockDocumentWithStreaming30,
  createMockDocumentWithStreaming31,
} from "../../__tests__/helpers/create-mock-document";
import type { Client } from "../../config/config.schema";

describe("IrBuilderService", () => {
  let service: IrBuilderService;
  let schemaConverter: SchemaConverterService;

  beforeEach(() => {
    schemaConverter = new SchemaConverterService();
    service = new IrBuilderService(schemaConverter);
  });

  describe("buildIR", () => {
    it("should build IR from OpenAPI 3.0 document", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);

      expect(ir.services).toBeDefined();
      expect(ir.services.length).toBeGreaterThan(0);
      expect(ir.securitySchemes).toBeDefined();
    });

    it("should build IR from OpenAPI 3.1 document", () => {
      const doc = createMockOpenAPI31Document({
        paths: {
          "/products": {
            get: {
              operationId: "listProducts",
              tags: ["products"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);

      expect(ir.services).toBeDefined();
      expect(ir.services.length).toBeGreaterThan(0);
    });

    it("should collect tags from operations", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: { "200": { description: "OK" } },
            },
          },
          "/products": {
            get: {
              operationId: "listProducts",
              tags: ["products"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const tags = ir.services.map((s) => s.tag);

      expect(tags).toContain("users");
      expect(tags).toContain("products");
    });

    it("should handle untagged operations as 'misc'", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/health": {
            get: {
              operationId: "healthCheck",
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const miscService = ir.services.find((s) => s.tag === "misc");

      expect(miscService).toBeDefined();
      expect(miscService?.operations.length).toBeGreaterThan(0);
    });

    it("should collect security schemes", () => {
      const doc = createMockOpenAPI30Document({
        components: {
          securitySchemes: {
            BearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
            ApiKeyAuth: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
            },
          },
        },
      });

      const ir = service.buildIR(doc);

      expect(ir.securitySchemes.length).toBe(2);
      expect(
        ir.securitySchemes.find((s) => s.key === "BearerAuth")
      ).toBeDefined();
      expect(
        ir.securitySchemes.find((s) => s.key === "ApiKeyAuth")
      ).toBeDefined();
    });

    it("should extract path parameters", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users/{id}": {
            get: {
              operationId: "getUser",
              tags: ["users"],
              parameters: [
                {
                  name: "id",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "users")
        ?.operations.find((o) => o.operationID === "getUser");

      expect(operation?.pathParams.length).toBe(1);
      expect(operation?.pathParams[0].name).toBe("id");
      expect(operation?.pathParams[0].required).toBe(true);
    });

    it("should extract query parameters", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              parameters: [
                {
                  name: "limit",
                  in: "query",
                  required: false,
                  schema: { type: "integer" },
                },
                {
                  name: "offset",
                  in: "query",
                  required: false,
                  schema: { type: "integer" },
                },
              ],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "users")
        ?.operations.find((o) => o.operationID === "listUsers");

      expect(operation?.queryParams.length).toBe(2);
      expect(operation?.queryParams.map((p) => p.name)).toContain("limit");
      expect(operation?.queryParams.map((p) => p.name)).toContain("offset");
    });

    it("should extract request body", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            post: {
              operationId: "createUser",
              tags: ["users"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
              responses: { "201": { description: "Created" } },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "users")
        ?.operations.find((o) => o.operationID === "createUser");

      expect(operation?.requestBody).toBeDefined();
      expect(operation?.requestBody?.required).toBe(true);
      expect(operation?.requestBody?.contentType).toBe("application/json");
    });
  });

  describe("streaming detection", () => {
    it("should detect SSE streaming in OpenAPI 3.0", () => {
      const doc = createMockDocumentWithStreaming30();
      const ir = service.buildIR(doc);

      const operation = ir.services
        .find((s) => s.tag === "events")
        ?.operations.find((o) => o.operationID === "getEvents");

      expect(operation?.response.isStreaming).toBe(true);
      expect(operation?.response.contentType).toBe("text/event-stream");
      expect(operation?.response.streamingFormat).toBe("sse");
    });

    it("should detect SSE streaming in OpenAPI 3.1", () => {
      const doc = createMockDocumentWithStreaming31();
      const ir = service.buildIR(doc);

      const operation = ir.services
        .find((s) => s.tag === "events")
        ?.operations.find((o) => o.operationID === "getEvents");

      expect(operation?.response.isStreaming).toBe(true);
      expect(operation?.response.contentType).toBe("text/event-stream");
      expect(operation?.response.streamingFormat).toBe("sse");
    });

    it("should detect NDJSON streaming", () => {
      const doc = createMockDocumentWithStreaming30();
      const ir = service.buildIR(doc);

      const operation = ir.services
        .find((s) => s.tag === "data")
        ?.operations.find((o) => o.operationID === "getDataStream");

      expect(operation?.response.isStreaming).toBe(true);
      expect(operation?.response.contentType).toBe("application/x-ndjson");
      expect(operation?.response.streamingFormat).toBe("ndjson");
    });

    it("should not mark JSON responses as streaming", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "users")
        ?.operations.find((o) => o.operationID === "listUsers");

      expect(operation?.response.isStreaming).toBe(false);
      expect(operation?.response.contentType).toBe("application/json");
    });
  });

  describe("filterIR", () => {
    it("should filter by include tags", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: { "200": { description: "OK" } },
            },
          },
          "/products": {
            get: {
              operationId: "listProducts",
              tags: ["products"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });

      const fullIR = service.buildIR(doc);
      const client: Client = {
        type: "typescript",
        outDir: "./test",
        packageName: "test",
        name: "TestClient",
        includeTags: ["users"],
      };

      const filteredIR = service.filterIR(fullIR, client);

      expect(filteredIR.services.length).toBe(1);
      expect(filteredIR.services[0].tag).toBe("users");
    });

    it("should filter by exclude tags", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: { "200": { description: "OK" } },
            },
          },
          "/products": {
            get: {
              operationId: "listProducts",
              tags: ["products"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      });

      const fullIR = service.buildIR(doc);
      const client: Client = {
        type: "typescript",
        outDir: "./test",
        packageName: "test",
        name: "TestClient",
        excludeTags: ["products"],
      };

      const filteredIR = service.filterIR(fullIR, client);

      expect(
        filteredIR.services.find((s) => s.tag === "products")
      ).toBeUndefined();
      expect(filteredIR.services.find((s) => s.tag === "users")).toBeDefined();
    });

    it("should filter unused model definitions", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              tags: ["users"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/User",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
            UnusedModel: {
              type: "object",
              properties: {
                value: { type: "string" },
              },
            },
          },
        },
      });

      const fullIR = service.buildIR(doc);
      const client: Client = {
        type: "typescript",
        outDir: "./test",
        packageName: "test",
        name: "TestClient",
        includeTags: ["users"],
      };

      const filteredIR = service.filterIR(fullIR, client);

      const modelNames = filteredIR.modelDefs.map((m) => m.name);
      expect(modelNames).toContain("User");
      expect(modelNames).not.toContain("UnusedModel");
    });
  });

  describe("buildStructuredModels", () => {
    it("should build models from components.schemas", () => {
      const doc = createMockOpenAPI30Document({
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
            Product: {
              type: "object",
              properties: {
                id: { type: "string" },
                price: { type: "number" },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);

      expect(ir.modelDefs.length).toBeGreaterThanOrEqual(2);
      const modelNames = ir.modelDefs.map((m) => m.name);
      expect(modelNames).toContain("User");
      expect(modelNames).toContain("Product");
    });
  });

  describe("type naming with model references", () => {
    it("should use model name from $ref schema for response types", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/auth/refresh": {
            post: {
              operationId: "AuthController_refresh",
              tags: ["Auth"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/RefreshResponse",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            RefreshResponse: {
              type: "object",
              properties: {
                sessionToken: { type: "string" },
              },
              required: ["sessionToken"],
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "Auth")
        ?.operations.find((o) => o.operationID === "AuthController_refresh");

      expect(operation).toBeDefined();
      expect(operation?.response.schema.kind).toBe("ref");
      if (operation?.response.schema.kind === "ref") {
        // Should use the model name directly, not AuthRefreshResponse
        expect(operation.response.schema.ref).toBe("RefreshResponse");
      }
    });

    it("should use model name from $ref schema for request body types", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/auth/signin": {
            post: {
              operationId: "AuthController_signin",
              tags: ["Auth"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/PasswordSignin",
                    },
                  },
                },
              },
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
        components: {
          schemas: {
            PasswordSignin: {
              type: "object",
              properties: {
                email: { type: "string" },
                password: { type: "string" },
              },
              required: ["email", "password"],
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "Auth")
        ?.operations.find((o) => o.operationID === "AuthController_signin");

      expect(operation).toBeDefined();
      expect(operation?.requestBody).toBeDefined();
      if (operation?.requestBody) {
        expect(operation.requestBody.schema.kind).toBe("ref");
        if (operation.requestBody.schema.kind === "ref") {
          // Should use the model name directly, not AuthSigninRequestBody
          expect(operation.requestBody.schema.ref).toBe("PasswordSignin");
        }
      }
    });

    it("should use operation-based naming for inline object schemas", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            post: {
              operationId: "UserController_create",
              tags: ["Users"],
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        email: { type: "string" },
                      },
                      required: ["name", "email"],
                    },
                  },
                },
              },
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "Users")
        ?.operations.find((o) => o.operationID === "UserController_create");

      expect(operation).toBeDefined();
      expect(operation?.requestBody).toBeDefined();
      if (operation?.requestBody) {
        // For inline schemas, should use operation-based naming
        expect(operation.requestBody.schema.kind).toBe("ref");
        if (operation.requestBody.schema.kind === "ref") {
          expect(operation.requestBody.schema.ref).toBe(
            "UsersCreateRequestBody"
          );
        }
      }
    });

    it("should use model name from array of refs", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/users": {
            get: {
              operationId: "UserController_list",
              tags: ["Users"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/User",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "Users")
        ?.operations.find((o) => o.operationID === "UserController_list");

      expect(operation).toBeDefined();
      // The response should be an array of User
      expect(operation?.response.schema.kind).toBe("array");
      if (
        operation?.response.schema.kind === "array" &&
        operation.response.schema.items
      ) {
        expect(operation.response.schema.items.kind).toBe("ref");
        if (operation.response.schema.items.kind === "ref") {
          expect(operation.response.schema.items.ref).toBe("User");
        }
      }
    });

    it("should handle response with inline object schema", () => {
      const doc = createMockOpenAPI30Document({
        paths: {
          "/custom": {
            post: {
              operationId: "CustomController_doSomething",
              tags: ["Custom"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          result: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const ir = service.buildIR(doc);
      const operation = ir.services
        .find((s) => s.tag === "Custom")
        ?.operations.find(
          (o) => o.operationID === "CustomController_doSomething"
        );

      expect(operation).toBeDefined();
      // For inline schemas, should extract and use operation-based naming
      expect(operation?.response.schema.kind).toBe("ref");
      if (operation?.response.schema.kind === "ref") {
        expect(operation.response.schema.ref).toBe("CustomDoSomethingResponse");
      }

      // Should have extracted the type
      const extractedType = ir.modelDefs.find(
        (m) => m.name === "CustomDoSomethingResponse"
      );
      expect(extractedType).toBeDefined();
    });
  });
});
