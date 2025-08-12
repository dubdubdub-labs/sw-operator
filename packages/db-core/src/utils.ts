import type {
  Exactly,
  InstantCoreDatabase,
  InstaQLParams,
  TransactionChunk,
} from "@instantdb/core";
import type { z } from "zod";
import type { AppSchema } from "./instant.schema";

export type DBCore = Omit<
  InstantCoreDatabase<AppSchema, true>,
  | "_reactor"
  | "subscribeQuery"
  | "subscribeAuth"
  | "subscribeConnectionStatus"
  | "joinRoom"
  | "shutdown"
>;

// Stricter query handler that enforces exact InstantDB query shape
export type QueryHandler<
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<AppSchema>,
> = (args: z.infer<TArgs>) => Exactly<TQuery, InstaQLParams<AppSchema>>;

export interface QueryDefinition<
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<AppSchema>,
> {
  args: TArgs;
  handler: QueryHandler<TArgs, TQuery>;
}

export interface RegisteredQuery<
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<AppSchema>,
> extends QueryDefinition<TArgs, TQuery> {
  name: string;
  queryOptions: (args: z.infer<TArgs>) => TQuery;
}

// Type for a query or a nested group of queries
export type QuerySetItem =
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  RegisteredQuery<any, any> | { [key: string]: QuerySetItem };

// Type for a mutation or a nested group of mutations
export type MutationSetItem =
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  RegisteredMutation<any> | { [key: string]: MutationSetItem };

// Generic helper function to recursively assign names based on their path
function assignNames<T extends QuerySetItem | MutationSetItem>(
  obj: Record<string, T>,
  prefix = "",
  defaultName = "unnamed"
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullName = prefix ? `${prefix}.${key}` : key;

    if ("handler" in value && typeof value.handler === "function") {
      // It's a query or mutation, assign the name if not already set
      result[key] = {
        ...value,
        name: value.name === defaultName ? fullName : value.name,
      } as T;
    } else {
      // It's a nested object, recurse
      result[key] = assignNames(
        // biome-ignore lint/suspicious/noExplicitAny: helper type
        value as any,
        fullName,
        defaultName
      ) as T;
    }
  }

  return result;
}

export function querySet<T extends Record<string, QuerySetItem>>(
  internalQuerySet: T
): T {
  return assignNames(internalQuerySet, "", "unnamed_query") as T;
}

export function mutationSet<T extends Record<string, MutationSetItem>>(
  internalMutationSet: T
): T {
  return assignNames(internalMutationSet, "", "unnamed_mutation") as T;
}

export function query<
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<AppSchema>,
>(definition: {
  args: TArgs;
  handler: (args: z.infer<TArgs>) => Exactly<TQuery, InstaQLParams<AppSchema>>;
  name?: string;
}): RegisteredQuery<TArgs, TQuery> {
  return {
    ...definition,
    name: definition.name || "unnamed_query",
    handler: definition.handler satisfies QueryHandler<TArgs, TQuery>,
    queryOptions: (args: z.infer<TArgs>) => {
      const validatedArgs = definition.args.parse(args);
      return definition.handler(validatedArgs) satisfies TQuery;
    },
  };
}

export type MutationHandler<TArgs extends z.ZodTypeAny> = (
  args: z.infer<TArgs>
) => TransactionChunk<AppSchema, keyof AppSchema["entities"]>[];

interface MutationDefinition<TArgs extends z.ZodTypeAny> {
  args: TArgs;
  handler: MutationHandler<TArgs>;
}

export interface RegisteredMutation<TArgs extends z.ZodTypeAny>
  extends MutationDefinition<TArgs> {
  name: string;
  mutationOptions: (
    args: z.infer<TArgs>
  ) => TransactionChunk<AppSchema, keyof AppSchema["entities"]>[];
}

export function mutation<TArgs extends z.ZodTypeAny>(definition: {
  args: TArgs;
  handler: MutationHandler<TArgs>;
  name?: string;
}): RegisteredMutation<TArgs> {
  return {
    ...definition,
    name: definition.name || "unnamed_mutation",
    handler: definition.handler satisfies MutationDefinition<TArgs>["handler"],
    mutationOptions: (args: z.infer<TArgs>) => {
      const validatedArgs = definition.args.parse(args);
      return definition.handler(validatedArgs);
    },
  };
}
