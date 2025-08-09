import type { InstantConfig, InstaQLOptions } from "@instantdb/core";
import { type InstantReactWebDatabase, init } from "@instantdb/react";
import { queries } from "@repo/db-core";
import schema, { type AppSchema } from "@repo/db-core/schema";
import type { RegisteredQuery } from "@repo/db-core/utils";
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

// biome-ignore lint/suspicious/noExplicitAny: helper type
const useRegisteredQuery = <TQuery extends RegisteredQuery<any, any>>(
  query: TQuery,
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  args: TQuery extends RegisteredQuery<infer _TArgs, any>
    ? Parameters<TQuery["queryOptions"]>[0]
    : never,
  opts?: InstaQLOptions
) => {
  const queryName = query.name;

  // Log query execution (you can customize this or make it conditional)
  if (process.env.NODE_ENV === "development") {
    console.log(`[InstantDB Query] Executing: ${queryName}`, args);
  }

  const queryParams = query.queryOptions(args);
  const result = baseDb.useQuery(queryParams, opts);

  if (result.error) {
    // Enhanced error logging with query name
    logError(`Query failed: ${queryName}`, {
      queryName,
      args: JSON.stringify(args),
      error: result.error.message,
      operation: "useRegisteredQuery",
    });

    if (process.env.NODE_ENV === "development") {
      console.error(`[InstantDB Query] Failed: ${queryName}`, result.error);
    }
  } else if (process.env.NODE_ENV === "development" && result.data) {
    console.log(`[InstantDB Query] Success: ${queryName}`);
  }

  return result;
};

export const db: Omit<
  InstantReactWebDatabase<AppSchema, InstantConfig<AppSchema>>,
  "useQuery"
> & {
  useRegisteredQuery: typeof useRegisteredQuery;
  registeredQueries: typeof queries;
} = {
  ...baseDb,
  room: baseDb.room,
  getAuth: baseDb.getAuth,
  useRegisteredQuery,
  registeredQueries: queries,
};
