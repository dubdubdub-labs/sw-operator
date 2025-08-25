# VM Interface

Abstract interface for VM providers. Enables swappable VM implementations while maintaining consistent API.

## Architecture

The VM interface defines a provider-agnostic contract for VM operations:

```
Application Code
      ↓
  VM Interface     ← You are here
      ↓
 VM Provider
 (MorphVM, Docker, etc.)
```

## Core Concepts

### VM Provider
Main interface that aggregates all VM services:

```typescript
interface VMProvider {
  readonly name: string;
  readonly version: string;
  readonly logger?: Logger;
  
  instances: VMInstanceService;   // VM lifecycle
  snapshots: VMSnapshotService;   // State management
  images: VMImageService;         // Base images
  files: VMFileService;           // File operations
  processes: VMProcessService;    // Process management (PM2)
}
```

### Services

#### Instance Service
VM lifecycle management:
- `boot(snapshotId, options)` - Start VM from snapshot
- `get(instanceId)` - Get instance details
- `list(filters)` - List instances
- `stop(instanceId)` - Stop instance
- `terminate(instanceId)` - Terminate instance
- `fork(instanceId, count)` - Fork instance
- `exec(instanceId, command)` - Execute command
- `execStream(instanceId, command)` - Stream command output

#### Snapshot Service
VM state management:
- `get(snapshotId)` - Get snapshot details
- `list(filters)` - List snapshots
- `create(instanceId, options)` - Create snapshot from instance
- `delete(snapshotId)` - Delete snapshot

#### File Service
File system operations with **atomic write support**:

```typescript
// Traditional operations (multiple network calls)
readFile(instanceId, path)
writeFile(instanceId, path, content)
copyFile(instanceId, source, dest)
moveFile(instanceId, source, dest)
deleteFile(instanceId, path)
fileExists(instanceId, path)
createDirectory(instanceId, path, recursive)
listDirectory(instanceId, path)
isDirectory(instanceId, path)
deleteDirectory(instanceId, path)

// Atomic operation (single network call)
writeFileAtomic(instanceId, path, content, {
  mode?: string;        // chmod permissions (e.g., "600")
  createDirs?: boolean; // mkdir -p parent directories
  owner?: string;       // chown user
  group?: string;       // chown group
})
```

#### Process Service
PM2 process management:
- `start(instanceId, command, options)` - Start process
- `stop(instanceId, nameOrId)` - Stop process
- `restart(instanceId, nameOrId)` - Restart process
- `delete(instanceId, nameOrId)` - Remove process
- `list(instanceId)` - List all processes
- `logs(instanceId, nameOrId, lines)` - Get process logs
- `stopAll(instanceId)` - Stop all processes
- `deleteAll(instanceId)` - Remove all processes
- `createProcess(name)` - Get PM2 process builder

## Atomic File Operations

The `writeFileAtomic` method combines multiple operations into a single network call:

```typescript
// Before: 3 network calls
await provider.files.createDirectory(instanceId, "/app", true);
await provider.files.writeFile(instanceId, "/app/config.json", content);
await provider.instances.exec(instanceId, ["chmod", "600", "/app/config.json"]);

// After: 1 network call
await provider.files.writeFileAtomic(instanceId, "/app/config.json", content, {
  createDirs: true,
  mode: "600"
});
```

This executes as a single bash command:
```bash
mkdir -p "/app" && echo 'base64_content' | base64 -d > "/app/config.json" && chmod 600 "/app/config.json"
```

### Benefits
- **3x fewer network calls** for file operations
- **Atomic execution** - all operations succeed or fail together
- **Better performance** - reduced latency
- **Cleaner code** - less boilerplate

## Command Execution

Commands are passed as arrays where each element is a separate argument:

```typescript
// Correct - array elements
await provider.instances.exec(instanceId, ["ls", "-la", "/app"]);
await provider.instances.exec(instanceId, ["echo", "Hello World"]);

// For complex shell operations, use bash -c
await provider.instances.exec(instanceId, ["bash", "-c", "echo 'test' | grep 't'"]);
```

## Process Management (PM2)

The process service wraps PM2 operations:

```typescript
// Start a process
const config = provider.processes.createProcess("my-app")
  .script("/app/server.js")
  .env({ NODE_ENV: "production" })
  .instances(4)
  .build();

await provider.processes.start(instanceId, config.script, config);

// List processes
const processes = await provider.processes.list(instanceId);

// Get logs
const logs = await provider.processes.logs(instanceId, "my-app", 100);
```

## Creating a Provider

Implement the `VMProvider` interface:

```typescript
export class MyVMProvider implements VMProvider {
  readonly name = "my-vm";
  readonly version = "1.0.0";
  
  constructor(config: MyConfig) {
    // Initialize services
    this.instances = new MyInstanceService(config);
    this.snapshots = new MySnapshotService(config);
    this.images = new MyImageService(config);
    this.files = new MyFileService(config);
    this.processes = new MyProcessService(config);
  }
  
  // Implement required services...
}
```

## Provider-Agnostic Code

Write code that works with any VM provider:

```typescript
async function deployApp(provider: VMProvider, snapshotId: string) {
  // Boot instance
  const instance = await provider.instances.boot(snapshotId, {
    ttl_seconds: 3600,
    ttl_action: "stop"
  });
  
  // Write config file atomically
  await provider.files.writeFileAtomic(
    instance.id,
    "/app/config.json",
    JSON.stringify({ api: "https://api.example.com" }),
    { createDirs: true, mode: "644" }
  );
  
  // Start application
  await provider.processes.start(instance.id, "node", {
    name: "app",
    script: "/app/server.js",
    env: { PORT: "3000" }
  });
  
  return instance.id;
}

// Works with any provider
const morphVM = createMorphVMProvider(config);
await deployApp(morphVM, snapshotId);

const dockerVM = createDockerVMProvider(config);
await deployApp(dockerVM, snapshotId);
```

## Error Handling

All methods throw errors on failure. Handle appropriately:

```typescript
try {
  await provider.instances.boot(snapshotId);
} catch (error) {
  if (error.message.includes("not found")) {
    // Handle missing snapshot
  }
  // Handle other errors
}
```

## Types

Key types exported:

```typescript
// VM resources
interface VMInstance {
  id: string;
  status: "booting" | "ready" | "stopping" | "stopped" | "error";
  metadata?: Record<string, string>;
  created_at: string;
  ttl?: { seconds?: number; action?: "stop" | "terminate" };
}

interface VMSnapshot {
  id: string;
  status: "creating" | "ready" | "deleting" | "error";
  created_at: string;
  metadata?: Record<string, string>;
}

interface VMImage {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// Operations
interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

interface FileInfo {
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

// Process management
interface ProcessLogs {
  out: string;
  err: string;
}
```

## Best Practices

1. **Use atomic operations** when creating files with specific permissions
2. **Pass commands as arrays** to avoid shell escaping issues
3. **Handle errors appropriately** - all methods can throw
4. **Use the process builder** for complex PM2 configurations
5. **Minimize network calls** by batching operations where possible