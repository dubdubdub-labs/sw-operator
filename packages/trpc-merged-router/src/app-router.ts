import { t } from "@repo/trpc-core";
import { trpcRouter as helloRouter } from "@repo/trpc-router";

export const appRouter = t.router({
  hello: helloRouter,
});

export type AppRouter = typeof appRouter;
