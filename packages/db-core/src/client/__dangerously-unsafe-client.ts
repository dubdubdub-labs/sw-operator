import {
  type InstantConfig,
  type InstantReactWebDatabase,
  type InstantUnknownSchemaDef,
  init,
} from "@instantdb/react";
import type { RegisteredMutation } from "@repo/sw-instantdb";
import { logError } from "../sentry";

/**
 * This is a dangerous untyped client that has ~root access to the database
 *
 * It is only used for the db explorer and should not be used for any other purpose
 */
const baseDangerousUnsafeDb = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "",
  // @ts-expect-error - __adminToken is not an official option; we're using it as a hack for our db explorer
  __adminToken: process.env.NEXT_PUBLIC_INSTANT_APP_ADMIN_TOKEN,
  devtool: false,
  useDateObjects: false,
});

// Non-hook version for executing registered mutations
const executeRegisteredMutation = async <
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  TMutation extends RegisteredMutation<InstantUnknownSchemaDef, any>,
>(
  mutation: TMutation,
  args: TMutation extends RegisteredMutation<
    InstantUnknownSchemaDef,
    infer _TArgs
  >
    ? Parameters<TMutation["mutationOptions"]>[0]
    : never
) => {
  const mutationName = mutation.name;

  try {
    const result = await baseDangerousUnsafeDb.transact(
      mutation.mutationOptions(args)
    );

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

export const dangerousUnsafeDb: Omit<
  InstantReactWebDatabase<
    InstantUnknownSchemaDef,
    InstantConfig<InstantUnknownSchemaDef, boolean>
  >,
  "room" | "getAuth"
> & {
  executeRegisteredMutation: typeof executeRegisteredMutation;
} = {
  ...baseDangerousUnsafeDb,
  executeRegisteredMutation,
};
