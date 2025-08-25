import { createLogger, type Logger } from "@repo/logger";
import type { PM2ProcessBuilder } from "@repo/pm2-commands";
import type {
  ExecResult,
  ExecStreamChunk,
  FileInfo,
  ProcessLogs,
  ProcessStartOptions,
  VMFileService,
  VMImage,
  VMImageService,
  VMInstance,
  VMInstanceService,
  VMProcessService,
  VMProvider,
  VMSnapshot,
  VMSnapshotService,
} from "@repo/vm-interface";
import { MorphClient, type MorphClientConfig } from "./client.js";
import { ImageService } from "./services/image.service.js";
import { InstanceService } from "./services/instance.service.js";
import { SnapshotService } from "./services/snapshot.service.js";
import type {
  InstanceModel,
  InstanceStatus,
  SnapshotModel,
  SnapshotStatus,
} from "./types/models.js";
import { FileUtility } from "./utilities/file.utility.js";
import { PM2Utility } from "./utilities/pm2.utility.js";

// Adapter classes to bridge Morph services to VM interfaces
class MorphInstanceAdapter implements VMInstanceService {
  private service: InstanceService;

  constructor(service: InstanceService) {
    this.service = service;
  }

  private mapInstance(instance: InstanceModel): VMInstance {
    return {
      id: instance.id,
      status: this.mapInstanceStatus(instance.status),
      metadata: instance.metadata,
      created_at: new Date(instance.created * 1000).toISOString(),
      ttl: instance.ttl
        ? {
            seconds: instance.ttl.ttl_seconds ?? undefined,
            action: instance.ttl.ttl_action === "stop" ? "stop" : "terminate",
          }
        : undefined,
    };
  }

  private mapInstanceStatus(status: InstanceStatus): VMInstance["status"] {
    switch (status) {
      case "pending":
        return "booting";
      case "ready":
        return "ready";
      case "paused":
        return "stopped";
      case "saving":
        return "stopping";
      case "error":
        return "error";
      default:
        return "error";
    }
  }

  async boot(
    snapshotId: string,
    options?: Parameters<VMInstanceService["boot"]>[1]
  ): Promise<VMInstance> {
    const result = await this.service.boot(
      snapshotId,
      options
        ? {
            ttl_seconds: options.ttl_seconds,
            ttl_action: options.ttl_action as "stop" | "pause" | undefined,
            metadata: options.metadata,
          }
        : undefined
    );

    return this.mapInstance(result);
  }

  async get(instanceId: string): Promise<VMInstance> {
    const result = await this.service.get(instanceId);
    return this.mapInstance(result);
  }

  async list(filters?: Record<string, unknown>): Promise<VMInstance[]> {
    const results = await this.service.list(filters);
    return results.map((result) => this.mapInstance(result));
  }

  stop(instanceId: string): Promise<void> {
    return this.service.stop(instanceId);
  }

  async terminate(instanceId: string): Promise<void> {
    // MorphVM doesn't have terminate, use stop
    await this.service.stop(instanceId);
  }

  async fork(instanceId: string, count = 1): Promise<VMInstance[]> {
    const response = await this.service.fork(instanceId, count);
    return response.instances.map((instance) => this.mapInstance(instance));
  }

  setMetadata(
    _instanceId: string,
    _metadata: Record<string, string>
  ): Promise<void> {
    // Note: MorphVM may not support metadata updates, this is a placeholder
    // Would need to check MorphVM API for metadata update endpoint
    return Promise.reject(
      new Error("Metadata update not implemented for MorphVM")
    );
  }

  exec(instanceId: string, command: string[]): Promise<ExecResult> {
    return this.service.exec(instanceId, command);
  }

  async *execStream(
    instanceId: string,
    command: string[]
  ): AsyncIterable<ExecStreamChunk> {
    // MorphVM doesn't support streaming, simulate with single exec
    const result = await this.service.exec(instanceId, command);
    if (result.stdout) {
      yield { type: "stdout", data: result.stdout };
    }
    if (result.stderr) {
      yield { type: "stderr", data: result.stderr };
    }
    yield { type: "exit", data: "", exit_code: result.exit_code };
  }
}

class MorphSnapshotAdapter implements VMSnapshotService {
  private service: SnapshotService;

  constructor(service: SnapshotService) {
    this.service = service;
  }

  private mapSnapshot(snapshot: SnapshotModel): VMSnapshot {
    return {
      id: snapshot.id,
      status: this.mapSnapshotStatus(snapshot.status),
      created_at: new Date(snapshot.created * 1000).toISOString(),
      metadata: snapshot.metadata,
    };
  }

  private mapSnapshotStatus(status: SnapshotStatus): VMSnapshot["status"] {
    switch (status) {
      case "pending":
        return "creating";
      case "ready":
        return "ready";
      case "failed":
        return "error";
      case "deleting":
      case "deleted":
        return "deleting";
      default:
        return "error";
    }
  }

  async get(snapshotId: string): Promise<VMSnapshot> {
    const result = await this.service.get(snapshotId);
    return this.mapSnapshot(result);
  }

  async list(filters?: Record<string, unknown>): Promise<VMSnapshot[]> {
    const results = await this.service.list(filters);
    return results.map((result) => this.mapSnapshot(result));
  }

  async create(
    instanceId: string,
    _options?: Parameters<VMSnapshotService["create"]>[1]
  ): Promise<VMSnapshot> {
    // MorphVM creates snapshots through the pause endpoint on instances
    // This is a workaround since the SnapshotService.create is for creating from images
    // Access the client through the protected base service property
    // This is a workaround since MorphVM creates snapshots via instance pause
    const baseService = this.service as unknown as {
      client: MorphClient;
      logger: Logger;
    };
    const instanceService = new InstanceService(
      baseService.client,
      baseService.logger
    );
    const result = await instanceService.pause(instanceId, true);
    // Get the snapshot ID from the paused instance
    const snapshotId = result.refs.snapshot_id;
    return this.get(snapshotId);
  }

  delete(snapshotId: string): Promise<void> {
    return this.service.delete(snapshotId);
  }
}

class MorphImageAdapter implements VMImageService {
  private service: ImageService;

  constructor(service: ImageService) {
    this.service = service;
  }

  async get(imageId: string): Promise<VMImage> {
    const result = await this.service.get(imageId);
    if (!result) {
      throw new Error(`Image ${imageId} not found`);
    }
    return {
      id: result.id,
      name: result.name || result.id,
      description: result.description ?? undefined,
      created_at: new Date(result.created * 1000).toISOString(),
    };
  }

  async list(): Promise<VMImage[]> {
    const results = await this.service.list();
    return results.map((result) => ({
      id: result.id,
      name: result.name || result.id,
      description: result.description ?? undefined,
      created_at: new Date(result.created * 1000).toISOString(),
    }));
  }
}

class MorphFileAdapter implements VMFileService {
  private utility: FileUtility;
  private instanceService: InstanceService;

  constructor(utility: FileUtility, instanceService: InstanceService) {
    this.utility = utility;
    this.instanceService = instanceService;
  }

  readFile(instanceId: string, path: string): Promise<string> {
    return this.utility.readFile(instanceId, path);
  }

  writeFile(instanceId: string, path: string, content: string): Promise<void> {
    return this.utility.writeFile(instanceId, path, content);
  }

  copyFile(instanceId: string, source: string, dest: string): Promise<void> {
    return this.utility.copyFile(instanceId, source, dest);
  }

  moveFile(instanceId: string, source: string, dest: string): Promise<void> {
    return this.utility.moveFile(instanceId, source, dest);
  }

  deleteFile(instanceId: string, path: string): Promise<void> {
    return this.utility.deleteFile(instanceId, path);
  }

  fileExists(instanceId: string, path: string): Promise<boolean> {
    return this.utility.fileExists(instanceId, path);
  }

  createDirectory(
    instanceId: string,
    path: string,
    recursive?: boolean
  ): Promise<void> {
    return this.utility.createDirectory(instanceId, path, recursive);
  }

  async listDirectory(instanceId: string, path: string): Promise<FileInfo[]> {
    const results = await this.utility.listDirectory(instanceId, path);
    // MorphVM returns string array, not file info objects
    return results.map((name) => ({
      path: name,
      isDirectory: false, // Can't determine from simple ls
      size: undefined,
      modified: undefined,
    }));
  }

  isDirectory(instanceId: string, path: string): Promise<boolean> {
    return this.utility.isDirectory(instanceId, path);
  }

  deleteDirectory(instanceId: string, path: string): Promise<void> {
    return this.utility.deleteDirectory(instanceId, path);
  }

  async writeFileAtomic(
    instanceId: string,
    path: string,
    content: string,
    options?: {
      mode?: string;
      createDirs?: boolean;
      owner?: string;
      group?: string;
    }
  ): Promise<void> {
    // Build a single bash command that does everything atomically
    const commands: string[] = [];

    // Create parent directory if needed
    if (options?.createDirs) {
      const dirPath = path.includes("/")
        ? path.substring(0, path.lastIndexOf("/"))
        : ".";
      commands.push(`mkdir -p "${dirPath}"`);
    }

    // Write the file using cat with heredoc to handle special characters
    // Use base64 encoding to avoid issues with quotes and special chars
    const encodedContent = Buffer.from(content).toString("base64");
    commands.push(`echo '${encodedContent}' | base64 -d > "${path}"`);

    // Set permissions if specified
    if (options?.mode) {
      commands.push(`chmod ${options.mode} "${path}"`);
    }

    // Set ownership if specified
    if (options?.owner || options?.group) {
      const ownership = `${options.owner ?? ""}${options.group ? `:${options.group}` : ""}`;
      if (ownership) {
        commands.push(`chown ${ownership} "${path}"`);
      }
    }

    // Execute all commands in a single call
    const script = commands.join(" && ");
    const result = await this.instanceService.exec(instanceId, [
      "bash",
      "-c",
      script,
    ]);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to write file atomically: ${result.stderr}`);
    }
  }
}

class MorphProcessAdapter implements VMProcessService {
  private utility: PM2Utility;

  constructor(utility: PM2Utility) {
    this.utility = utility;
  }

  start(
    instanceId: string,
    command: string,
    options?: ProcessStartOptions
  ): Promise<void> {
    return this.utility.start(instanceId, command, options);
  }

  stop(instanceId: string, nameOrId: string | number): Promise<void> {
    return this.utility.stop(instanceId, nameOrId);
  }

  restart(instanceId: string, nameOrId: string | number): Promise<void> {
    return this.utility.restart(instanceId, nameOrId);
  }

  delete(instanceId: string, nameOrId: string | number): Promise<void> {
    return this.utility.delete(instanceId, nameOrId);
  }

  list(
    instanceId: string
  ): Promise<import("@repo/pm2-commands").PM2ProcessInfo[]> {
    return this.utility.list(instanceId);
  }

  async logs(
    instanceId: string,
    nameOrId?: string | number,
    lines?: number
  ): Promise<ProcessLogs> {
    const result = await this.utility.logs(instanceId, nameOrId, lines);
    return {
      out: typeof result.out === "string" ? result.out : result.out.join("\n"),
      err: typeof result.err === "string" ? result.err : result.err.join("\n"),
    };
  }

  stopAll(instanceId: string): Promise<void> {
    return this.utility.stopAll(instanceId);
  }

  deleteAll(instanceId: string): Promise<void> {
    return this.utility.deleteAll(instanceId);
  }

  createProcess(name: string): PM2ProcessBuilder {
    return this.utility.createProcess(name);
  }
}

// Main MorphVM Provider implementation
export class MorphVMProvider implements VMProvider {
  readonly name = "morph-vm";
  readonly version = "0.1.0";
  readonly logger?: Logger;

  readonly instances: VMInstanceService;
  readonly snapshots: VMSnapshotService;
  readonly images: VMImageService;
  readonly files: VMFileService;
  readonly processes: VMProcessService;

  constructor(config: MorphClientConfig) {
    this.logger = config.logger ?? createLogger({ prefix: "MorphVM" });
    const client = new MorphClient(config);

    // Initialize services
    const instanceService = new InstanceService(
      client,
      this.logger.child({ prefix: "InstanceService" })
    );

    const snapshotService = new SnapshotService(
      client,
      this.logger.child({ prefix: "SnapshotService" })
    );

    const imageService = new ImageService(
      client,
      this.logger.child({ prefix: "ImageService" })
    );

    const fileUtility = new FileUtility(
      instanceService,
      this.logger.child({ prefix: "FileUtility" })
    );

    const pm2Utility = new PM2Utility(
      instanceService,
      this.logger.child({ prefix: "PM2Utility" })
    );

    // Create adapters
    this.instances = new MorphInstanceAdapter(instanceService);
    this.snapshots = new MorphSnapshotAdapter(snapshotService);
    this.images = new MorphImageAdapter(imageService);
    this.files = new MorphFileAdapter(fileUtility, instanceService);
    this.processes = new MorphProcessAdapter(pm2Utility);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.instances.list();
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function
export function createMorphVMProvider(
  config: MorphClientConfig,
  logger?: Logger
): VMProvider {
  return new MorphVMProvider({ ...config, logger });
}
