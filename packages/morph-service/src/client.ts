import type { Logger } from "@repo/logger";
import { createLogger } from "@repo/logger";
import { z } from "zod";
import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_USER_AGENT,
} from "./constants.js";
import {
  APIError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
  ValidationError,
} from "./errors/index.js";
import {
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  type RetryConfig,
  sleep,
} from "./utils/retry.js";
import { URLBuilder } from "./utils/url-builder.js";

export interface MorphClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  logger?: Logger;
}

export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

export class MorphClient {
  private readonly apiKey: string;
  private readonly urlBuilder: URLBuilder;
  private readonly timeout: number;
  private readonly retryConfig: Required<RetryConfig>;
  private readonly logger: Logger;

  constructor(config: MorphClientConfig) {
    if (!config.apiKey) {
      throw new ValidationError("API key is required");
    }

    this.apiKey = config.apiKey;
    this.urlBuilder = new URLBuilder(config.baseUrl ?? DEFAULT_BASE_URL);
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };
    this.logger = config.logger ?? createLogger({ prefix: "MorphClient" });
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const {
      method,
      path,
      params,
      body,
      headers = {},
      timeout = this.timeout,
    } = options;

    const url = this.urlBuilder.build(path, params);

    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": DEFAULT_USER_AGENT,
      ...headers,
    };

    const requestBody = body ? JSON.stringify(body) : undefined;

    this.logger.debug(`${method} ${url}`, {
      params,
      hasBody: !!body,
    });

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        // Handle empty responses
        if (
          response.status === 204 ||
          response.headers.get("content-length") === "0"
        ) {
          return undefined as T;
        }

        const data = await response.json();

        this.logger.debug(`${method} ${url} succeeded`, {
          status: response.status,
        });

        return data as T;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.name === "AbortError") {
          throw new TimeoutError(
            `Request to ${url} timed out after ${timeout}ms`
          );
        }

        if (
          !isRetryableError(error) ||
          attempt === this.retryConfig.maxAttempts
        ) {
          throw this.wrapError(error);
        }

        const delay = calculateDelay(attempt, this.retryConfig);
        this.logger.warn(`Request failed, retrying in ${delay}ms`, {
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        });

        await sleep(delay);
      }
    }

    throw this.wrapError(lastError);
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: unknown;

    try {
      errorData = await response.json();
    } catch {
      // If we can't parse the error response, use a generic message
      errorData = { message: response.statusText };
    }

    const message = this.extractErrorMessage(errorData);

    switch (response.status) {
      case 400:
        throw new ValidationError(message, errorData);
      case 401:
        throw new AuthenticationError(message);
      case 404:
        throw new NotFoundError("Resource", message);
      case 429: {
        const retryAfter = response.headers.get("Retry-After");
        throw new RateLimitError(
          message,
          retryAfter ? Number.parseInt(retryAfter, 10) : undefined
        );
      }
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServerError(message, errorData);
      default:
        throw new APIError(message, response.status, errorData);
    }
  }

  private extractErrorMessage(errorData: unknown): string {
    if (typeof errorData === "string") {
      return errorData;
    }

    if (typeof errorData === "object" && errorData !== null) {
      if ("detail" in errorData) {
        const detail = (errorData as { detail: unknown }).detail;
        if (Array.isArray(detail) && detail.length > 0) {
          // Handle validation errors from FastAPI
          return detail
            .map((err) => {
              if (typeof err === "object" && err !== null && "msg" in err) {
                return (err as { msg: string }).msg;
              }
              return String(err);
            })
            .join(", ");
        }
        if (typeof detail === "string") {
          return detail;
        }
      }

      if (
        "message" in errorData &&
        typeof (errorData as { message: unknown }).message === "string"
      ) {
        return (errorData as { message: string }).message;
      }

      if (
        "error" in errorData &&
        typeof (errorData as { error: unknown }).error === "string"
      ) {
        return (errorData as { error: string }).error;
      }
    }

    return "An unknown error occurred";
  }

  private wrapError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return new NetworkError("Network request failed", error);
      }
      return error;
    }

    return new Error(String(error));
  }

  validateResponse<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = `Response validation failed: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`;
        throw new ValidationError(message, error.issues);
      }
      throw error;
    }
  }
}
