import type { Agent, CommandSpec, ProcessSpec } from "@repo/runtime-interfaces";

export type ClaudeAgentOptions = {
  defaultModel?: string;
  workDir?: string;
  namePrefix?: string;
};

export type ClaudeAgentInput = {
  sessionName?: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  cwd?: string;
  env?: Record<string, string>;
  resumeUuid?: string;
  extraArgs?: string[];
};

function b64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 50);
}

function buildShellForClaude(
  input: Required<Pick<ClaudeAgentInput, "prompt">> & ClaudeAgentInput,
  model: string
): string {
  const encPrompt = b64(input.prompt);
  const encSystem = b64(input.systemPrompt ?? "");
  const resumeFlag = input.resumeUuid ? `-r ${input.resumeUuid}` : "";
  const extra = input.extraArgs?.join(" ") ?? "";
  // claude -p reads prompt from stdin; append system prompt via decoded base64
  return `echo '${encPrompt}' | base64 -d | claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json --verbose --model ${model} --append-system-prompt "$(echo '${encSystem}' | base64 -d)" ${extra}`.trim();
}

export function createClaudeAgent(
  opts: ClaudeAgentOptions = {}
): Agent<ClaudeAgentInput> {
  const name = "ClaudeCLI";
  const defaultModel = opts.defaultModel ?? "sonnet";
  const defaultCwd = opts.workDir ?? "/project/workspace/operator/sw-compose";
  const prefix = opts.namePrefix ?? "cc";

  return {
    name,
    toProcessSpec(input: ClaudeAgentInput): ProcessSpec {
      const model = input.model ?? defaultModel;
      const cwd = input.cwd ?? defaultCwd;
      const session = sanitizeName(input.sessionName ?? "session");
      const cmd: CommandSpec = {
        kind: "shell",
        name: `${prefix}-${session}`,
        cwd,
        env: input.env,
        script: buildShellForClaude({ ...input, prompt: input.prompt }, model),
      };
      return { command: cmd, restart: "never" };
    },
  } satisfies Agent<ClaudeAgentInput>;
}

export default createClaudeAgent;
