import type { Logger } from "@repo/logger";
import { PM2ProcessBuilder } from "./builder.js";
import type {
  CommandExecutor,
  PM2Config,
  PM2Logs,
  PM2ProcessInfo,
  PM2RawProcess,
} from "./types.js";

export class PM2Client {
  constructor(
    private readonly executor: CommandExecutor,
    private readonly logger?: Logger
  ) {}

  private buildPM2Command(
    action: string,
    target?: string | number,
    flags?: string[]
  ): string {
    const parts = ["pm2", action];
    if (target !== undefined) {
      parts.push(String(target));
    }
    if (flags && flags.length > 0) {
      parts.push(...flags);
    }
    return parts.join(" ");
  }

  private buildPM2StartCommand(
    scriptOrCommand: string,
    config?: PM2Config
  ): string {
    const parts = ["pm2", "start"];

    // Handle script vs command
    if (config?.script) {
      parts.push(config.script);
    } else {
      // For inline commands, wrap in quotes like in the reference
      const escapedCommand = scriptOrCommand.replace(/'/g, "'\\''");
      parts.push(`'${escapedCommand}'`);
    }

    // Add configuration flags
    if (config?.name) parts.push("--name", `"${config.name}"`);
    if (config?.args) {
      const args = Array.isArray(config.args)
        ? config.args.join(" ")
        : config.args;
      parts.push("--", args);
    }
    if (config?.cwd) parts.push("--cwd", config.cwd);
    if (config?.instances) parts.push("-i", String(config.instances));
    if (config?.watch) parts.push("--watch");
    if (config?.maxMemoryRestart)
      parts.push("--max-memory-restart", config.maxMemoryRestart);
    if (config?.autorestart === false) parts.push("--no-autorestart");
    if (config?.env) {
      // Environment variables need special handling
      for (const [key, value] of Object.entries(config.env)) {
        parts.push("--env", `${key}=${value}`);
      }
    }

    return parts.join(" ");
  }

  async start(
    scriptOrCommand: string,
    config?: PM2Config
  ): Promise<void> {
    const command = this.buildPM2StartCommand(scriptOrCommand, config);
    
    console.log("PM2 Start Command:", command);
    console.log("Executing:", ["sh", "-c", command]);
    
    const result = await this.executor.exec(["sh", "-c", command]);

    console.log("PM2 Start Result:", {
      exit_code: result.exit_code,
      stdout: result.stdout.slice(0, 500),
      stderr: result.stderr
    });

    if (result.exit_code !== 0) {
      throw new Error(`Failed to start PM2 process: ${result.stderr}`);
    }

    this.logger?.debug("Started PM2 process", {
      name: config?.name ?? scriptOrCommand,
    });
  }

  async stop(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("stop", nameOrId);
    const result = await this.executor.exec(["sh", "-c", command]);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to stop PM2 process ${nameOrId}: ${result.stderr}`
      );
    }

    this.logger?.debug(`Stopped PM2 process ${nameOrId}`);
  }

  async restart(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("restart", nameOrId);
    const result = await this.executor.exec(["sh", "-c", command]);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to restart PM2 process ${nameOrId}: ${result.stderr}`
      );
    }

    this.logger?.debug(`Restarted PM2 process ${nameOrId}`);
  }

  async delete(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("delete", nameOrId);
    const result = await this.executor.exec(["sh", "-c", command]);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to delete PM2 process ${nameOrId}: ${result.stderr}`
      );
    }

    this.logger?.debug(`Deleted PM2 process ${nameOrId}`);
  }

  async reload(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("reload", nameOrId);
    const result = await this.executor.exec(["sh", "-c", command]);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to reload PM2 process ${nameOrId}: ${result.stderr}`
      );
    }

    this.logger?.debug(`Reloaded PM2 process ${nameOrId}`);
  }

  async list(): Promise<PM2ProcessInfo[]> {
    const result = await this.executor.exec(["pm2", "jlist"]);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to list PM2 processes: ${result.stderr}`);
    }

    try {
      const processes = JSON.parse(result.stdout) as PM2RawProcess[];

      return processes.map((p) => ({
        name: p.name,
        pm_id: p.pm_id,
        status: p.pm2_env.status,
        cpu: p.monit.cpu,
        memory: p.monit.memory,
        pid: p.pid,
        pm_uptime: p.pm2_env.pm_uptime,
        restart_time: p.pm2_env.restart_time,
      }));
    } catch (e) {
      throw new Error(`Failed to parse PM2 process list: ${e}`);
    }
  }

  async describe(nameOrId: string | number): Promise<PM2ProcessInfo> {
    const processes = await this.list();
    const process = processes.find((p) =>
      typeof nameOrId === "string" ? p.name === nameOrId : p.pm_id === nameOrId
    );

    if (!process) {
      throw new Error(`PM2 process ${nameOrId} not found`);
    }

    return process;
  }

  async logs(
    nameOrId?: string | number,
    lines = 50
  ): Promise<PM2Logs> {
    const parts = ["pm2", "logs"];
    if (nameOrId !== undefined) {
      parts.push(String(nameOrId));
    }
    parts.push("--nostream", "--lines", String(lines));

    const result = await this.executor.exec(parts);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to get PM2 logs: ${result.stderr}`);
    }

    // PM2 logs command outputs both stdout and stderr logs mixed
    // We'll return the full output as stdout for simplicity
    return {
      out: result.stdout,
      error: "",
    };
  }

  async monit(): Promise<string> {
    // PM2 monit is interactive, so we'll use list instead
    const processes = await this.list();

    // Format as a simple text table
    const lines = ["Name\t\tStatus\t\tCPU\tMemory"];
    for (const p of processes) {
      lines.push(
        `${p.name}\t\t${p.status}\t\t${p.cpu}%\t${Math.round(p.memory / 1024 / 1024)}MB`
      );
    }

    return lines.join("\n");
  }

  async startMany(apps: PM2Config[]): Promise<void> {
    for (const app of apps) {
      if (!app.script) {
        throw new Error(`Script is required for app ${app.name}`);
      }
      await this.start(app.script, app);
    }
  }

  async stopAll(): Promise<void> {
    const result = await this.executor.exec(["pm2", "stop", "all"]);

    if (result.exit_code !== 0 && !result.stderr.includes("No process found")) {
      throw new Error(`Failed to stop all PM2 processes: ${result.stderr}`);
    }

    this.logger?.debug("Stopped all PM2 processes");
  }

  async restartAll(): Promise<void> {
    const result = await this.executor.exec(["pm2", "restart", "all"]);

    if (result.exit_code !== 0 && !result.stderr.includes("No process found")) {
      throw new Error(`Failed to restart all PM2 processes: ${result.stderr}`);
    }

    this.logger?.debug("Restarted all PM2 processes");
  }

  async deleteAll(): Promise<void> {
    const result = await this.executor.exec(["pm2", "delete", "all"]);

    if (result.exit_code !== 0 && !result.stderr.includes("No process found")) {
      throw new Error(`Failed to delete all PM2 processes: ${result.stderr}`);
    }

    this.logger?.debug("Deleted all PM2 processes");
  }

  async save(): Promise<void> {
    const result = await this.executor.exec(["pm2", "save"]);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to save PM2 process list: ${result.stderr}`);
    }

    this.logger?.debug("Saved PM2 process list");
  }

  async resurrect(): Promise<void> {
    const result = await this.executor.exec(["pm2", "resurrect"]);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to resurrect PM2 processes: ${result.stderr}`);
    }

    this.logger?.debug("Resurrected PM2 processes");
  }

  async dump(): Promise<void> {
    const result = await this.executor.exec(["pm2", "dump"]);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to dump PM2 process list: ${result.stderr}`);
    }

    this.logger?.debug("Dumped PM2 process list");
  }

  async startup(platform?: string): Promise<string> {
    const parts = ["pm2", "startup"];
    if (platform) {
      parts.push(platform);
    }

    const result = await this.executor.exec(parts);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to generate PM2 startup script: ${result.stderr}`
      );
    }

    return result.stdout;
  }

  async unstartup(): Promise<void> {
    const result = await this.executor.exec(["pm2", "unstartup"]);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to remove PM2 startup script: ${result.stderr}`);
    }

    this.logger?.debug("Removed PM2 startup script");
  }

  createProcess(name: string): PM2ProcessBuilder {
    return new PM2ProcessBuilder(name);
  }
}