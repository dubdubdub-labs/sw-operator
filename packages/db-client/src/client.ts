import type { InstantConfig, InstaQLOptions } from "@instantdb/core";
import {
  type InstantReactWebDatabase,
  type InstaQLParams,
  init,
} from "@instantdb/react";
import schema, { type AppSchema } from "@repo/db-core/schema";
import { initSentry, logError } from "./sentry";

const getInstantAppId = () => {
  if (process.env.NEXT_PUBLIC_INSTANT_APP_ID) {
    return process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  }
  throw new Error("NEXT_PUBLIC_INSTANT_APP_ID is not set");
};

const appId = getInstantAppId();

// initialize Sentry for error logging
initSentry();

const baseDb = init({
  appId,
  schema,
});

const useSafeQuery = <Q extends InstaQLParams<AppSchema>>(
  query: Q | null,
  opts?: InstaQLOptions
) => {
  const { ...rest } = baseDb.useQuery<Q>(query, opts);

  if (rest.error) {
    // Log error to Sentry with context
    logError(rest.error.message, {
      query: JSON.stringify(query),
      options: JSON.stringify(opts),
      operation: "useQuery",
    });
  }

  return rest;
};

export const db: InstantReactWebDatabase<
  AppSchema,
  InstantConfig<AppSchema>
> = {
  ...baseDb,
  room: baseDb.room,
  getAuth: baseDb.getAuth,
  useQuery: useSafeQuery,
};
