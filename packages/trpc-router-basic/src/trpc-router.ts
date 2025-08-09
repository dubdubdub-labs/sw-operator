import { t } from "@repo/trpc-core";
import { z } from "zod";

export const trpcRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return `Hello, ${input.name}!`;
    }),
});
