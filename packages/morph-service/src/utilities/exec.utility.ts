import type { Logger } from "@repo/logger";
import type { InstanceService } from "../services/instance.service.js";
import type { ExecResponse } from "../types/models.js";

/**
 * ExecUtility - Helper methods for command execution on MorphVM instances
 *
 * Provides wrapped methods that handle common pitfalls with the exec interface:
 * - Shell pipes don't work reliably (data loss)
 * - Complex shell syntax needs careful escaping
 * - Python commands need proper quoting
 * - Multi-line scripts work better as files
 */
export class ExecUtility {
  private readonly instanceService: InstanceService;
  private readonly logger: Logger;

  constructor(instanceService: InstanceService, logger: Logger) {
    this.instanceService = instanceService;
    this.logger = logger;
  }

  /**
   * Execute a simple command with automatic retries
   */
  async execWithRetry(
    instanceId: string,
    command: string[],
    maxRetries = 3
  ): Promise<ExecResponse> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        /* biome-ignore lint/nursery/noAwaitInLoop: sequential retries are required */
        const result = await this.instanceService.exec(instanceId, command);

        // If command succeeded, return immediately
        if (result.exit_code === 0) {
          return result;
        }

        // If it's a command error (not network), don't retry
        if (result.stderr && !result.stderr.includes("timeout")) {
          return result;
        }

        lastError = new Error(
          `Command failed with exit code ${result.exit_code}`
        );
      } catch (error) {
        lastError = error as Error;
        this.logger.debug(`Exec retry ${i + 1}/${maxRetries} failed`, {
          error,
        });

        // Wait before retry with exponential backoff
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2 ** i * 1000));
        }
      }
    }

    throw lastError || new Error("Exec failed after retries");
  }

  /**
   * Execute a Python script reliably
   * Handles proper quoting and escaping
   */
  async execPython(
    instanceId: string,
    pythonCode: string,
    pythonPath = "python3"
  ): Promise<ExecResponse> {
    // For complex Python scripts, write to a temp file first
    if (
      pythonCode.includes('"') ||
      pythonCode.includes("'") ||
      pythonCode.length > 500
    ) {
      const tempScript = `/tmp/morph_script_${Date.now()}.py`;

      // Write script to file using base64 to avoid escaping issues
      const base64Script = Buffer.from(pythonCode).toString("base64");
      const writeCommand = [
        pythonPath,
        "-c",
        `import base64; open('${tempScript}', 'wb').write(base64.b64decode('${base64Script}'))`,
      ];

      const writeResult = await this.instanceService.exec(
        instanceId,
        writeCommand
      );
      if (writeResult.exit_code !== 0) {
        throw new Error(`Failed to write Python script: ${writeResult.stderr}`);
      }

      // Execute the script
      const execResult = await this.instanceService.exec(instanceId, [
        pythonPath,
        tempScript,
      ]);

      // Clean up
      await this.instanceService.exec(instanceId, ["rm", "-f", tempScript]);

      return execResult;
    }

    // For simple scripts, execute directly
    return this.instanceService.exec(instanceId, [
      pythonPath,
      "-c",
      pythonCode,
    ]);
  }

  /**
   * Execute a shell script reliably
   * Note: Avoid pipes - they lose data through the exec interface
   */
  async execShell(
    instanceId: string,
    script: string,
    shell = "bash"
  ): Promise<ExecResponse> {
    // For complex scripts, write to file
    if (
      script.includes("|") ||
      script.includes(">") ||
      script.includes("<") ||
      script.length > 500
    ) {
      this.logger.warn(
        "Complex shell script detected. Pipes may lose data. Consider breaking into separate commands."
      );

      const tempScript = `/tmp/morph_script_${Date.now()}.sh`;

      // Write script using heredoc
      const delimiter = `EOF_${Date.now()}`;
      const writeCommand = [
        "sh",
        "-c",
        `cat > '${tempScript}' << '${delimiter}'\n${script}\n${delimiter}`,
      ];

      const writeResult = await this.instanceService.exec(
        instanceId,
        writeCommand
      );
      if (writeResult.exit_code !== 0) {
        throw new Error(`Failed to write shell script: ${writeResult.stderr}`);
      }

      // Execute the script
      const execResult = await this.instanceService.exec(instanceId, [
        shell,
        tempScript,
      ]);

      // Clean up
      await this.instanceService.exec(instanceId, ["rm", "-f", tempScript]);

      return execResult;
    }

    // For simple commands, execute directly
    return this.instanceService.exec(instanceId, [shell, "-c", script]);
  }

  /**
   * Execute command and parse JSON output
   */
  async execJson<T = unknown>(
    instanceId: string,
    command: string[]
  ): Promise<T> {
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Command failed: ${result.stderr || result.stdout}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch (_error) {
      throw new Error(`Failed to parse JSON output: ${result.stdout}`);
    }
  }

  /**
   * Execute multiple commands in sequence
   * Better than pipes for reliability
   */
  async execSequence(
    instanceId: string,
    commands: string[][]
  ): Promise<ExecResponse[]> {
    const results: ExecResponse[] = [];

    for (const command of commands) {
      /* biome-ignore lint/nursery/noAwaitInLoop: commands must run sequentially */
      const result = await this.instanceService.exec(instanceId, command);
      results.push(result);

      // Stop on first error
      if (result.exit_code !== 0) {
        this.logger.error("Command sequence failed", {
          failedCommand: command,
          stderr: result.stderr,
          exitCode: result.exit_code,
        });
        break;
      }
    }

    return results;
  }

  /**
   * Check if a command exists on the instance
   */
  async commandExists(instanceId: string, command: string): Promise<boolean> {
    const result = await this.instanceService.exec(instanceId, [
      "which",
      command,
    ]);
    return result.exit_code === 0;
  }

  /**
   * Install a package if it doesn't exist
   */
  async ensurePackage(
    instanceId: string,
    packageName: string,
    installCommand?: string[]
  ): Promise<void> {
    // Check if package command exists
    const checkCommand = packageName.includes("/")
      ? ["test", "-f", packageName]
      : ["which", packageName];
    const exists = await this.instanceService.exec(instanceId, checkCommand);

    if (exists.exit_code === 0) {
      this.logger.debug(`Package ${packageName} already exists`);
      return;
    }

    // Install the package
    const defaultInstall = ["apt-get", "install", "-y", packageName];
    const install = installCommand || defaultInstall;

    this.logger.info(`Installing package ${packageName}...`);
    const result = await this.instanceService.exec(instanceId, install);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to install ${packageName}: ${result.stderr}`);
    }
  }
}
