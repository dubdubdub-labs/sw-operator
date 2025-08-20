import { id, init, type TransactionChunk } from "@instantdb/core";
import { forSchema } from "@repo/sw-instantdb";
import { z } from "zod";
import schema, { type AppSchema } from "./instant.schema";

// Bind once for mutations too
const { mutation, mutationSet } = forSchema<AppSchema>();

export const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "",
  schema,
  useDateObjects: false,
});

const filterChunks = (
  chunks: (
    | TransactionChunk<AppSchema, keyof AppSchema["entities"]>
    | undefined
  )[]
): TransactionChunk<AppSchema, keyof AppSchema["entities"]>[] => {
  return chunks.filter(
    (
      chunk
    ): chunk is TransactionChunk<AppSchema, keyof AppSchema["entities"]> =>
      chunk !== undefined
  );
};

// Example mutations demonstrating usage
export const createUser = mutation({
  args: z.object({
    email: z.email(),
    name: z.string(),
    age: z.number().int().positive().optional(),
  }),
  handler: () => {
    return filterChunks([
      db.tx.todos[id()]?.update({
        "supppppeerr long attrrrrr": "",
      }),
    ]);
  },
});

const editCellValue = mutation({
  name: "editCellValue",
  args: z.object({
    entityName: z.string(),
    attrName: z.string(),
    entityItemId: z.string(),
    value: z.any(),
  }),
  handler: ({ entityName, entityItemId, value, attrName }) => {
    return [
      // @ts-expect-error - intentional explorer hack
      db.tx?.[entityName]?.[entityItemId]?.update({
        [attrName]: value,
      }) ?? [],
    ];
  },
});

// Registry of all mutations for easy access
export const mutations = mutationSet({
  users: {
    create: createUser,
  },
  explorer: {
    editCellValue,
  },
} as const);
