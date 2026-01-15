import { describe, it, expect } from "vitest";
import {
  FetchError,
  ClientError,
  ServerError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
  createFetchError,
} from "../../src/errors";

describe("FetchError", () => {
  it("should create a FetchError with status and data", () => {
    const error = new FetchError("Test error", 404, { message: "Not found" });
    expect(error.message).toBe("Test error");
    expect(error.status).toBe(404);
    expect(error.data).toEqual({ message: "Not found" });
    expect(error.name).toBe("FetchError");
  });

  it("should be an instance of Error", () => {
    const error = new FetchError("Test", 500);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FetchError);
  });
});

describe("ClientError", () => {
  it("should create a ClientError", () => {
    const error = new ClientError("Bad request", 400);
    expect(error.status).toBe(400);
    expect(error.name).toBe("ClientError");
    expect(error).toBeInstanceOf(FetchError);
    expect(error).toBeInstanceOf(ClientError);
  });
});

describe("ServerError", () => {
  it("should create a ServerError", () => {
    const error = new ServerError("Server error", 500);
    expect(error.status).toBe(500);
    expect(error.name).toBe("ServerError");
    expect(error).toBeInstanceOf(FetchError);
    expect(error).toBeInstanceOf(ServerError);
  });
});

describe("Specific Error Classes", () => {
  it("should create BadRequestError", () => {
    const error = new BadRequestError();
    expect(error.status).toBe(400);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(BadRequestError);
  });

  it("should create UnauthorizedError", () => {
    const error = new UnauthorizedError();
    expect(error.status).toBe(401);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it("should create NotFoundError", () => {
    const error = new NotFoundError();
    expect(error.status).toBe(404);
    expect(error).toBeInstanceOf(ClientError);
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it("should create InternalServerError", () => {
    const error = new InternalServerError();
    expect(error.status).toBe(500);
    expect(error).toBeInstanceOf(ServerError);
    expect(error).toBeInstanceOf(InternalServerError);
  });
});

describe("createFetchError", () => {
  it("should create BadRequestError for 400", () => {
    const error = createFetchError(400);
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.status).toBe(400);
  });

  it("should create UnauthorizedError for 401", () => {
    const error = createFetchError(401);
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.status).toBe(401);
  });

  it("should create NotFoundError for 404", () => {
    const error = createFetchError(404);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.status).toBe(404);
  });

  it("should create InternalServerError for 500", () => {
    const error = createFetchError(500);
    expect(error).toBeInstanceOf(InternalServerError);
    expect(error.status).toBe(500);
  });

  it("should create generic ClientError for other 4xx", () => {
    const error = createFetchError(418);
    expect(error).toBeInstanceOf(ClientError);
    expect(error.status).toBe(418);
  });

  it("should create generic ServerError for other 5xx", () => {
    const error = createFetchError(501);
    expect(error).toBeInstanceOf(ServerError);
    expect(error.status).toBe(501);
  });

  it("should create base FetchError for unknown status codes", () => {
    const error = createFetchError(299);
    expect(error).toBeInstanceOf(FetchError);
    expect(error.status).toBe(299);
  });

  it("should include custom message and data", () => {
    const data = { detail: "Custom error" };
    const error = createFetchError(404, "Custom message", data);
    expect(error.message).toBe("Custom message");
    expect(error.data).toEqual(data);
  });
});

describe("instanceof checks", () => {
  it("should allow instanceof checks in catch blocks", () => {
    const error = createFetchError(404, "Not found");
    expect(error instanceof NotFoundError).toBe(true);
    expect(error instanceof ClientError).toBe(true);
    expect(error instanceof FetchError).toBe(true);
    expect(error instanceof ServerError).toBe(false);
  });
});
