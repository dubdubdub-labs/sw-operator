import { createContextInner } from "@repo/trpc-core";
import type { inferProcedureInput } from "@trpc/server";
import { expect, test } from "vitest";
import type { TrpcRouter } from "../trpc-router";
import { createCaller } from "../trpc-router";

test("mutate hello", async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const input: inferProcedureInput<TrpcRouter["basicMutation"]> = {
    name: "hello test",
  };

  const result = await caller.basicMutation(input);

  expect(result).toBe("Hello, hello test!");
});
