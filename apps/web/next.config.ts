import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * we have enabled the following experimental features to improve type safety and logging visibility.
   */
  experimental: {
    /**
     * enable debug information to be forwarded from browser to dev server stdout/stderr
     */
    browserDebugInfoInTerminal: true,
    /**
     * enable type-checking and autocompletion for environment variables.
     */
    typedEnv: true,
    /**
     * generate Route types and enable type checking for Link and Router.push, etc.
     * @see https://nextjs.org/docs/app/api-reference/next-config-js/typedRoutes
     */
    typedRoutes: true,
  },
  /**
   * this is required to isolate lockfile resolution to the context of the monorepo
   * without this, we receive the message:
   * ```
   * Warning: Found multiple lockfiles. Selecting /[EXTERNAL_PATH]/bun.lock
   * Consider removing the lockfiles at:
   * \* /[MONOREPO_ROOT]/bun.lock
   * ```
   * we prefer to use our monorepo's lockfile over the external one
   */
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  productionBrowserSourceMaps: true,
};

export default nextConfig;
