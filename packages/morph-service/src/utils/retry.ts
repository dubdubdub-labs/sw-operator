export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  jitter?: boolean;
}

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10_000,
  exponentialBase: 2,
  jitter: true,
};

export const calculateDelay = (
  attempt: number,
  config: Required<RetryConfig>
): number => {
  const exponentialDelay =
    config.baseDelay * config.exponentialBase ** (attempt - 1);
  const delay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter up to 25% of the delay
    return delay + Math.random() * delay * 0.25;
  }

  return delay;
};

export const isRetryableError = (error: unknown): boolean => {
  if (
    error instanceof Error &&
    (error.message.includes("ECONNREFUSED") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ENOTFOUND"))
  ) {
    return true;
  }

  // Check for retryable HTTP status codes
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    // Retry on 429 (rate limit), 502 (bad gateway), 503 (service unavailable), 504 (gateway timeout)
    return [429, 502, 503, 504].includes(statusCode);
  }

  return false;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
