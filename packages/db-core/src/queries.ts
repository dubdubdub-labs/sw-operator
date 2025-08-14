import { forSchema } from "@repo/sw-instantdb";
import { z } from "zod";
import type { AppSchema } from "./instant.schema";

// Bind once: all queries below are checked against AppSchema
const { query, querySet } = forSchema<AppSchema>();

export const getUserById = query({
  args: z.object({
    userId: z.uuid(),
  }),
  handler: ({ userId }) => ({
    $users: {
      $: {
        where: { id: userId },
      },
    },
  }),
});

export const getUserByEmail = query({
  args: z.object({
    email: z.email(),
  }),
  handler: ({ email }) => ({
    $users: {
      $: {
        where: { email },
      },
    },
  }),
});

export const getFilesByPath = query({
  args: z.object({
    pathPrefix: z.string(),
    limit: z.number().int().positive().optional().default(10),
  }),
  handler: ({ pathPrefix, limit }) => ({
    $files: {
      $: {
        where: {
          path: { $like: `${pathPrefix}%` },
        },
        limit,
      },
    },
  }),
});

export const getAllUsers = query({
  args: z.object({
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  handler: ({ limit, offset }) => ({
    $users: {
      $: {
        ...(limit ? { limit } : {}),
        ...(offset ? { offset } : {}),
      },
    },
  }),
});

// Registry of all queries for easy access
export const queries = querySet({
  users: {
    getById: getUserById,
    getByEmail: getUserByEmail,
    getAll: getAllUsers,
  },
  files: {
    getByPath: getFilesByPath,
  },
} as const);
