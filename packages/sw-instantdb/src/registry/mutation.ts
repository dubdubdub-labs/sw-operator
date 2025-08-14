import type {
  InstantSchemaDef,
  RoomsDef,
  TransactionChunk,
} from "@instantdb/core";
import type { z } from "zod";
import type { RegistryMeta } from "./shared";

export interface MutationDefinition<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
> {
  args: TArgs;
  handler: MutationHandler<APP_SCHEMA, TArgs>;
  meta?: RegistryMeta;
}

export type MutationHandler<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
> = (
  args: z.infer<TArgs>
) => TransactionChunk<APP_SCHEMA, keyof APP_SCHEMA["entities"]>[];

export interface RegisteredMutation<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
> extends MutationDefinition<APP_SCHEMA, TArgs> {
  name: string;
  mutationOptions: (
    args: z.infer<TArgs>
  ) => TransactionChunk<APP_SCHEMA, keyof APP_SCHEMA["entities"]>[];
}

// Type for a mutation or a nested group of mutations (unbound; prefer bound)
export type MutationSetItem =
  // biome-ignore lint/suspicious/noExplicitAny: generic registry node
  RegisteredMutation<any, any> | { [key: string]: MutationSetItem };

export function mutation<
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>,
  TArgs extends z.ZodTypeAny,
>(definition: {
  args: TArgs;
  handler: MutationHandler<APP_SCHEMA, TArgs>;
  name?: string;
  meta?: RegistryMeta;
}): RegisteredMutation<APP_SCHEMA, TArgs> {
  return {
    ...definition,
    name: definition.name || "unnamed_mutation",
    handler: definition.handler,
    mutationOptions: (args: z.infer<TArgs>) => {
      const validatedArgs = definition.args.parse(args);
      return definition.handler(validatedArgs);
    },
  };
}
