import { BaseError } from "./base.error";

export type OAuthErrorCode =
  | "INVALID_STATE"
  | "HTTP_ERROR"
  | "TOKEN_EXCHANGE_FAILED"
  | "TOKEN_REFRESH_FAILED"
  | "UNEXPECTED_RESPONSE";

export class OAuthError extends BaseError {}
