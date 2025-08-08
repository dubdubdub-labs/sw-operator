import { t } from "@repo/trpc-core";

export const trpcRouter = t.router({
  hello: t.procedure.query(() => {
    return "Hello, world!";
  }),
});
