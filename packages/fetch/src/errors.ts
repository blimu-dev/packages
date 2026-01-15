/**
 * Base error class for all fetch-related errors
 */
export class FetchError<T = unknown> extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: T,
    public readonly headers?: Headers
  ) {
    super(message);
    this.name = "FetchError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError);
    }
  }
}

/**
 * Base class for all 4xx client errors
 */
export class ClientError<T = unknown> extends FetchError<T> {
  constructor(message: string, status: number, data?: T, headers?: Headers) {
    super(message, status, data, headers);
    this.name = "ClientError";
  }
}

/**
 * Base class for all 5xx server errors
 */
export class ServerError<T = unknown> extends FetchError<T> {
  constructor(message: string, status: number, data?: T, headers?: Headers) {
    super(message, status, data, headers);
    this.name = "ServerError";
  }
}

// 4xx Client Errors
export class BadRequestError<T = unknown> extends ClientError<T> {
  constructor(message: string = "Bad Request", data?: T, headers?: Headers) {
    super(message, 400, data, headers);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError<T = unknown> extends ClientError<T> {
  constructor(message: string = "Unauthorized", data?: T, headers?: Headers) {
    super(message, 401, data, headers);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError<T = unknown> extends ClientError<T> {
  constructor(message: string = "Forbidden", data?: T, headers?: Headers) {
    super(message, 403, data, headers);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError<T = unknown> extends ClientError<T> {
  constructor(message: string = "Not Found", data?: T, headers?: Headers) {
    super(message, 404, data, headers);
    this.name = "NotFoundError";
  }
}

export class MethodNotAllowedError<T = unknown> extends ClientError<T> {
  constructor(
    message: string = "Method Not Allowed",
    data?: T,
    headers?: Headers
  ) {
    super(message, 405, data, headers);
    this.name = "MethodNotAllowedError";
  }
}

export class ConflictError<T = unknown> extends ClientError<T> {
  constructor(message: string = "Conflict", data?: T, headers?: Headers) {
    super(message, 409, data, headers);
    this.name = "ConflictError";
  }
}

export class UnprocessableEntityError<T = unknown> extends ClientError<T> {
  constructor(
    message: string = "Unprocessable Entity",
    data?: T,
    headers?: Headers
  ) {
    super(message, 422, data, headers);
    this.name = "UnprocessableEntityError";
  }
}

export class TooManyRequestsError<T = unknown> extends ClientError<T> {
  constructor(
    message: string = "Too Many Requests",
    data?: T,
    headers?: Headers
  ) {
    super(message, 429, data, headers);
    this.name = "TooManyRequestsError";
  }
}

// 5xx Server Errors
export class InternalServerError<T = unknown> extends ServerError<T> {
  constructor(
    message: string = "Internal Server Error",
    data?: T,
    headers?: Headers
  ) {
    super(message, 500, data, headers);
    this.name = "InternalServerError";
  }
}

export class BadGatewayError<T = unknown> extends ServerError<T> {
  constructor(message: string = "Bad Gateway", data?: T, headers?: Headers) {
    super(message, 502, data, headers);
    this.name = "BadGatewayError";
  }
}

export class ServiceUnavailableError<T = unknown> extends ServerError<T> {
  constructor(
    message: string = "Service Unavailable",
    data?: T,
    headers?: Headers
  ) {
    super(message, 503, data, headers);
    this.name = "ServiceUnavailableError";
  }
}

export class GatewayTimeoutError<T = unknown> extends ServerError<T> {
  constructor(
    message: string = "Gateway Timeout",
    data?: T,
    headers?: Headers
  ) {
    super(message, 504, data, headers);
    this.name = "GatewayTimeoutError";
  }
}

/**
 * Factory function to create the appropriate error class based on status code
 */
export function createFetchError<T = unknown>(
  status: number,
  message?: string,
  data?: T,
  headers?: Headers
): FetchError<T> {
  const defaultMessage = message || `HTTP ${status}`;

  // 4xx Client Errors
  switch (status) {
    case 400:
      return new BadRequestError(defaultMessage, data, headers);
    case 401:
      return new UnauthorizedError(defaultMessage, data, headers);
    case 403:
      return new ForbiddenError(defaultMessage, data, headers);
    case 404:
      return new NotFoundError(defaultMessage, data, headers);
    case 405:
      return new MethodNotAllowedError(defaultMessage, data, headers);
    case 409:
      return new ConflictError(defaultMessage, data, headers);
    case 422:
      return new UnprocessableEntityError(defaultMessage, data, headers);
    case 429:
      return new TooManyRequestsError(defaultMessage, data, headers);
    // Generic 4xx
    case 402:
    case 406:
    case 407:
    case 408:
    case 410:
    case 411:
    case 412:
    case 413:
    case 414:
    case 415:
    case 416:
    case 417:
    case 418:
    case 421:
    case 423:
    case 424:
    case 425:
    case 426:
    case 428:
    case 431:
    case 451:
      return new ClientError(defaultMessage, status, data, headers);

    // 5xx Server Errors
    case 500:
      return new InternalServerError(defaultMessage, data, headers);
    case 502:
      return new BadGatewayError(defaultMessage, data, headers);
    case 503:
      return new ServiceUnavailableError(defaultMessage, data, headers);
    case 504:
      return new GatewayTimeoutError(defaultMessage, data, headers);
    // Generic 5xx
    case 501:
    case 505:
    case 506:
    case 507:
    case 508:
    case 510:
    case 511:
      return new ServerError(defaultMessage, status, data, headers);

    default:
      // For any other status code, return base FetchError
      return new FetchError(defaultMessage, status, data, headers);
  }
}
