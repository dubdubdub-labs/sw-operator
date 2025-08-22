import { MorphError } from "./base.error.js";

export class APIError extends MorphError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, "API_ERROR", statusCode, details);
  }
}

export class ValidationError extends MorphError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class AuthenticationError extends MorphError {
  constructor(message = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401);
  }
}

export class NotFoundError extends MorphError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
  }
}

export class RateLimitError extends MorphError {
  readonly retryAfter?: number;

  constructor(message = "Rate limit exceeded", retryAfter?: number) {
    super(message, "RATE_LIMIT", 429);
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends MorphError {
  constructor(message: string, details?: unknown) {
    super(message, "NETWORK_ERROR", undefined, details);
  }
}

export class TimeoutError extends MorphError {
  constructor(message = "Request timed out") {
    super(message, "TIMEOUT", 408);
  }
}

export class ConflictError extends MorphError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFLICT", 409, details);
  }
}

export class ServerError extends MorphError {
  constructor(message = "Internal server error", details?: unknown) {
    super(message, "SERVER_ERROR", 500, details);
  }
}
