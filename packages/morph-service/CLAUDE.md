# MorphVM Provider

VM provider implementation for MorphVM cloud instances. Implements the `@repo/vm-interface` contract.

## Quick Start

```typescript
import { createMorphVMProvider } from "@repo/morph-service";

// Create provider
const vm = createMorphVMProvider({
  apiKey: process.env.MORPH_API_KEY!
});

// Boot instance
const instance = await vm.instances.boot("snapshot_id", {
  ttl_seconds: 300,
  ttl_action: "stop"
});

// Use atomic file operations
await vm.files.writeFileAtomic(instance.id, "/app/config.json", content, {
  createDirs: true,
  mode: "644"
});

// Start PM2 process
await vm.processes.start(instance.id, "node", {
  name: "app",
  script: "/app/server.js"
});
```

## Configuration

```typescript
interface MorphClientConfig {
  apiKey: string;          // Required - MORPH_API_KEY
  baseUrl?: string;        // Optional - defaults to "https://cloud.morph.so/api"
  timeout?: number;        // Optional - defaults to 120000ms (2 minutes)
  logger?: Logger;         // Optional - custom logger instance
  retry?: {
    maxAttempts?: number;  // Optional - defaults to 3
    initialDelay?: number; // Optional - defaults to 1000ms
    maxDelay?: number;     // Optional - defaults to 10000ms
  };
}
```

## Provider Implementation

MorphVMProvider implements the standard VM interface:

```typescript
const provider = new MorphVMProvider(config);

// All standard VM operations are supported
provider.instances   // Instance management
provider.snapshots   // Snapshot operations
provider.images      // Image catalog
provider.files       // File operations (with atomic writes)
provider.processes   // PM2 process management
```

## MorphVM-Specific Behavior

### Instance Status Mapping
- `pending` → `booting`
- `ready` → `ready`
- `paused` → `stopped`
- `saving` → `stopping`
- `error` → `error`

### Snapshot Creation
MorphVM creates snapshots through the pause endpoint:
```typescript
// Internally uses pause(instanceId, createSnapshot=true)
await provider.snapshots.create(instanceId);
```

### Limitations
- Metadata updates not currently supported (throws error)
- Stream execution simulated (MorphVM doesn't support native streaming)
- File listing returns names only (no metadata)

## Atomic File Operations

The provider implements atomic writes efficiently:

```typescript
// Single network call combining mkdir + write + chmod + chown
await vm.files.writeFileAtomic(instanceId, "/path/to/file", content, {
  createDirs: true,   // mkdir -p parent directories
  mode: "600",        // chmod permissions
  owner: "user",      // optional: chown user
  group: "group"      // optional: chown group
});
```

## Error Handling

MorphVM errors are wrapped in specific error classes:

```typescript
import { 
  MorphError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError 
} from "@repo/morph-service";

try {
  await vm.instances.get("invalid_id");
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle 404
  } else if (error instanceof AuthenticationError) {
    // Handle auth failure
  }
}
```

## Environment Variables

- `MORPH_API_KEY` - Required API key for authentication

## Provider Factory

```typescript
// Factory function for dependency injection
export function createMorphVMProvider(
  config: MorphClientConfig,
  logger?: Logger
): VMProvider {
  return new MorphVMProvider({ ...config, logger });
}
```

## Health Check

```typescript
// Check provider connectivity
const isHealthy = await vm.healthCheck();
```

## Important Notes

### Instance Management
- Instance IDs format: `morphvm_[random]`
- Snapshot IDs format: `snapshot_[random]`
- Default timeout: 2 minutes
- Automatic retry with exponential backoff

### Command Execution
- Commands passed as arrays: `["command", "arg1", "arg2"]`
- Each array element becomes a separate argument
- Complex shell commands should use `["bash", "-c", "command"]`

### PM2 Integration
- PM2 daemon spawns automatically on first use
- Processes persist across command sessions
- Use `deleteAll()` to clean up before instance shutdown


## See Also

- `@repo/vm-interface` - VM provider interface documentation
- `@repo/claude-commands` - High-level Claude operations using VM providers
- `@repo/pm2-commands` - PM2 command builders