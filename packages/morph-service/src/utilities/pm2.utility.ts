import type { Logger } from "@repo/logger";
import {
  type CommandExecutor,
  PM2Client,
  type PM2Config,
  type PM2Logs,
  PM2ProcessBuilder,
  type PM2ProcessInfo,
} from "@repo/pm2-commands";
import type { InstanceService } from "../services/instance.service.js";

// Re-export types from PM2 package for backwards compatibility
export type { PM2Config, PM2ProcessInfo } from "@repo/pm2-commands";
export { PM2ProcessBuilder } from "@repo/pm2-commands";

class MorphCommandExecutor implements CommandExecutor {
  private readonly instanceService: InstanceService;
  private readonly instanceId: string;

  constructor(instanceService: InstanceService, instanceId: string) {
    this.instanceService = instanceService;
    this.instanceId = instanceId;
  }

  exec(command: string[]): Promise<{
    stdout: string;
    stderr: string;
    exit_code: number;
  }> {
    // Pass through directly - the command array format is correct
    return this.instanceService.exec(this.instanceId, command);
  }
}

export class PM2Utility {
  private readonly instanceService: InstanceService;
  private readonly logger: Logger;

  constructor(instanceService: InstanceService, logger: Logger) {
    this.instanceService = instanceService;
    this.logger = logger;
  }

  private createClient(instanceId: string): PM2Client {
    const executor = new MorphCommandExecutor(this.instanceService, instanceId);
    return new PM2Client(executor, this.logger);
  }

  async start(
    instanceId: string,
    scriptOrCommand: string,
    config?: PM2Config
  ): Promise<void> {
    const client = this.createClient(instanceId);
    await client.start(scriptOrCommand, config);
  }

  async stop(instanceId: string, nameOrId: string | number): Promise<void> {
    const client = this.createClient(instanceId);
    await client.stop(nameOrId);
  }

  async restart(instanceId: string, nameOrId: string | number): Promise<void> {
    const client = this.createClient(instanceId);
    await client.restart(nameOrId);
  }

  async delete(instanceId: string, nameOrId: string | number): Promise<void> {
    const client = this.createClient(instanceId);
    await client.delete(nameOrId);
  }

  async reload(instanceId: string, nameOrId: string | number): Promise<void> {
    const client = this.createClient(instanceId);
    await client.reload(nameOrId);
  }

  list(instanceId: string): Promise<PM2ProcessInfo[]> {
    const client = this.createClient(instanceId);
    return client.list();
  }

  describe(
    instanceId: string,
    nameOrId: string | number
  ): Promise<PM2ProcessInfo> {
    const client = this.createClient(instanceId);
    return client.describe(nameOrId);
  }

  async logs(
    instanceId: string,
    nameOrId?: string | number,
    lines = 50
  ): Promise<PM2Logs> {
    const client = this.createClient(instanceId);
    const logs = await client.logs(nameOrId, lines);
    // Ensure backward compatibility - convert arrays to strings if needed
    return {
      out: Array.isArray(logs.out) ? logs.out.join("\n") : logs.out,
      err: Array.isArray(logs.err) ? logs.err.join("\n") : logs.err,
    };
  }

  monit(instanceId: string): Promise<string> {
    const client = this.createClient(instanceId);
    return client.monit();
  }

  async startMany(instanceId: string, apps: PM2Config[]): Promise<void> {
    const client = this.createClient(instanceId);
    await client.startMany(apps);
  }

  async stopAll(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.stopAll();
  }

  async restartAll(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.restartAll();
  }

  async deleteAll(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.deleteAll();
  }

  async save(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.save();
  }

  async resurrect(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.resurrect();
  }

  async dump(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.dump();
  }

  startup(instanceId: string, platform?: string): Promise<string> {
    const client = this.createClient(instanceId);
    return client.startup(platform);
  }

  async unstartup(instanceId: string): Promise<void> {
    const client = this.createClient(instanceId);
    await client.unstartup();
  }

  async exec(instanceId: string, command: string): Promise<string> {
    const result = await this.instanceService.exec(instanceId, [
      "sh",
      "-c",
      command,
    ]);

    if (result.exit_code !== 0) {
      throw new Error(`Command failed: ${result.stderr}`);
    }

    return result.stdout;
  }

  async execJson<T>(instanceId: string, command: string): Promise<T> {
    const output = await this.exec(instanceId, command);

    try {
      return JSON.parse(output) as T;
    } catch (e) {
      throw new Error(`Failed to parse JSON output: ${e}`);
    }
  }

  createProcess(name: string): PM2ProcessBuilder {
    return new PM2ProcessBuilder(name);
  }
}
