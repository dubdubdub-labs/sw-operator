import type { InstantConfig, InstaQLOptions } from "@instantdb/core";
import { type InstantReactWebDatabase, init } from "@instantdb/react";
import { mutations, queries } from "@repo/db-core";
import schema, { type AppSchema } from "@repo/db-core/schema";
import type { RegisteredMutation, RegisteredQuery } from "@repo/db-core/utils";
import { useNamespacesQuery, useSchemaQuery } from "./explorer-queries";
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
  // @ts-expect-error - __adminToken is not an official option; we're using it as a hack for our db explorer
  __adminToken: process.env.NEXT_PUBLIC_INSTANT_ADMIN_TOKEN,
  devtool: false,
  useDateObjects: true,
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

// biome-ignore lint/suspicious/noExplicitAny: helper type
const useRegisteredMutation = <TMutation extends RegisteredMutation<any>>(
  mutation: TMutation,
  args: TMutation extends RegisteredMutation<infer _TArgs>
    ? Parameters<TMutation["mutationOptions"]>[0]
    : never
) => {
  const mutationName = mutation.name;

  const mutate = async () => {
    try {
      const result = await baseDb.transact(mutation.mutationOptions(args));

      if (process.env.NODE_ENV === "development") {
        console.log(`[InstantDB Mutation] Success: ${mutationName}`);
      }

      return result;
    } catch (error) {
      logError(`Mutation failed: ${mutationName}`, {
        mutationName,
        args: JSON.stringify(args),
        error: error instanceof Error ? error.message : String(error),
        operation: "useRegisteredMutation",
      });

      if (process.env.NODE_ENV === "development") {
        console.error(`[InstantDB Mutation] Failed: ${mutationName}`, error);
      }

      throw error;
    }
  };

  return { mutate };
};

// Non-hook version for executing registered mutations
const executeRegisteredMutation = async <
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  TMutation extends RegisteredMutation<any>,
>(
  mutation: TMutation,
  args: TMutation extends RegisteredMutation<infer _TArgs>
    ? Parameters<TMutation["mutationOptions"]>[0]
    : never
) => {
  const mutationName = mutation.name;

  try {
    const result = await baseDb.transact(mutation.mutationOptions(args));

    if (process.env.NODE_ENV === "development") {
      console.log(`[InstantDB Mutation] Success: ${mutationName}`);
    }

    return result;
  } catch (error) {
    logError(`Mutation failed: ${mutationName}`, {
      mutationName,
      args: JSON.stringify(args),
      error: error instanceof Error ? error.message : String(error),
      operation: "executeRegisteredMutation",
    });

    if (process.env.NODE_ENV === "development") {
      console.error(`[InstantDB Mutation] Failed: ${mutationName}`, error);
    }

    throw error;
  }
};

export const db: Omit<
  InstantReactWebDatabase<AppSchema, InstantConfig<AppSchema>>,
  "useQuery"
> & {
  useRegisteredQuery: typeof useRegisteredQuery;
  useRegisteredMutation: typeof useRegisteredMutation;
  executeRegisteredMutation: typeof executeRegisteredMutation;
  registeredQueries: typeof queries;
  registeredMutations: typeof mutations;
  explorer: {
    useSchemaQuery: typeof useSchemaQuery;
    useNamespacesQuery: typeof useNamespacesQuery;
  };
} = {
  ...baseDb,
  room: baseDb.room,
  getAuth: baseDb.getAuth,
  useRegisteredQuery,
  useRegisteredMutation,
  executeRegisteredMutation,
  registeredQueries: queries,
  registeredMutations: mutations,
  explorer: {
    useSchemaQuery,
    useNamespacesQuery,
  },
};

export type { UseNamespacesQueryProps } from "./explorer-queries";
