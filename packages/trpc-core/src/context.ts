import type * as trpcNext from "@trpc/server/adapters/next";

// biome-ignore lint/complexity/noBannedTypes: placeholder
type CreateContextOptions = {};

/**
 * inner function for `createContext` where we create the context.
 * this is useful for testing when we don't want to mock Next.js' request/response
 */
// biome-ignore lint/suspicious/useAwait: placeholder
export async function createContextInner(_opts: CreateContextOptions) {
  return {};
}

export type Context = Awaited<ReturnType<typeof createContextInner>>;

/**
 * creates context for an incoming request
 * @see https://trpc.io/docs/v11/context
 */
export async function createContext(
  _opts: trpcNext.CreateNextContextOptions
): Promise<Context> {
  // for API-response caching see https://trpc.io/docs/v11/caching

  return await createContextInner({});
}
