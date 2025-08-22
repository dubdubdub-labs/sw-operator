# MorphVM SDK Implementation Plan

## Overview
Creating a typed SDK for the MorphVM API with comprehensive error handling, validation, and developer-friendly abstractions. This will be the first package in our monorepo and will set the standard for future packages.

## Package Architecture

### 1. Logger Package (`@operator/logger`)
A reusable logging utility that will be used across all packages.

#### File Structure
```
packages/logger/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main exports
│   ├── logger.ts          # Core logger implementation
│   ├── formatters.ts      # Log formatters (json, pretty, etc.)
│   ├── transports.ts      # Console, file, etc.
│   ├── types.ts           # TypeScript types
│   └── __tests__/
│       └── logger.test.ts
└── README.md
```

#### Features
- **Log Levels**: trace, debug, info, warn, error, fatal
- **Structured Logging**: Support for metadata and context
- **Pretty Printing**: Development-friendly output with colors
- **JSON Output**: Production-ready structured logs
- **Child Loggers**: Create scoped loggers with context
- **Performance**: Minimal overhead, lazy evaluation
- **Type Safety**: Full TypeScript support

#### API Design
```typescript
const logger = createLogger({
  level: 'info',
  format: 'pretty', // or 'json'
  prefix: '[MorphVM]'
});

logger.info('Starting service', { port: 3000 });
logger.error('Failed to connect', new Error('Connection refused'));

const childLogger = logger.child({ service: 'snapshot' });
childLogger.debug('Creating snapshot', { instanceId: 'inst_123' });
```

### 2. MorphVM Service Package (`@operator/morph-service`)

#### File Structure
```
packages/morph-service/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts               # Main exports
│   ├── client.ts              # HTTP client with auth
│   ├── types/
│   │   ├── index.ts           # Generated types from OpenAPI
│   │   └── schemas.ts         # Zod schemas
│   ├── services/
│   │   ├── base.service.ts    # Base service class
│   │   ├── instance.service.ts
│   │   ├── snapshot.service.ts
│   │   ├── image.service.ts
│   │   └── ssh.service.ts
│   ├── utilities/              # High-level utility wrappers
│   │   └── file.utility.ts    # Simple file management
│   ├── errors/
│   │   ├── base.error.ts
│   │   ├── api.error.ts
│   │   ├── validation.error.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── retry.ts           # Retry logic with exponential backoff
│   │   ├── url-builder.ts     # URL construction utilities
│   │   └── validators.ts      # Common validators
│   ├── constants.ts
│   └── __tests__/
│       ├── client.test.ts
│       ├── services/
│       │   ├── instance.test.ts
│       │   └── snapshot.test.ts
│       ├── utilities/
│       │   └── file.test.ts
│       └── fixtures/
│           └── responses.ts
├── examples/
│   ├── basic-usage.ts
│   ├── snapshot-workflow.ts
│   ├── fork-instance.ts
│   └── file-operations.ts
└── README.md
```

#### Core Components

##### 1. HTTP Client
```typescript
class MorphClient {
  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retryConfig?: RetryConfig;
    logger?: Logger;
  });
  
  // Internal methods for making requests
  private request<T>(options: RequestOptions): Promise<T>;
  private handleError(error: unknown): never;
}
```

##### 2. Service Classes

**InstanceService**
```typescript
class InstanceService {
  // Core operations
  async list(filters?: InstanceFilters): Promise<Instance[]>;
  async get(instanceId: string): Promise<Instance>;
  async boot(snapshotId: string, options?: BootOptions): Promise<Instance>;
  async stop(instanceId: string): Promise<void>;
  async pause(instanceId: string, createSnapshot?: boolean): Promise<Instance>;
  async resume(instanceId: string): Promise<Instance>;
  async reboot(instanceId: string): Promise<Instance>;
  
  // Advanced operations
  async fork(instanceId: string, count?: number): Promise<ForkResult>;
  async exec(instanceId: string, command: string[]): Promise<ExecResult>;
  async execStream(instanceId: string, command: string[]): AsyncIterator<ExecEvent>;
  
  // Networking
  async exposeHttp(instanceId: string, service: HttpService): Promise<Instance>;
  async hideHttp(instanceId: string, serviceName: string): Promise<Instance>;
  async getServiceUrl(instanceId: string, portOrName: string | number): Promise<string>;
  
  // Metadata & TTL
  async setMetadata(instanceId: string, metadata: Record<string, string>): Promise<Instance>;
  async updateTTL(instanceId: string, ttl: TTLConfig): Promise<Instance>;
  async updateWakeOn(instanceId: string, wake: WakeConfig): Promise<Instance>;
}
```

**SnapshotService**
```typescript
class SnapshotService {
  async create(options: CreateSnapshotOptions): Promise<Snapshot>;
  async list(filters?: SnapshotFilters): Promise<Snapshot[]>;
  async get(snapshotId: string): Promise<Snapshot>;
  async delete(snapshotId: string): Promise<void>;
  async createFromInstance(instanceId: string, options?: SnapshotOptions): Promise<Snapshot>;
  async setMetadata(snapshotId: string, metadata: Record<string, string>): Promise<Snapshot>;
  
  // Sharing
  async createToken(snapshotId: string, expiresIn?: number): Promise<ShareToken>;
  async pull(token: string, metadata?: Record<string, string>): Promise<Snapshot>;
}
```

##### 3. Error Handling

```typescript
// Base error class
class MorphError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  );
}

// Specific error types
class ValidationError extends MorphError {}
class APIError extends MorphError {}
class NetworkError extends MorphError {}
class AuthenticationError extends MorphError {}
class RateLimitError extends MorphError {}
class ResourceNotFoundError extends MorphError {}
```

##### 4. Validation Schemas (Zod)

```typescript
// Request validation
const BootOptionsSchema = z.object({
  vcpus: z.number().min(1).max(32).optional(),
  memory: z.number().min(128).max(65536).optional(),
  diskSize: z.number().min(100).optional(),
  metadata: z.record(z.string()).optional(),
  ttlSeconds: z.number().min(60).optional(),
  ttlAction: z.enum(['stop', 'pause']).optional(),
});

// Response validation
const InstanceSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'ready', 'paused', 'saving', 'error']),
  // ... complete schema
});
```

#### High-Level Utility Wrappers

These utilities provide simple, focused abstractions beyond direct API calls. All methods use camelCase naming convention.

##### File Utilities (`file.utility.ts`)
```typescript
class FileUtility {
  constructor(private instanceService: InstanceService);
  
  // Core file operations
  async writeFile(instanceId: string, path: string, content: string): Promise<void>;
  async readFile(instanceId: string, path: string): Promise<string>;
  async appendFile(instanceId: string, path: string, content: string): Promise<void>;
  async deleteFile(instanceId: string, path: string): Promise<void>;
  async renameFile(instanceId: string, oldPath: string, newPath: string): Promise<void>;
  async copyFile(instanceId: string, source: string, dest: string): Promise<void>;
  
  // Directory operations  
  async createDirectory(instanceId: string, path: string, recursive?: boolean): Promise<void>;
  async listDirectory(instanceId: string, path: string): Promise<string[]>;
  async deleteDirectory(instanceId: string, path: string): Promise<void>;
  
  // Utilities
  async fileExists(instanceId: string, path: string): Promise<boolean>;
  async isDirectory(instanceId: string, path: string): Promise<boolean>;
}
```

Implementation will use simple exec commands like:
- `writeFile`: `cat > path << 'EOF'\ncontent\nEOF`
- `readFile`: `cat path`
- `appendFile`: `cat >> path << 'EOF'\ncontent\nEOF`
- `deleteFile`: `rm -f path`
- `renameFile`: `mv oldPath newPath`
- `fileExists`: `test -f path`
- `isDirectory`: `test -d path`

##### PM2 Process Manager Utilities (`pm2.utility.ts`)
```typescript
interface PM2Config {
  name?: string;
  script?: string;
  args?: string | string[];
  interpreter?: string;
  interpreterArgs?: string | string[];
  cwd?: string;
  env?: Record<string, string>;
  instances?: number;
  execMode?: 'fork' | 'cluster';
  watch?: boolean | string[];
  ignoreWatch?: string[];
  maxMemoryRestart?: string;
  minUptime?: string;
  maxRestarts?: number;
  cronRestart?: string;
  vizion?: boolean;
  autorestart?: boolean;
  killTimeout?: number;
  waitReady?: boolean;
  combinedLogs?: boolean;
  mergeLog?: boolean;
  logDateFormat?: string;
  error?: string;
  out?: string;
  log?: string;
  time?: boolean;
  namespace?: string;
}

interface PM2ProcessInfo {
  name: string;
  pm_id: number;
  status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored';
  cpu: number;
  memory: number;
  pid?: number;
  pm_uptime?: number;
  restart_time?: number;
}

class PM2Utility {
  constructor(private instanceService: InstanceService);

  // Core PM2 operations
  async start(
    instanceId: string, 
    scriptOrCommand: string, 
    config?: PM2Config
  ): Promise<void>;
  
  async stop(instanceId: string, nameOrId: string | number): Promise<void>;
  
  async restart(instanceId: string, nameOrId: string | number): Promise<void>;
  
  async delete(instanceId: string, nameOrId: string | number): Promise<void>;
  
  async reload(instanceId: string, nameOrId: string | number): Promise<void>;
  
  // Process monitoring
  async list(instanceId: string): Promise<PM2ProcessInfo[]>;
  
  async describe(instanceId: string, nameOrId: string | number): Promise<PM2ProcessInfo>;
  
  async logs(
    instanceId: string, 
    nameOrId?: string | number, 
    lines?: number
  ): Promise<{ out: string; error: string }>;
  
  async monit(instanceId: string): Promise<string>;
  
  // Batch operations
  async startMany(instanceId: string, apps: PM2Config[]): Promise<void>;
  
  async stopAll(instanceId: string): Promise<void>;
  
  async restartAll(instanceId: string): Promise<void>;
  
  async deleteAll(instanceId: string): Promise<void>;
  
  // Configuration management
  async save(instanceId: string): Promise<void>;
  
  async resurrect(instanceId: string): Promise<void>;
  
  async dump(instanceId: string): Promise<void>;
  
  async startup(instanceId: string, platform?: string): Promise<string>;
  
  async unstartup(instanceId: string): Promise<void>;
  
  // Helper methods
  async exec(instanceId: string, command: string): Promise<string>;
  
  async execJson<T>(instanceId: string, command: string): Promise<T>;
  
  // Builder pattern for complex configurations
  createProcess(name: string): PM2ProcessBuilder;
}

// Fluent builder for PM2 processes
class PM2ProcessBuilder {
  private config: PM2Config = {};
  
  constructor(name: string) {
    this.config.name = name;
  }
  
  script(path: string): this {
    this.config.script = path;
    return this;
  }
  
  args(args: string | string[]): this {
    this.config.args = args;
    return this;
  }
  
  env(env: Record<string, string>): this {
    this.config.env = env;
    return this;
  }
  
  cwd(path: string): this {
    this.config.cwd = path;
    return this;
  }
  
  instances(count: number): this {
    this.config.instances = count;
    return this;
  }
  
  watch(paths?: boolean | string[]): this {
    this.config.watch = paths ?? true;
    return this;
  }
  
  maxMemory(limit: string): this {
    this.config.maxMemoryRestart = limit;
    return this;
  }
  
  cron(pattern: string): this {
    this.config.cronRestart = pattern;
    return this;
  }
  
  noAutorestart(): this {
    this.config.autorestart = false;
    return this;
  }
  
  logFile(path: string): this {
    this.config.out = path;
    this.config.error = path;
    return this;
  }
  
  async start(instanceId: string, pm2Utility: PM2Utility): Promise<void> {
    return pm2Utility.start(instanceId, this.config.script!, this.config);
  }
  
  build(): PM2Config {
    return this.config;
  }
}
```

Implementation examples:
```typescript
// Simple start
await morph.pm2.start(instanceId, 'npm run dev', { name: 'my-app' });

// Complex configuration with builder
await morph.pm2
  .createProcess('claude-sync')
  .script('claude-sync sync')
  .env({ CLOUD_CODE_ITERATION_ID: iterationId })
  .cwd('~/workspace')
  .noAutorestart()
  .start(instanceId, morph.pm2);

// Batch operations
await morph.pm2.stopAll(instanceId);
await morph.pm2.deleteAll(instanceId);

// Monitoring
const processes = await morph.pm2.list(instanceId);
const logs = await morph.pm2.logs(instanceId, 'my-app', 100);
```

Command building implementation:
```typescript
// Internal implementation using exec
class PM2Utility {
  private buildPM2Command(action: string, target?: string | number, flags?: string[]): string {
    const parts = ['pm2', action];
    if (target !== undefined) {
      parts.push(String(target));
    }
    if (flags && flags.length > 0) {
      parts.push(...flags);
    }
    return parts.join(' ');
  }
  
  private buildPM2StartCommand(scriptOrCommand: string, config?: PM2Config): string {
    const parts = ['pm2', 'start'];
    
    // Handle script vs command
    if (config?.script) {
      parts.push(config.script);
    } else {
      parts.push(`'${scriptOrCommand}'`);
    }
    
    // Add configuration flags
    if (config?.name) parts.push('--name', config.name);
    if (config?.args) {
      const args = Array.isArray(config.args) ? config.args.join(' ') : config.args;
      parts.push('--', args);
    }
    if (config?.cwd) parts.push('--cwd', config.cwd);
    if (config?.instances) parts.push('-i', String(config.instances));
    if (config?.watch) parts.push('--watch');
    if (config?.maxMemoryRestart) parts.push('--max-memory-restart', config.maxMemoryRestart);
    if (config?.autorestart === false) parts.push('--no-autorestart');
    if (config?.env) {
      // Environment variables need special handling
      for (const [key, value] of Object.entries(config.env)) {
        parts.push(`--env`, `${key}=${value}`);
      }
    }
    
    return parts.join(' ');
  }
  
  async start(instanceId: string, scriptOrCommand: string, config?: PM2Config): Promise<void> {
    const command = this.buildPM2StartCommand(scriptOrCommand, config);
    await this.instanceService.exec(instanceId, ['sh', '-c', command]);
  }
  
  async stop(instanceId: string, nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command('stop', nameOrId);
    await this.instanceService.exec(instanceId, ['sh', '-c', command]);
  }
  
  async list(instanceId: string): Promise<PM2ProcessInfo[]> {
    const result = await this.instanceService.exec(instanceId, ['pm2', 'jlist']);
    return JSON.parse(result.stdout);
  }
}
```

#### Main API Surface

The SDK is designed with a clear, hierarchical API that's discoverable through IDE autocomplete:

```typescript
// Main entry point - everything flows from here
import { createMorphClient } from '@operator/morph-service';

const morph = createMorphClient({
  apiKey: process.env.MORPH_API_KEY,
  baseUrl: 'https://api.morph.so', // optional
});

// Primary API Surface - clean namespace organization
morph.instances.list()
morph.instances.get(id)
morph.instances.boot(snapshotId, options)
morph.instances.stop(id)
morph.instances.exec(id, ['echo', 'hello'])

morph.snapshots.create(options)
morph.snapshots.list()
morph.snapshots.delete(id)
morph.snapshots.fromInstance(instanceId)

morph.images.list()
morph.images.get(id)

// Utility layer - common tasks made simple
morph.files.writeFile(instanceId, '/path/to/file', 'content')
morph.files.readFile(instanceId, '/path/to/file')
morph.files.exists(instanceId, '/path/to/file')

// PM2 process management
morph.pm2.start(instanceId, 'npm run dev', { name: 'app' })
morph.pm2.stop(instanceId, 'app')
morph.pm2.restart(instanceId, 'app')
morph.pm2.list(instanceId)

// Builder pattern for complex operations
const instance = await morph
  .createSnapshot()
  .fromImage('ubuntu-22.04')
  .withMemory(2048)
  .withVcpus(2)
  .withReadinessCheck({ timeout: 30 })
  .build();

// Typed responses with full IntelliSense
const snapshot = await morph.snapshots.get('snap_123');
snapshot.id // string
snapshot.status // 'pending' | 'ready' | 'failed' | ...
snapshot.spec.memory // number
```

##### API Documentation Strategy

1. **Single-file API reference** (`api.ts`):
```typescript
// This file serves as both implementation and documentation
export interface MorphClient {
  /**
   * Instance management operations
   * @example
   * const instances = await morph.instances.list();
   * const instance = await morph.instances.boot('snap_123');
   */
  instances: {
    /** List all instances with optional filters */
    list(filters?: { metadata?: Record<string, string> }): Promise<Instance[]>;
    
    /** Get a specific instance by ID */
    get(instanceId: string): Promise<Instance>;
    
    /** Boot a new instance from a snapshot */
    boot(snapshotId: string, options?: BootOptions): Promise<Instance>;
    
    /** Stop and delete an instance */
    stop(instanceId: string): Promise<void>;
    
    /** Execute a command in an instance */
    exec(instanceId: string, command: string[]): Promise<ExecResult>;
    
    /** Stream command output */
    execStream(instanceId: string, command: string[]): AsyncIterator<ExecEvent>;
    
    /** Pause an instance (optionally creating snapshot) */
    pause(instanceId: string, createSnapshot?: boolean): Promise<Instance>;
    
    /** Resume a paused instance */
    resume(instanceId: string): Promise<Instance>;
    
    /** Fork an instance into multiple copies */
    fork(instanceId: string, count?: number): Promise<ForkResult>;
    
    /** Expose HTTP service */
    exposeHttp(instanceId: string, name: string, port: number): Promise<string>;
    
    /** Get service URL */
    getServiceUrl(instanceId: string, portOrName: string | number): Promise<string>;
  };
  
  /**
   * Snapshot management operations
   */
  snapshots: {
    /** Create a new snapshot from an image */
    create(options: CreateSnapshotOptions): Promise<Snapshot>;
    
    /** List snapshots with optional filters */
    list(filters?: SnapshotFilters): Promise<Snapshot[]>;
    
    /** Get a specific snapshot */
    get(snapshotId: string): Promise<Snapshot>;
    
    /** Delete a snapshot */
    delete(snapshotId: string): Promise<void>;
    
    /** Create snapshot from running instance */
    fromInstance(instanceId: string, options?: SnapshotOptions): Promise<Snapshot>;
    
    /** Share a snapshot with token */
    share(snapshotId: string, expiresIn?: number): Promise<ShareToken>;
    
    /** Import a shared snapshot */
    pull(token: string): Promise<Snapshot>;
  };
  
  /**
   * Simple file operations utilities
   */
  files: {
    /** Write content to a file */
    writeFile(instanceId: string, path: string, content: string): Promise<void>;
    
    /** Read file contents */
    readFile(instanceId: string, path: string): Promise<string>;
    
    /** Append to a file */
    appendFile(instanceId: string, path: string, content: string): Promise<void>;
    
    /** Delete a file */
    deleteFile(instanceId: string, path: string): Promise<void>;
    
    /** Rename/move a file */
    renameFile(instanceId: string, oldPath: string, newPath: string): Promise<void>;
    
    /** Check if file exists */
    exists(instanceId: string, path: string): Promise<boolean>;
    
    /** List directory contents */
    listDirectory(instanceId: string, path: string): Promise<string[]>;
  };
}
```

2. **Type exports for consumers**:
```typescript
// All types are exported from root for easy access
export type {
  Instance,
  Snapshot,
  Image,
  InstanceStatus,
  SnapshotStatus,
  ExecResult,
  BootOptions,
  CreateSnapshotOptions,
  // ... all other types
} from '@operator/morph-service';
```

3. **Error handling with specific error types**:
```typescript
import { MorphError, ValidationError, NotFoundError } from '@operator/morph-service';

try {
  await morph.instances.get('invalid_id');
} catch (error) {
  if (error instanceof NotFoundError) {
    // Instance doesn't exist
  } else if (error instanceof ValidationError) {
    // Invalid request parameters
  }
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1)
1. **Logger Package**
   - Core logger implementation
   - Formatters and transports
   - Unit tests
   - Documentation

2. **MorphVM Client Setup**
   - Project structure
   - TypeScript configuration
   - Dependencies (zod, fetch/axios alternative)

### Phase 2: Core SDK (Week 2)
1. **Type Generation**
   - Parse OpenAPI spec
   - Generate TypeScript types
   - Create Zod schemas

2. **HTTP Client**
   - Authentication
   - Request/response handling
   - Error handling
   - Retry logic

3. **Base Service Class**
   - Common functionality
   - Error handling patterns
   - Logging integration

### Phase 3: Service Implementation (Week 3)
1. **Service Classes**
   - Instance service
   - Snapshot service
   - Image service
   - SSH service

2. **Validation**
   - Request validation
   - Response validation
   - Custom validators

### Phase 4: Advanced Features (Week 4)
1. **Convenience Wrappers**
   - High-level operations
   - Workflow helpers
   - Builder patterns

2. **Testing & Documentation**
   - Unit tests (>90% coverage)
   - Integration tests
   - API documentation
   - Usage examples

## Testing Strategy

### Unit Tests
- Mock HTTP responses
- Test all error scenarios
- Validate schema enforcement
- Test retry logic

### Integration Tests
- Real API calls (test environment)
- End-to-end workflows
- Performance benchmarks

## Documentation

### API Reference
- Auto-generated from TypeScript
- JSDoc comments for all public methods
- Code examples for each method

### Guides
1. **Getting Started**: Installation, authentication, first API call
2. **Common Workflows**: Snapshot, boot, fork patterns
3. **Error Handling**: How to handle different error types
4. **Advanced Usage**: Streaming, retries, custom configuration

### Examples
- Basic CRUD operations
- Complex workflows
- Error handling patterns
- Performance optimization

## Error Handling Philosophy

1. **Fail Fast**: Validate early, throw immediately
2. **Rich Context**: Include all relevant information in errors
3. **Actionable Messages**: Tell developers how to fix the issue
4. **Typed Errors**: Use specific error classes for different scenarios
5. **Graceful Degradation**: Retry transient failures automatically

## Performance Considerations

1. **Connection Pooling**: Reuse HTTP connections
2. **Request Batching**: Support bulk operations where possible
3. **Lazy Loading**: Only import what's needed
4. **Caching**: Cache immutable data (images, etc.)
5. **Streaming**: Use streams for large responses

## Security Considerations

1. **API Key Storage**: Never log or expose API keys
2. **Input Validation**: Strict validation on all inputs
3. **HTTPS Only**: Enforce HTTPS for all requests
4. **Rate Limiting**: Respect and handle rate limits
5. **Timeout Protection**: Prevent hanging requests

## Success Metrics

1. **Developer Experience**
   - Time to first successful API call < 5 minutes
   - Clear, actionable error messages
   - IntelliSense support for all methods

2. **Code Quality**
   - >90% test coverage
   - 0 TypeScript errors
   - Passes all Biome/Ultracite rules
   - <10ms overhead per API call

3. **Documentation**
   - 100% public API documented
   - Working examples for all major use cases
   - Migration guide from raw API

## Dependencies

### Logger Package
- No runtime dependencies (pure TypeScript)
- Dev: vitest, @types/node

### MorphVM Service
- Runtime: zod, @operator/logger
- Dev: vitest, @types/node, tsx

## Package.json Configuration

### Logger Package
```json
{
  "name": "@operator/logger",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "lint": "biome check .",
    "format": "biome format --write ."
  }
}
```

### MorphVM Service
```json
{
  "name": "@operator/morph-service",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@operator/logger": "workspace:*",
    "zod": "^3.x"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "lint": "biome check .",
    "format": "biome format --write .",
    "example": "tsx examples/basic-usage.ts"
  }
}
```