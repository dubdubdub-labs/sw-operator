import {
  captureException,
  captureMessage,
  init,
  withScope,
} from "@sentry/react";
import { getEnvVar } from "./utils";

let sentryInitialized = false;

export const initSentry = () => {
  if (sentryInitialized) {
    return;
  }

  const dsn = getEnvVar("NEXT_PUBLIC_SENTRY_DSN");

  init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // filter out certain errors if needed
      return event;
    },
  });

  sentryInitialized = true;
};

export const logError = (
  error: Error | string,
  context?: Record<string, unknown>
) => {
  if (!sentryInitialized) {
    // fallback to console.error if Sentry is not initialized
    console.error("DB Client Error:", error, context);
    return;
  }

  if (typeof error === "string") {
    captureMessage(error, "error");
  } else {
    captureException(error);
  }

  // add context if provided
  if (context) {
    withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setTag(key, String(value));
      }
      if (typeof error === "string") {
        captureMessage(error, "error");
      } else {
        captureException(error);
      }
    });
  }
};
