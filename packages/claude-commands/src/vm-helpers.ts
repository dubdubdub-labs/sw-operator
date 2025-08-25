import { PM2ProcessBuilder } from "@repo/pm2-commands";
import type { VMProvider } from "@repo/vm-interface";
import { base64Encode } from "./index.js";

/**
 * Sets up Claude credentials on a VM instance
 * Uses atomic write to create directory, write file, and set permissions in one call
 */
export async function setupClaudeCredentials(
  provider: VMProvider,
  instanceId: string,
  token: {
    authToken: string;
    expiresAt: Date | string | number;
  }
): Promise<void> {
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

  const content = JSON.stringify(payload, null, 2);

  // Single atomic operation: create dir, write file, set permissions
  await provider.files.writeFileAtomic(
    instanceId,
    "~/.claude/.credentials.json",
    content,
    {
      createDirs: true,
      mode: "600",
    }
  );
}

/**
 * Starts Claude Sync process on a VM instance
 */
export async function startClaudeSync(
  provider: VMProvider,
  instanceId: string,
  iterationId: string
): Promise<void> {
  const config = new PM2ProcessBuilder("claude-sync")
    .script("bash")
    .args([
      "-c",
      `CLOUD_CODE_ITERATION_ID=${iterationId} doppler run -- claude-sync sync`,
    ])
    .autorestart(false)
    .build();

  await provider.processes.start(instanceId, config.script!, config);
}

/**
 * Starts Claude session on a VM instance
 */
export async function startClaudeSession(
  provider: VMProvider,
  instanceId: string,
  options: {
    sessionName: string;
    prompt: string;
    systemPrompt: string;
    resumeUuid?: string;
    model?: "sonnet" | "opus";
  }
): Promise<void> {
  const encodedPrompt = base64Encode(options.prompt);
  const encodedSystem = base64Encode(options.systemPrompt);
  const resumeFlag = options.resumeUuid ? `-r ${options.resumeUuid}` : "";
  const normalizedName = options.sessionName.replace(/[^a-zA-Z0-9-]/g, "-");
  const model = options.model ?? "sonnet";

  const command =
    "cd ~/operator/sw-compose && " +
    `echo "${encodedPrompt}" | base64 -d | ` +
    `claude -p ${resumeFlag} --dangerously-skip-permissions --output-format stream-json ` +
    `--verbose --model ${model} ` +
    `--append-system-prompt "$(echo "${encodedSystem}" | base64 -d)"`;

  const config = new PM2ProcessBuilder(`cc-${normalizedName}`)
    .script("bash")
    .args(["-c", command])
    .env({ SESSION_NAME: options.sessionName })
    .autorestart(false)
    .build();

  await provider.processes.start(instanceId, config.script!, config);
}

/**
 * Starts the sw-compose dev server on a VM instance
 */
export async function startDevServer(
  provider: VMProvider,
  instanceId: string
): Promise<void> {
  const config = new PM2ProcessBuilder("sw-compose-dev")
    .script("bun")
    .args(["run", "dev"])
    .cwd("~/operator/sw-compose")
    .build();

  await provider.processes.start(instanceId, config.script!, config);
}

/**
 * Sets up machine info file on a VM instance
 * Uses atomic write to write file and set permissions in one call
 */
export async function setupMachineInfo(
  provider: VMProvider,
  instanceId: string,
  taskId: string,
  morphMachineId: string
): Promise<void> {
  const payload = {
    taskId,
    morphMachineId,
    createdAt: new Date().toISOString(),
  };

  // Single atomic operation: write file and set permissions
  await provider.files.writeFileAtomic(
    instanceId,
    "~/.machine.json",
    JSON.stringify(payload, null, 2),
    {
      mode: "600",
    }
  );
}

/**
 * Boots a VM instance and sets it up for Claude development
 */
export async function bootAndSetupClaudeVM(
  provider: VMProvider,
  snapshotId: string,
  options: {
    taskId: string;
    authToken: string;
    expiresAt: Date | string | number;
    ttl_seconds?: number;
  }
): Promise<string> {
  // Boot the instance
  const instance = await provider.instances.boot(snapshotId, {
    ttl_seconds: options.ttl_seconds ?? 3600,
    ttl_action: "stop",
  });

  // Set up credentials
  await setupClaudeCredentials(provider, instance.id, {
    authToken: options.authToken,
    expiresAt: options.expiresAt,
  });

  // Set up machine info
  await setupMachineInfo(provider, instance.id, options.taskId, instance.id);

  return instance.id;
}

/**
 * Utility to monitor PM2 processes on a VM
 */
export async function monitorProcesses(
  provider: VMProvider,
  instanceId: string,
  processName?: string
): Promise<{ logs?: string; processes: unknown[] }> {
  const processes = await provider.processes.list(instanceId);

  if (processName) {
    const process = processes.find((p) => p.name === processName);
    if (process) {
      const logs = await provider.processes.logs(instanceId, processName, 100);
      return {
        logs: logs.out,
        processes: [process],
      };
    }
  }

  return { processes };
}
