import type { Logger } from "@repo/logger";
import type { PM2ProcessBuilder, PM2ProcessInfo } from "@repo/pm2-commands";
import type {
  BootOptions,
  ExecResult,
  ExecStreamChunk,
  FileInfo,
  ProcessLogs,
  ProcessStartOptions,
  SnapshotOptions,
  VMImage,
  VMInstance,
  VMSnapshot,
} from "./types.js";

// Core VM operations interface
export interface VMInstanceService {
  boot(snapshotId: string, options?: BootOptions): Promise<VMInstance>;
  get(instanceId: string): Promise<VMInstance>;
  list(filters?: Record<string, unknown>): Promise<VMInstance[]>;
  stop(instanceId: string): Promise<void>;
  terminate(instanceId: string): Promise<void>;
  fork(instanceId: string, count?: number): Promise<VMInstance[]>;
  setMetadata(
    instanceId: string,
    metadata: Record<string, string>
  ): Promise<void>;

  // Command execution
  exec(instanceId: string, command: string[]): Promise<ExecResult>;
  execStream(
    instanceId: string,
    command: string[]
  ): AsyncIterable<ExecStreamChunk>;
}

// Snapshot management interface
export interface VMSnapshotService {
  get(snapshotId: string): Promise<VMSnapshot>;
  list(filters?: Record<string, unknown>): Promise<VMSnapshot[]>;
  create(instanceId: string, options?: SnapshotOptions): Promise<VMSnapshot>;
  delete(snapshotId: string): Promise<void>;
}

// Image management interface
export interface VMImageService {
  get(imageId: string): Promise<VMImage>;
  list(): Promise<VMImage[]>;
}

// File operations interface
export interface VMFileService {
  readFile(instanceId: string, path: string): Promise<string>;
  writeFile(instanceId: string, path: string, content: string): Promise<void>;
  copyFile(instanceId: string, source: string, dest: string): Promise<void>;
  moveFile(instanceId: string, source: string, dest: string): Promise<void>;
  deleteFile(instanceId: string, path: string): Promise<void>;
  fileExists(instanceId: string, path: string): Promise<boolean>;

  // Directory operations
  createDirectory(
    instanceId: string,
    path: string,
    recursive?: boolean
  ): Promise<void>;
  listDirectory(instanceId: string, path: string): Promise<FileInfo[]>;
  isDirectory(instanceId: string, path: string): Promise<boolean>;
  deleteDirectory(instanceId: string, path: string): Promise<void>;

  // Atomic file operations (single network call)
  writeFileAtomic(
    instanceId: string,
    path: string,
    content: string,
    options?: {
      mode?: string; // File permissions (e.g., "600", "755")
      createDirs?: boolean; // Create parent directories if they don't exist
      owner?: string; // Owner user
      group?: string; // Owner group
    }
  ): Promise<void>;
}

// Process management interface (PM2 abstraction)
export interface VMProcessService {
  start(
    instanceId: string,
    command: string,
    options?: ProcessStartOptions
  ): Promise<void>;
  stop(instanceId: string, nameOrId: string | number): Promise<void>;
  restart(instanceId: string, nameOrId: string | number): Promise<void>;
  delete(instanceId: string, nameOrId: string | number): Promise<void>;
  list(instanceId: string): Promise<PM2ProcessInfo[]>;
  logs(
    instanceId: string,
    nameOrId?: string | number,
    lines?: number
  ): Promise<ProcessLogs>;

  // Batch operations
  stopAll(instanceId: string): Promise<void>;
  deleteAll(instanceId: string): Promise<void>;

  // Builder pattern access
  createProcess(name: string): PM2ProcessBuilder;
}

// Main VM Provider interface
export interface VMProvider {
  readonly name: string;
  readonly version: string;
  readonly logger?: Logger;

  instances: VMInstanceService;
  snapshots: VMSnapshotService;
  images: VMImageService;
  files: VMFileService;
  processes: VMProcessService;

  // Provider lifecycle
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}

// Factory function type for creating providers
export type VMProviderFactory<TConfig = unknown> = (
  config: TConfig,
  logger?: Logger
) => VMProvider;
