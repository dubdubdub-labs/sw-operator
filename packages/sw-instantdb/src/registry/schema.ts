import type {
  InstantSchemaDef,
  InstaQLParams,
  RoomsDef,
} from "@instantdb/core";
import type { z } from "zod";
import {
  type MutationHandler,
  type MutationSetItem,
  mutation,
  type RegisteredMutation,
} from "./mutation";
import {
  type QueryHandler,
  type QuerySetItem,
  query,
  type RegisteredQuery,
} from "./query";
import type { RegistryMeta } from "./shared";

/** Recursively assign names based on their path */
function assignNames<T extends QuerySetItem | MutationSetItem>(
  obj: Record<string, T>,
  prefix = "",
  defaultName = "unnamed"
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullName = prefix ? `${prefix}.${key}` : key;
    if (
      typeof value === "object" &&
      value !== null &&
      "handler" in value &&
      // biome-ignore lint/suspicious/noExplicitAny: runtime shape
      typeof (value as any).handler === "function"
    ) {
      // It's a query or mutation, assign the name if not already set
      result[key] = {
        ...value,
        name:
          // biome-ignore lint/suspicious/noExplicitAny: runtime shape
          (value as any).name === defaultName ? fullName : (value as any).name,
      } as T;
    } else {
      // It's a nested object, recurse
      result[key] = assignNames(
        // biome-ignore lint/suspicious/noExplicitAny: helper recursion
        value as any,
        fullName,
        defaultName
      ) as T;
    }
  }
  return result;
}

/**
 * ============
 * Schema-bound helpers
 * ============
 *
 * Bind your schema once so `InstaQLParams<APP_SCHEMA>` knows the allowed entity keys.
 * This eliminates the `{ [x: string]: never }` index signature errors.
 */
export function forSchema<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
>() {
  type BoundQuerySetItem =
    // biome-ignore lint/suspicious/noExplicitAny: helper type
    | RegisteredQuery<APP_SCHEMA, any, any>
    | { [key: string]: BoundQuerySetItem };
  type BoundMutationSetItem =
    // biome-ignore lint/suspicious/noExplicitAny: helper type
    | RegisteredMutation<APP_SCHEMA, any>
    | { [key: string]: BoundMutationSetItem };

  const bound = {
    query<
      TArgs extends z.ZodTypeAny,
      TQuery extends InstaQLParams<APP_SCHEMA>,
    >(def: {
      args: TArgs;
      handler: QueryHandler<APP_SCHEMA, TArgs, TQuery>;
      name?: string;
      meta?: RegistryMeta;
    }): RegisteredQuery<APP_SCHEMA, TArgs, TQuery> {
      return query<APP_SCHEMA, TArgs, TQuery>(def);
    },

    mutation<TArgs extends z.ZodTypeAny>(def: {
      args: TArgs;
      handler: MutationHandler<APP_SCHEMA, TArgs>;
      name?: string;
      meta?: RegistryMeta;
    }): RegisteredMutation<APP_SCHEMA, TArgs> {
      return mutation<APP_SCHEMA, TArgs>(def);
    },

    querySet<T extends Record<string, BoundQuerySetItem>>(set: T): T {
      return assignNames(set, "", "unnamed_query") as T;
    },

    mutationSet<T extends Record<string, BoundMutationSetItem>>(set: T): T {
      return assignNames(set, "", "unnamed_mutation") as T;
    },

    // Flatteners (handy for docs, listing, routing, explorer, etc.)
    flattenQuerySet(set: Record<string, BoundQuerySetItem>) {
      const out: Array<
        // biome-ignore lint/suspicious/noExplicitAny: helper type
        RegisteredQuery<APP_SCHEMA, any, any> & {
          path: string;
          parts: string[];
        }
      > = [];
      const walk = (
        node: Record<string, BoundQuerySetItem>,
        prefix: string[]
      ) => {
        for (const [k, v] of Object.entries(node)) {
          const parts = [...prefix, k];
          const path = parts.join(".");
          // biome-ignore lint/suspicious/noExplicitAny: helper type
          if ("handler" in (v as any)) {
            // biome-ignore lint/suspicious/noExplicitAny: helper type
            out.push({ ...(v as any), path, parts });
          } else {
            walk(v as Record<string, BoundQuerySetItem>, parts);
          }
        }
      };
      walk(set, []);
      return out;
    },

    flattenMutationSet(set: Record<string, BoundMutationSetItem>) {
      const out: Array<
        // biome-ignore lint/suspicious/noExplicitAny: helper type
        RegisteredMutation<APP_SCHEMA, any> & { path: string; parts: string[] }
      > = [];
      const walk = (
        node: Record<string, BoundMutationSetItem>,
        prefix: string[]
      ) => {
        for (const [k, v] of Object.entries(node)) {
          const parts = [...prefix, k];
          const path = parts.join(".");
          // biome-ignore lint/suspicious/noExplicitAny: helper type
          if ("handler" in (v as any)) {
            // biome-ignore lint/suspicious/noExplicitAny: helper type
            out.push({ ...(v as any), path, parts });
          } else {
            walk(v as Record<string, BoundMutationSetItem>, parts);
          }
        }
      };
      walk(set, []);
      return out;
    },
  };

  return bound;
}
