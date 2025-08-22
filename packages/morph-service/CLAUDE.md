# MorphVM Service SDK

SDK for interacting with MorphVM cloud instances. Provides VM lifecycle management, file operations, and PM2 process control.

## Installation

```bash
bun add @repo/morph-service
```

## Quick Start

```typescript
import { createMorphClient } from "@repo/morph-service";

// Minimal config - uses MORPH_API_KEY env var and default URL
const morph = createMorphClient({
  apiKey: process.env.MORPH_API_KEY!
});

// Boot instance from snapshot
const instance = await morph.instances.boot("snapshot_id", {
  ttl_seconds: 300,
  ttl_action: "stop"
});

// Execute commands
const result = await morph.instances.exec(instance.id, ["echo", "Hello"]);

// Stop instance
await morph.instances.stop(instance.id);
```

## Core Services

### Instances
VM lifecycle management.

```typescript
// Boot from snapshot
await morph.instances.boot(snapshotId, options);

// Get instance
await morph.instances.get(instanceId);

// List instances
await morph.instances.list(filters);

// Execute command
await morph.instances.exec(instanceId, ["command", "args"]);

// Execute streaming (SSE)
const stream = await morph.instances.execStream(instanceId, ["command"]);
for await (const chunk of stream) {
  console.log(chunk.data);
}

// Stop/terminate
await morph.instances.stop(instanceId);
await morph.instances.terminate(instanceId);

// Fork instance
await morph.instances.fork(instanceId, count);

// Update metadata
await morph.instances.setMetadata(instanceId, metadata);
```

### Snapshots
VM state management.

```typescript
// Get snapshot
await morph.snapshots.get(snapshotId);

// List snapshots
await morph.snapshots.list(filters);

// Create from instance
await morph.snapshots.create(instanceId, options);

// Delete snapshot
await morph.snapshots.delete(snapshotId);
```

### Images
Base system images.

```typescript
// List available images
await morph.images.list();

// Get image details
await morph.images.get(imageId);
```

### Files
File system operations.

```typescript
// Write file
await morph.files.writeFile(instanceId, "/path/file.txt", "content");

// Read file
const content = await morph.files.readFile(instanceId, "/path/file.txt");

// File operations
await morph.files.copyFile(instanceId, source, dest);
await morph.files.moveFile(instanceId, oldPath, newPath);
await morph.files.deleteFile(instanceId, path);
await morph.files.fileExists(instanceId, path);

// Directory operations
await morph.files.createDirectory(instanceId, path, recursive);
await morph.files.listDirectory(instanceId, path);
await morph.files.isDirectory(instanceId, path);
await morph.files.deleteDirectory(instanceId, path);
```

### PM2 Process Management
Process lifecycle control via PM2.

```typescript
// Start process
await morph.pm2.start(instanceId, "sleep 100", {
  name: "my-process",
  env: { PORT: "3000" },
  autorestart: false
});

// Process control
await morph.pm2.stop(instanceId, "my-process");
await morph.pm2.restart(instanceId, "my-process");
await morph.pm2.delete(instanceId, "my-process");

// List processes
const processes = await morph.pm2.list(instanceId);

// Get logs
const logs = await morph.pm2.logs(instanceId, "my-process", 50);

// Builder pattern
const config = morph.pm2
  .createProcess("app")
  .script("/app/server.js")
  .env({ NODE_ENV: "production" })
  .instances(4)
  .maxMemory("1G")
  .build();

await morph.pm2.start(instanceId, config.script, config);
```

## Configuration

```typescript
interface MorphClientConfig {
  apiKey: string;          // Required - use process.env.MORPH_API_KEY
  baseUrl?: string;         // Optional - defaults to "https://cloud.morph.so/api"
  timeout?: number;         // Optional - defaults to 120000ms (2 minutes)
  logger?: Logger;          // Optional - custom logger instance
  retry?: {
    maxAttempts?: number;   // Optional - defaults to 3
    initialDelay?: number;  // Optional - defaults to 1000ms
    maxDelay?: number;      // Optional - defaults to 10000ms
  };
}

// Minimal setup (recommended)
const morph = createMorphClient({
  apiKey: process.env.MORPH_API_KEY!
});

// Full customization
const morph = createMorphClient({
  apiKey: process.env.MORPH_API_KEY!,
  baseUrl: "https://custom.morph.api/v1",
  timeout: 300000,
  logger: customLogger,
  retry: { maxAttempts: 5 }
});
```

## Error Handling

```typescript
import { 
  MorphError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError 
} from "@repo/morph-service";

try {
  await morph.instances.get("invalid_id");
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle 404
  } else if (error instanceof AuthenticationError) {
    // Handle auth failure
  }
}
```

## Types

Key types exported:

```typescript
interface Instance {
  id: string;
  status: "booting" | "ready" | "stopping" | "stopped" | "error";
  spec: InstanceSpec;
  metadata?: Record<string, string>;
  created_at: string;
  ttl?: TTLConfig;
}

interface Snapshot {
  id: string;
  status: "creating" | "ready" | "deleting" | "error";
  spec: InstanceSpec;
  created_at: string;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

interface PM2ProcessInfo {
  name: string;
  pm_id: number;
  status: "online" | "stopping" | "stopped" | "launching" | "errored";
  cpu: number;
  memory: number;
  pid?: number;
}
```

## Environment

Requires `MORPH_API_KEY` environment variable or pass directly to client.

## Notes

- Instance IDs format: `morphvm_[random]`
- Snapshot IDs format: `snapshot_[random]`
- Default timeout: 2 minutes
- Automatic retry with exponential backoff
- SSE streaming for long-running commands
- PM2 daemon spawns on first use per instance