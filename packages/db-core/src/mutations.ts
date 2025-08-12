import { id, init, type TransactionChunk } from "@instantdb/core";
import { z } from "zod";
import schema, { type AppSchema } from "./instant.schema";
import { mutation, mutationSet } from "./utils";

export const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "",
  schema,
  useDateObjects: true,
});

const filterChunks = (
  chunks: (
    | TransactionChunk<AppSchema, keyof AppSchema["entities"]>
    | undefined
  )[]
): TransactionChunk<AppSchema, keyof AppSchema["entities"]>[] => {
  return chunks.filter((chunk) => chunk !== undefined);
};

// Example mutations demonstrating usage
export const createUser = mutation({
  args: z.object({
    email: z.string().email(),
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
      // @ts-expect-error - this is a super hack; never do anything like this elsewhere please and thank you and love you
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
