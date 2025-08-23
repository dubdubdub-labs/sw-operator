export type ErrorCode =
  | "INVALID_STATE"
  | "HTTP_ERROR"
  | "TOKEN_EXCHANGE_FAILED"
  | "TOKEN_REFRESH_FAILED"
  | "UNEXPECTED_RESPONSE";

export class BaseError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
  }
}
