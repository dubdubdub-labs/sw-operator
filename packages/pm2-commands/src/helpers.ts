import type { PM2Config } from "./types.js";

// Regex patterns for file extensions
const JS_TS_EXTENSION = /\.(js|ts)$/;
const PY_EXTENSION = /\.py$/;

/**
 * PM2 Helper Functions
 *
 * Common patterns and workarounds for PM2 command construction
 */

/**
 * Create a PM2 config for a shell command
 * Shell commands in PM2 require special handling - they're passed as the scriptOrCommand
 * parameter to pm2.start(), not as a script config property
 */
export function createShellConfig(
  command: string,
  config?: Partial<PM2Config>
): PM2Config {
  // Don't set script property for shell commands
  // The command will be passed as the first argument to pm2.start()
  return {
    name: config?.name || command.split(" ")[0],
    // interpreter is handled automatically in buildPM2StartCommand for shell commands
    ...config,
  };
}

/**
 * Create a PM2 config for a Node.js script
 */
export function createNodeConfig(
  scriptPath: string,
  config?: Partial<PM2Config>
): PM2Config {
  return {
    script: scriptPath,
    name:
      config?.name || scriptPath.split("/").pop()?.replace(JS_TS_EXTENSION, ""),
    interpreter: "node",
    ...config,
  };
}

/**
 * Create a PM2 config for a Python script
 */
export function createPythonConfig(
  scriptPath: string,
  config?: Partial<PM2Config>
): PM2Config {
  return {
    script: scriptPath,
    name:
      config?.name || scriptPath.split("/").pop()?.replace(PY_EXTENSION, ""),
    interpreter: "python3",
    ...config,
  };
}

/**
 * Create a PM2 config for a web server with common settings
 */
export function createWebServerConfig(
  scriptPath: string,
  port: number,
  config?: Partial<PM2Config>
): PM2Config {
  return {
    script: scriptPath,
    name: config?.name || `web-${port}`,
    env: {
      PORT: String(port),
      NODE_ENV: "production",
      ...config?.env,
    },
    instances: config?.instances ?? 1,
    execMode: config?.instances && config.instances > 1 ? "cluster" : "fork",
    waitReady: true,
    killTimeout: 5000,
    ...config,
  };
}

/**
 * Create a PM2 config for a worker/background job
 */
export function createWorkerConfig(
  scriptPath: string,
  config?: Partial<PM2Config>
): PM2Config {
  return {
    script: scriptPath,
    name: config?.name || "worker",
    instances: 1,
    autorestart: true,
    maxRestarts: 10,
    minUptime: "10s",
    ...config,
  };
}

/**
 * Create a PM2 config for a cron job
 */
export function createCronConfig(
  scriptPath: string,
  cronPattern: string,
  config?: Partial<PM2Config>
): PM2Config {
  return {
    script: scriptPath,
    name: config?.name || "cron-job",
    cronRestart: cronPattern,
    autorestart: false,
    ...config,
  };
}

/**
 * Parse PM2 list output when JSON parsing fails
 * Fallback for when pm2 jlist doesn't work
 */
export function parseTextList(output: string): Array<{
  name: string;
  status: string;
  id: number;
}> {
  const lines = output.split("\n");
  const processes: Array<{ name: string; status: string; id: number }> = [];

  // Look for table rows (skip headers and borders)
  for (const line of lines) {
    if (
      line.includes("│") &&
      !line.includes("┌") &&
      !line.includes("└") &&
      !line.includes("├")
    ) {
      const parts = line
        .split("│")
        .map((p) => p.trim())
        .filter((p) => p);
      if (parts.length >= 3 && !parts[0]?.includes("id")) {
        const id = Number.parseInt(parts[0] || "0", 10);
        if (!Number.isNaN(id)) {
          processes.push({
            id,
            name: parts[1] || "unknown",
            status: parts[8] || "unknown",
          });
        }
      }
    }
  }

  return processes;
}

/**
 * Sanitize a name for PM2 (remove special characters)
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

/**
 * Check if a string is a file path or a shell command
 */
export function isFilePath(str: string): boolean {
  return (
    str.startsWith("/") ||
    str.startsWith("./") ||
    str.startsWith("../") ||
    str.endsWith(".js") ||
    str.endsWith(".ts") ||
    str.endsWith(".py") ||
    str.endsWith(".sh")
  );
}

/**
 * Format memory string for PM2 (e.g., "1G", "500M")
 */
export function formatMemory(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.floor(bytes / (1024 * 1024 * 1024))}G`;
  }
  if (bytes >= 1024 * 1024) {
    return `${Math.floor(bytes / (1024 * 1024))}M`;
  }
  if (bytes >= 1024) {
    return `${Math.floor(bytes / 1024)}K`;
  }
  return `${bytes}B`;
}

/**
 * Create ecosystem config for multiple apps
 */
export function createEcosystemConfig(apps: PM2Config[]): {
  apps: PM2Config[];
} {
  return {
    apps: apps.map((app) => ({
      ...app,
      name: sanitizeName(app.name || "app"),
    })),
  };
}
