import { Buffer } from "node:buffer";
export type PM2StartSpec = {
  command: string;
  config: {
    name?: string;
    args?: string[];
    cwd?: string;
    autorestart?: boolean;
    env?: Record<string, string>;
  };
};

// Utilities
export function base64Encode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64");
}

// 1) Credentials file command
export function createClaudeCredentialsCommand(token: {
  authToken: string;
  expiresAt: Date | string | number;
}): string {
  let expiresAtStr: string;
  if (token.expiresAt instanceof Date) {
    expiresAtStr = token.expiresAt.toISOString();
  } else if (typeof token.expiresAt === "string") {
    expiresAtStr = token.expiresAt;
  } else {
    expiresAtStr = new Date(token.expiresAt).toISOString();
  }

  const payload = {
    claudeAiOauth: {
      accessToken: token.authToken,
      expiresAt: expiresAtStr,
      scopes: ["user:inference", "user:profile"],
      subscriptionType: "max" as const,
    },
  };

  const encoded = base64Encode(JSON.stringify(payload, null, 2));
  return (
    "mkdir -p ~/.claude && " +
    `echo '${encoded}' | base64 -d > ~/.claude/.credentials.json && ` +
    "chmod 600 ~/.claude/.credentials.json"
  );
}

// 2) Claude Sync process
export function createClaudeSyncCommand(iterationId: string): string {
  const script = `CLOUD_CODE_ITERATION_ID=${iterationId} doppler run -- claude-sync sync`;
  return `pm2 start bash --name claude-sync --no-autorestart -- -c '${script.replaceAll("'", "'\\''")}'`;
}

export function buildClaudeSyncPm2(iterationId: string): PM2StartSpec {
  const bashString = `CLOUD_CODE_ITERATION_ID=${iterationId} doppler run -- claude-sync sync`;
  // Quote the -c string so shell treats it as one argument
  const quoted = `"${bashString.replaceAll('"', '\\"')}"`;
  return {
    command: "bash",
    config: {
      name: "claude-sync",
      autorestart: false,
      args: ["-c", quoted],
    },
  };
}

// 3) Claude Session process
export function createClaudeSessionCommand(
  sessionName: string,
  prompt: string,
  systemPrompt: string,
  resumeUuid?: string,
  model: "sonnet" | "opus" = "sonnet"
): string {
  const encodedPrompt = base64Encode(prompt);
  const encodedSystem = base64Encode(systemPrompt);
  const resumeFlag = resumeUuid ? `-r ${resumeUuid}` : "";
  const normalizedName = sessionName.replace(/[^a-zA-Z0-9-]/g, "-");

  const inner =
    "cd ~/operator/sw-compose && " +
    `echo "${encodedPrompt}" | base64 -d | ` +
    `claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json ` +
    `--verbose --model ${model} ` +
    `--append-system-prompt "$(echo "${encodedSystem}" | base64 -d)"`;

  return (
    `SESSION_NAME=${sessionName} ` +
    `pm2 start bash --name cc-${normalizedName} --no-autorestart -- -c '${inner.replaceAll("'", "'\\''")}'`
  );
}

export function buildClaudeSessionPm2(
  sessionName: string,
  prompt: string,
  systemPrompt: string,
  resumeUuid?: string,
  model: "sonnet" | "opus" = "sonnet"
): PM2StartSpec {
  const encodedPrompt = base64Encode(prompt);
  const encodedSystem = base64Encode(systemPrompt);
  const resumeFlag = resumeUuid ? `-r ${resumeUuid}` : "";
  const inner =
    "cd ~/operator/sw-compose && " +
    `echo "${encodedPrompt}" | base64 -d | ` +
    `claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json ` +
    `--verbose --model ${model} ` +
    `--append-system-prompt "$(echo "${encodedSystem}" | base64 -d)"`;

  const quoted = `"${inner.replaceAll('"', '\\"')}"`;
  const normalizedName = sessionName.replace(/[^a-zA-Z0-9-]/g, "-");

  return {
    command: "bash",
    config: {
      name: `cc-${normalizedName}`,
      autorestart: false,
      env: { SESSION_NAME: sessionName },
      args: ["-c", quoted],
    },
  };
}

// 4) sw-compose dev server
export function createStartDevServerCommand(): string {
  return "pm2 start bun --name sw-compose-dev --cwd ~/operator/sw-compose -- run dev";
}

export function buildStartDevServerPm2(): PM2StartSpec {
  return {
    command: "bun",
    config: {
      name: "sw-compose-dev",
      cwd: "~/operator/sw-compose",
      args: ["run", "dev"],
    },
  };
}

// 5) Machine info file
export function createMachineInfoCommand(
  taskId: string,
  morphMachineId: string
): string {
  const payload = {
    taskId,
    morphMachineId,
    createdAt: new Date().toISOString(),
  } as const;
  const encoded = base64Encode(JSON.stringify(payload, null, 2));
  return `echo '${encoded}' | base64 -d > ~/.machine.json && chmod 600 ~/.machine.json`;
}
