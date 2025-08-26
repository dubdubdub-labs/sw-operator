export function base64Encode(str: string): string {
  // Node-safe base64 encoding (handles UTF-8 correctly)
  return Buffer.from(str, "utf8").toString("base64");
}

export function createClaudeCredentialsCommand(token: {
  authToken: string;
  expiresAt: Date | string | number;
}): string {
  // Handle different date formats from InstantDB
  let expiresAtStr: string;
  if (token.expiresAt instanceof Date) {
    expiresAtStr = token.expiresAt.toISOString();
  } else if (typeof token.expiresAt === "string") {
    expiresAtStr = token.expiresAt;
  } else {
    expiresAtStr = new Date(token.expiresAt).toISOString();
  }

  const credentials = {
    claudeAiOauth: {
      accessToken: token.authToken,
      expiresAt: expiresAtStr,
      scopes: ["user:inference", "user:profile"],
      subscriptionType: "max",
    },
  };

  const json = JSON.stringify(credentials, null, 2);
  const encoded = base64Encode(json);

  return `mkdir -p ~/.claude && echo '${encoded}' | base64 -d > ~/.claude/.credentials.json && chmod 600 ~/.claude/.credentials.json`;
}

export function createClaudeSyncCommand(iterationId: string): string {
  // Use bash -lc to ensure login shell PATH/rcfiles in PM2 payloads
  return `pm2 start bash --name claude-sync --no-autorestart -- -lc 'CLOUD_CODE_ITERATION_ID=${iterationId} doppler run -- claude-sync sync'`;
}

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

  // Normalize session name for pm2
  const normalizedName = sessionName.replace(/[^a-zA-Z0-9-]/g, "-");

  // Run Claude Code in ~/operator/sw-compose directory
  // Note: claude -p reads from stdin; we pipe the decoded prompt into stdin
  return `SESSION_NAME=${sessionName} pm2 start bash --name cc-${normalizedName} --no-autorestart -- -lc 'cd ~/operator/sw-compose && echo "${encodedPrompt}" | base64 -d | claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json --verbose --model ${model} --append-system-prompt "$(echo "${encodedSystem}" | base64 -d)"'`;
}

export function createStartDevServerCommand(): string {
  // Start sw-compose dev server on port 3000 using pm2
  // Note: For npm/bun scripts, PM2 can start them directly
  return "pm2 start bun --name sw-compose-dev --cwd ~/operator/sw-compose -- run dev";
}

export function createMachineInfoCommand(
  taskId: string,
  morphMachineId: string
): string {
  // Create ~/.machine.json file with task ID and Morph machine ID
  const machineInfo = {
    taskId,
    morphMachineId,
    createdAt: new Date().toISOString(),
  };

  const json = JSON.stringify(machineInfo, null, 2);
  const encoded = base64Encode(json);

  return `echo '${encoded}' | base64 -d > ~/.machine.json && chmod 640 ~/.machine.json`;
}
