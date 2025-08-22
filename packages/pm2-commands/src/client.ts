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
  private readonly executor: CommandExecutor;
  private readonly logger?: Logger;

  constructor(executor: CommandExecutor, logger?: Logger) {
    this.executor = executor;
    this.logger = logger;
  }

  private buildPM2Command(
    action: string,
    target?: string | number,
    flags?: string[]
  ): string[] {
    const parts = ["pm2", action];
    if (target !== undefined) {
      parts.push(String(target));
    }
    if (flags && flags.length > 0) {
      parts.push(...flags);
    }
    return parts;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PM2 has many configuration options that need to be handled
  private buildPM2StartCommand(
    scriptOrCommand: string,
    config?: PM2Config
  ): string[] {
    const parts = ["pm2", "start"];

    // PM2 treats the first argument as the script/executable to run
    // If it's a file path, PM2 will execute it directly
    // If it's a command, PM2 will look for that executable in PATH
    parts.push(config?.script || scriptOrCommand);

    // Add configuration flags
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.name) parts.push("--name", config.name);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.interpreter) parts.push("--interpreter", config.interpreter);

    if (config?.interpreterArgs) {
      const args = Array.isArray(config.interpreterArgs)
        ? config.interpreterArgs.join(" ")
        : config.interpreterArgs;
      parts.push("--interpreter-args", args);
    }

    // Args for script files
    if (config?.args) {
      const args = Array.isArray(config.args) ? config.args : [config.args];
      parts.push("--", ...args);
    }
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.cwd) parts.push("--cwd", config.cwd);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.instances) parts.push("-i", String(config.instances));
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.execMode) parts.push("--exec-mode", config.execMode);
    if (config?.watch) {
      if (typeof config.watch === "boolean") {
        parts.push("--watch");
      } else {
        // Watch specific paths
        parts.push("--watch", config.watch.join(","));
      }
    }
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.ignoreWatch)
      parts.push("--ignore-watch", config.ignoreWatch.join(","));
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.maxMemoryRestart)
      parts.push("--max-memory-restart", config.maxMemoryRestart);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.autorestart === false) parts.push("--no-autorestart");
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.cronRestart) parts.push("--cron", config.cronRestart);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.minUptime) parts.push("--min-uptime", config.minUptime);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.maxRestarts !== undefined)
      parts.push("--max-restarts", String(config.maxRestarts));
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.killTimeout)
      parts.push("--kill-timeout", String(config.killTimeout));
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.waitReady) parts.push("--wait-ready");
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.mergeLog) parts.push("--merge-logs");
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.time) parts.push("--time");
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.logDateFormat)
      parts.push("--log-date-format", config.logDateFormat);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.out) parts.push("--output", config.out);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.error) parts.push("--error", config.error);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.log) parts.push("--log", config.log);
    // biome-ignore lint/style/useBlockStatements: Cleaner inline for simple flag additions
    if (config?.namespace) parts.push("--namespace", config.namespace);

    // Environment variables - handle specially
    if (config?.env) {
      // Create an env string for PM2
      const envPairs = Object.entries(config.env)
        .map(([key, value]) => `${key}=${value}`)
        .join(",");
      parts.push("--env", envPairs);
    }

    return parts;
  }

  async start(scriptOrCommand: string, config?: PM2Config): Promise<void> {
    const commandParts = this.buildPM2StartCommand(scriptOrCommand, config);

    this.logger?.debug("PM2 Start Command:", { command: commandParts });

    const result = await this.executor.exec(commandParts);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      this.logger?.error("PM2 start failed", {
        command: commandParts,
        stderr: result.stderr,
        stdout: result.stdout,
        exitCode: result.exit_code,
      });
      throw new Error(`Failed to start PM2 process: ${errorMsg}`);
    }

    this.logger?.debug("Started PM2 process", {
      name: config?.name ?? scriptOrCommand,
    });
  }

  async stop(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("stop", nameOrId);
    const result = await this.executor.exec(command);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      this.logger?.error("PM2 stop failed", {
        command,
        stderr: result.stderr,
        stdout: result.stdout,
        exitCode: result.exit_code,
      });
      throw new Error(`Failed to stop PM2 process ${nameOrId}: ${errorMsg}`);
    }

    this.logger?.debug(`Stopped PM2 process ${nameOrId}`);
  }

  async restart(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("restart", nameOrId);
    const result = await this.executor.exec(command);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      this.logger?.error("PM2 restart failed", {
        command,
        stderr: result.stderr,
        stdout: result.stdout,
        exitCode: result.exit_code,
      });
      throw new Error(`Failed to restart PM2 process ${nameOrId}: ${errorMsg}`);
    }

    this.logger?.debug(`Restarted PM2 process ${nameOrId}`);
  }

  async delete(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("delete", nameOrId);
    const result = await this.executor.exec(command);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      this.logger?.error("PM2 delete failed", {
        command,
        stderr: result.stderr,
        stdout: result.stdout,
        exitCode: result.exit_code,
      });
      throw new Error(`Failed to delete PM2 process ${nameOrId}: ${errorMsg}`);
    }

    this.logger?.debug(`Deleted PM2 process ${nameOrId}`);
  }

  async reload(nameOrId: string | number): Promise<void> {
    const command = this.buildPM2Command("reload", nameOrId);
    const result = await this.executor.exec(command);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to reload PM2 process ${nameOrId}: ${errorMsg}`);
    }

    this.logger?.debug(`Reloaded PM2 process ${nameOrId}`);
  }

  async list(): Promise<PM2ProcessInfo[]> {
    // Use jlist for JSON output
    const result = await this.executor.exec(["pm2", "jlist"]);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      this.logger?.error("PM2 list failed", {
        stderr: result.stderr,
        stdout: result.stdout,
        exitCode: result.exit_code,
      });
      throw new Error(`Failed to list PM2 processes: ${errorMsg}`);
    }

    try {
      // PM2 jlist returns JSON array
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
      this.logger?.error("Failed to parse PM2 process list", {
        error: e,
        stdout: result.stdout,
      });
      // If jlist doesn't work, return empty array
      return [];
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

  async logs(nameOrId?: string | number, lines = 50): Promise<PM2Logs> {
    const parts = ["pm2", "logs"];
    if (nameOrId !== undefined) {
      parts.push(String(nameOrId));
    }
    parts.push("--nostream", "--lines", String(lines));

    const result = await this.executor.exec(parts);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to get PM2 logs: ${errorMsg}`);
    }

    // PM2 logs outputs in a specific format with [process-name] prefixes
    // Parse the output to separate stdout and stderr
    const lines_array = result.stdout.split("\n");
    const outLines: string[] = [];
    const errLines: string[] = [];

    for (const line of lines_array) {
      // Skip PM2 header lines
      if (line.includes("[TAILING]") || line.includes("[STREAMING]")) {
        continue;
      }
      // Check if it's an error line (usually contains 'error' in the process name or log)
      if (line.includes("-error-") || line.includes("[ERROR]")) {
        errLines.push(line);
      } else if (line.trim()) {
        outLines.push(line);
      }
    }

    return {
      out: outLines,
      err: errLines,
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
      if (!(app.script || app.name)) {
        throw new Error("Script or name is required for app");
      }
      const scriptOrCommand = app.script || app.name || "";
      // biome-ignore lint/nursery/noAwaitInLoop: Sequential execution is intentional for PM2 commands
      await this.start(scriptOrCommand, app);
    }
  }

  async stopAll(): Promise<void> {
    const result = await this.executor.exec(["pm2", "stop", "all"]);

    if (result.exit_code !== 0 && !result.stderr.includes("No process found")) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to stop all PM2 processes: ${errorMsg}`);
    }

    this.logger?.debug("Stopped all PM2 processes");
  }

  async restartAll(): Promise<void> {
    const result = await this.executor.exec(["pm2", "restart", "all"]);

    if (result.exit_code !== 0 && !result.stderr.includes("No process found")) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to restart all PM2 processes: ${errorMsg}`);
    }

    this.logger?.debug("Restarted all PM2 processes");
  }

  async deleteAll(): Promise<void> {
    const result = await this.executor.exec(["pm2", "delete", "all"]);

    if (result.exit_code !== 0 && !result.stderr.includes("No process found")) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to delete all PM2 processes: ${errorMsg}`);
    }

    this.logger?.debug("Deleted all PM2 processes");
  }

  async save(): Promise<void> {
    const result = await this.executor.exec(["pm2", "save"]);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to save PM2 process list: ${errorMsg}`);
    }

    this.logger?.debug("Saved PM2 process list");
  }

  async resurrect(): Promise<void> {
    const result = await this.executor.exec(["pm2", "resurrect"]);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to resurrect PM2 processes: ${errorMsg}`);
    }

    this.logger?.debug("Resurrected PM2 processes");
  }

  async dump(): Promise<void> {
    const result = await this.executor.exec(["pm2", "dump"]);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to dump PM2 process list: ${errorMsg}`);
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
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to generate PM2 startup script: ${errorMsg}`);
    }

    return result.stdout;
  }

  async unstartup(): Promise<void> {
    const result = await this.executor.exec(["pm2", "unstartup"]);

    if (result.exit_code !== 0) {
      const errorMsg = result.stderr || result.stdout;
      throw new Error(`Failed to remove PM2 startup script: ${errorMsg}`);
    }

    this.logger?.debug("Removed PM2 startup script");
  }

  createProcess(name: string): PM2ProcessBuilder {
    return new PM2ProcessBuilder(name);
  }
}
