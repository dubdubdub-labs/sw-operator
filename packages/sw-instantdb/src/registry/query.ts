import type {
  Exactly,
  InstantSchemaDef,
  InstaQLParams,
  RoomsDef,
} from "@instantdb/core";
import type { z } from "zod";
import type { RegistryMeta } from "./shared";

// Stricter query handler that enforces exact InstantDB query shape
export type QueryHandler<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<APP_SCHEMA>,
> = (args: z.infer<TArgs>) => Exactly<TQuery, InstaQLParams<APP_SCHEMA>>;

export interface QueryDefinition<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<APP_SCHEMA>,
> {
  args: TArgs;
  handler: QueryHandler<APP_SCHEMA, TArgs, TQuery>;
  meta?: RegistryMeta;
}

export interface RegisteredQuery<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<APP_SCHEMA>,
> extends QueryDefinition<APP_SCHEMA, TArgs, TQuery> {
  name: string;
  queryOptions: (args: z.infer<TArgs>) => TQuery;
}

// Generic, unbound versions (kept for backward-compat) use `any` schema.
// Prefer the schema-bound versions returned by `forSchema<AppSchema>()`.
export type QuerySetItem =
  // biome-ignore lint/suspicious/noExplicitAny: generic registry node
  RegisteredQuery<any, any, any> | { [key: string]: QuerySetItem };

export function query<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
  TQuery extends InstaQLParams<APP_SCHEMA>,
>(definition: {
  args: TArgs;
  handler: (args: z.infer<TArgs>) => Exactly<TQuery, InstaQLParams<APP_SCHEMA>>;
  name?: string;
  meta?: RegistryMeta;
}): RegisteredQuery<APP_SCHEMA, TArgs, TQuery> {
  return {
    ...definition,
    name: definition.name || "unnamed_query",
    // The parameter type already enforces the handler’s shape:
    handler: definition.handler,
    queryOptions: (args: z.infer<TArgs>) => {
      const validatedArgs = definition.args.parse(args);
      // Shape is enforced by the handler type; keep return type precise.
      return definition.handler(validatedArgs);
    },
  };
}
