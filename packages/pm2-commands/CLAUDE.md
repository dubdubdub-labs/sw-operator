# PM2 Client SDK

Programmatic PM2 process management. Wraps PM2 CLI commands for use in any environment with command execution capability.

## Installation

```bash
bun add @repo/pm2
```

## Quick Start

```typescript
import { PM2Client } from "@repo/pm2";

// Implement executor for your environment
const executor = {
  async exec(command: string[]) {
    // Execute command and return result
    return { stdout: "", stderr: "", exit_code: 0 };
  }
};

const pm2 = new PM2Client(executor);

// Start a script file
await pm2.start("/path/to/server.js", { name: "api" });

// Start a shell command (automatically detects and handles)
await pm2.start("sleep 100", { name: "sleeper" });

// List processes
const processes = await pm2.list();

// Stop process
await pm2.stop("api");
```

## Core API

### Process Control

```typescript
// Start script files (Node.js, Python, etc.)
await pm2.start("/path/to/script.js", { name: "app" });
await pm2.start("/app/server.py", { 
  name: "python-app",
  interpreter: "python3"
});

// Start shell commands (automatically handled)
await pm2.start("sleep 100", { name: "sleeper" });
await pm2.start("npm run dev", { 
  name: "dev-server",
  cwd: "/app"
});

// Complex shell commands with environment variables
await pm2.start("CLOUD_CODE_ITERATION_ID=abc123 doppler run -- app", {
  name: "cloud-app",
  autorestart: false
});

// Control commands
await pm2.stop("app");         // Stop by name
await pm2.restart(0);           // Restart by ID
await pm2.delete("app");        // Remove from PM2
await pm2.reload("app");        // Zero-downtime reload

// Batch operations
await pm2.stopAll();
await pm2.restartAll();
await pm2.deleteAll();
```

### Process Information

```typescript
// List all processes
const processes = await pm2.list();
// Returns: PM2ProcessInfo[]

// Get specific process
const proc = await pm2.describe("app");
// Returns: PM2ProcessInfo

// Get logs
const logs = await pm2.logs("app", 100);
// Returns: { out: string, error: string }

// Monitor view (text table)
const monitor = await pm2.monit();
```

### Process Configuration

```typescript
interface PM2Config {
  name?: string;
  script?: string;
  args?: string | string[];
  interpreter?: string;
  cwd?: string;
  env?: Record<string, string>;
  instances?: number;
  execMode?: "fork" | "cluster";
  watch?: boolean | string[];
  maxMemoryRestart?: string;
  maxRestarts?: number;
  cronRestart?: string;
  autorestart?: boolean;
  killTimeout?: number;
  namespace?: string;
}
```

### Builder Pattern

```typescript
const config = pm2.createProcess("my-app")
  .script("/app/server.js")
  .args(["--port", "3000"])
  .env({ NODE_ENV: "production", API_KEY: "secret" })
  .cwd("/app")
  .instances(4)
  .watch(true)
  .maxMemory("500M")
  .cron("0 2 * * *")
  .noAutorestart()
  .build();

await pm2.start(config.script, config);
```

### PM2 Ecosystem

```typescript
// Save current process list
await pm2.save();

// Restore saved processes
await pm2.resurrect();

// Dump process list
await pm2.dump();

// Generate startup script
const script = await pm2.startup("systemd");

// Remove startup script
await pm2.unstartup();
```

### Batch Start

```typescript
import { createShellConfig, createNodeConfig, createCronConfig } from "@repo/pm2";

const apps: PM2Config[] = [
  createNodeConfig("/app/api.js", { name: "api", instances: 2 }),
  createNodeConfig("/app/worker.js", { name: "worker", env: { QUEUE: "jobs" } }),
  createCronConfig("/app/cron.js", "*/5 * * * *", { name: "cron" }),
  // Shell commands need special handling
  createShellConfig("npm run watch", { name: "watcher", cwd: "/app" })
];

// For shell commands, pass the command as first arg, not in config.script
for (const app of apps) {
  if (app.script) {
    await pm2.start(app.script, app);
  } else {
    // Shell command - passed as first argument
    const command = apps.find(a => a.name === app.name);
    await pm2.start("npm run watch", app);  // Command goes first
  }
}
```

## Command Executor

Implement `CommandExecutor` interface for your environment:

```typescript
interface CommandExecutor {
  exec(command: string[]): Promise<{
    stdout: string;
    stderr: string;
    exit_code: number;
  }>;
}

// Example: SSH executor
class SSHExecutor implements CommandExecutor {
  constructor(private ssh: SSHClient) {}
  
  async exec(command: string[]) {
    const result = await this.ssh.exec(command.join(" "));
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.code
    };
  }
}

// Example: Docker executor
class DockerExecutor implements CommandExecutor {
  constructor(private containerId: string) {}
  
  async exec(command: string[]) {
    const result = await docker.exec(this.containerId, command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode
    };
  }
}
```

## Process Info Types

```typescript
interface PM2ProcessInfo {
  name: string;
  pm_id: number;
  status: "online" | "stopping" | "stopped" | "launching" | "errored";
  cpu: number;
  memory: number;
  pid?: number;
  pm_uptime?: number;
  restart_time?: number;
}
```

## Command Generation

PM2Client generates commands compatible with PM2 CLI:

```typescript
// Shell commands are executed through bash (PM2 doesn't support quoted commands directly)
pm2 start bash --name "sleeper" --no-autorestart -- -c "sleep 100"

// Script files are passed directly
pm2 start /app/server.js --name "api" -- --port 3000

// Environment variables
pm2 start app.js --env NODE_ENV=production,PORT=3000

// Cluster mode (Node.js only)
pm2 start server.js -i 4 --name "cluster"

// Complex commands with environment variables
pm2 start bash --name "cloud-app" --no-autorestart -- -c "VARS=true doppler run -- app"
```

### Important Notes

1. **Shell Commands vs Script Files**: PM2 treats these differently. Shell commands are executed through bash with the command as an argument to -c, while script files can be passed directly.

2. **Command Detection**: The client automatically detects whether you're passing a shell command or script file based on:
   - File extensions (.js, .ts, .py, .sh)
   - Absolute paths (starting with /)
   - Everything else is treated as a shell command

3. **No Config Files Required**: Despite what some documentation might suggest, PM2 can run commands directly without ecosystem files or config files.

## Error Handling

All methods throw on non-zero exit codes:

```typescript
try {
  await pm2.start("app.js", { name: "app" });
} catch (error) {
  // error.message contains stderr output
  console.error("PM2 failed:", error.message);
}
```

## Logger Support

Optional logger for debugging:

```typescript
import { createLogger } from "@repo/logger";

const pm2 = new PM2Client(executor, createLogger());
// Logs debug info for all operations
```
