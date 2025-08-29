import { CodeSandbox } from "@codesandbox/sdk";
import type { CodeSandboxAdapter } from "./adapter.js";

export function createCodeSandboxSdkAdapter(
  apiKey: string
): CodeSandboxAdapter {
  const sdk = new CodeSandbox(apiKey);
  return {
    async connect(instanceId: string) {
      // Prefer resume to handle hibernated/archived cases
      const sandbox = await sdk.sandboxes.resume(instanceId);
      const client = await sandbox.connect();
      return {
        async run(command: string) {
          const output = await client.commands.run(command);
          const text = typeof output === "string" ? output : String(output);
          return { stdout: text, stderr: "", exit_code: 0 };
        },
        fs: {
          async writeTextFile(p: string, text: string) {
            await client.fs.writeTextFile(p, text);
          },
          async readTextFile(p: string) {
            const out = await client.fs.readTextFile(p);
            return typeof out === "string" ? out : String(out);
          },
          // Optional helpers may be added in future (mkdirp, exists)
        },
      };
    },
  };
}

export default createCodeSandboxSdkAdapter;
