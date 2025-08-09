import type { Exactly, InstaQLParams } from "@instantdb/core";
import type { z } from "zod";
import type { AppSchema } from "./instant.schema";

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

// Helper function to recursively assign names to queries based on their path
function assignQueryNames(
  obj: Record<string, QuerySetItem>,
  prefix = ""
): Record<string, QuerySetItem> {
  const result: Record<string, QuerySetItem> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullName = prefix ? `${prefix}.${key}` : key;

    if ("queryOptions" in value && "handler" in value) {
      // It's a query, assign the name if not already set
      result[key] = {
        ...value,
        name: value.name === "unnamed_query" ? fullName : value.name,
      } as QuerySetItem;
    } else {
      // It's a nested object, recurse
      result[key] = assignQueryNames(
        value as Record<string, QuerySetItem>,
        fullName
      );
    }
  }

  return result;
}

export function querySet<T extends Record<string, QuerySetItem>>(
  internalQuerySet: T
): T {
  return assignQueryNames(internalQuerySet) as T;
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
