import { Buffer } from "node:buffer";
import { type PM2Config, PM2ProcessBuilder } from "@repo/pm2-commands";

// Export VM helpers
export * from "./vm-helpers.js";

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

export function buildClaudeSyncPm2(iterationId: string): PM2Config {
  const bashString = `CLOUD_CODE_ITERATION_ID=${iterationId} doppler run -- claude-sync sync`;
  return new PM2ProcessBuilder("claude-sync")
    .script("bash")
    .args(["-c", bashString])
    .autorestart(false)
    .build();
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
): PM2Config {
  const encodedPrompt = base64Encode(prompt);
  const encodedSystem = base64Encode(systemPrompt);
  const resumeFlag = resumeUuid ? `-r ${resumeUuid}` : "";
  const inner =
    "cd ~/operator/sw-compose && " +
    `echo "${encodedPrompt}" | base64 -d | ` +
    `claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json ` +
    `--verbose --model ${model} ` +
    `--append-system-prompt "$(echo "${encodedSystem}" | base64 -d)"`;

  const normalizedName = sessionName.replace(/[^a-zA-Z0-9-]/g, "-");

  return new PM2ProcessBuilder(`cc-${normalizedName}`)
    .script("bash")
    .args(["-c", inner])
    .env({ SESSION_NAME: sessionName })
    .autorestart(false)
    .build();
}

// 4) sw-compose dev server
export function createStartDevServerCommand(): string {
  return "pm2 start bun --name sw-compose-dev --cwd ~/operator/sw-compose -- run dev";
}

export function buildStartDevServerPm2(): PM2Config {
  return new PM2ProcessBuilder("sw-compose-dev")
    .script("bun")
    .args(["run", "dev"])
    .cwd("~/operator/sw-compose")
    .build();
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
