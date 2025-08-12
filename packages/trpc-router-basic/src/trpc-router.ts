import { createCallerFactory, t } from "@repo/trpc-core";
import { z } from "zod";

export const trpcRouter = t.router({
  basicQuery: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return `Hello, ${input.name}!`;
    }),
  basicMutation: t.procedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return `Hello, ${input.name}!`;
    }),
});

export const createCaller = createCallerFactory(trpcRouter);

export type TrpcRouter = typeof trpcRouter;
