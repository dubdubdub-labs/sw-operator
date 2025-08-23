export type PlatformErrorCode =
  | "HTTP_ERROR"
  | "UNEXPECTED_RESPONSE"
  | "VALIDATION_ERROR";

export class BaseError extends Error {
  readonly code: PlatformErrorCode;
  readonly cause?: unknown;

  constructor(code: PlatformErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
  }
}
