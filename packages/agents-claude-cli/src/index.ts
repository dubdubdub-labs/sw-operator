import type { Agent, AgentInput, ProcessSpec } from "@repo/runtime-interfaces";

function b64(str: string): string {
  return Buffer.from(str, "utf8").toString("base64");
}

export type ClaudeAgentOptions = {
  defaultModel?: string;
  workDir?: string; // may include '~'
};

export function createClaudeAgent(opts: ClaudeAgentOptions = {}): Agent {
  const defaultModel = opts.defaultModel ?? "sonnet";
  const workDir = opts.workDir ?? "~/operator/sw-compose";

  return {
    name: "claude-cli",
    toProcessSpec(input: AgentInput): ProcessSpec {
      const model = input.model ?? defaultModel;
      const cwd = input.cwd ?? workDir;
      const promptB64 = b64(input.prompt);
      const systemB64 = b64(input.systemPrompt ?? "");

      const name = (input.sessionName ?? "cc-session").replace(
        /[^a-zA-Z0-9-]/g,
        "-"
      );
      const payload = [
        `cd ${cwd}`,
        `echo "${promptB64}" | base64 -d | claude -p --dangerously-skip-permissions --output-format stream-json --verbose --model ${model} --append-system-prompt "$(echo "${systemB64}" | base64 -d)"`,
      ].join(" && ");

      return {
        command: {
          kind: "shell",
          name: `cc-${name}`,
          cwd,
          script: payload,
          env: input.env,
        },
        restart: "never",
        instances: 1,
      };
    },
  };
}
