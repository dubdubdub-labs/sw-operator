import type { VMProvider } from "@repo/runtime-interfaces";
import type { CodeSandboxAdapter } from "./adapter.js";
export type CodeSandboxProviderOptions = {
  apiKey: string;
  homeDir?: string;
  adapter?: CodeSandboxAdapter;
};
export declare function createCodeSandboxProvider(
  opts: CodeSandboxProviderOptions
): VMProvider;
export { mapBootupToStatus } from "./status.js";
export {
  cleanupSandbox,
  createSandboxFromTemplate,
  resumeSandbox,
} from "./util.js";
export default createCodeSandboxProvider;
//# sourceMappingURL=index.d.ts.map
