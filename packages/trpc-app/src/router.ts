import { t } from "@repo/trpc-core";
import { trpcRouter as helloRouter } from "../../trpc-router-basic/src";

export const appRouter = t.router({
  hello: helloRouter,
});

export type AppRouter = typeof appRouter;
