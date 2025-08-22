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

// Start process
await pm2.start("node server.js", { name: "api" });

// List processes
const processes = await pm2.list();

// Stop process
await pm2.stop("api");
```

## Core API

### Process Control

```typescript
// Start process/script
await pm2.start("sleep 100", { name: "sleeper" });
await pm2.start("/path/to/script.js", { 
  script: "/path/to/script.js",
  name: "app"
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
const apps: PM2Config[] = [
  { script: "api.js", name: "api", instances: 2 },
  { script: "worker.js", name: "worker", env: { QUEUE: "jobs" } },
  { script: "cron.js", name: "cron", cronRestart: "*/5 * * * *" }
];

await pm2.startMany(apps);
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
// Inline commands wrapped in quotes
pm2 start 'sleep 100' --name "sleeper"

// Script files with arguments
pm2 start /app/server.js --name "api" -- --port 3000

// Environment variables
pm2 start app.js --env NODE_ENV=production --env PORT=3000

// Cluster mode
pm2 start server.js -i 4 --name "cluster"

// Complex commands preserved
pm2 start 'VARS=true doppler run -- app' --no-autorestart
```

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
