import type { Logger } from "@repo/logger";
import type { InstanceService } from "../services/instance.service.js";

export class FileUtility {
  constructor(
    private readonly instanceService: InstanceService,
    private readonly logger: Logger
  ) {}

  async writeFile(
    instanceId: string,
    path: string,
    content: string
  ): Promise<void> {
    const escapedContent = content.replace(/'/g, "'\\''");
    const command = [
      "sh",
      "-c",
      `cat > '${path}' << 'EOF'\n${escapedContent}\nEOF`,
    ];

    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to write file ${path}: ${result.stderr}`);
    }

    this.logger.debug(`Wrote file ${path} on instance ${instanceId}`);
  }

  async readFile(instanceId: string, path: string): Promise<string> {
    const command = ["cat", path];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to read file ${path}: ${result.stderr}`);
    }

    return result.stdout;
  }

  async appendFile(
    instanceId: string,
    path: string,
    content: string
  ): Promise<void> {
    const escapedContent = content.replace(/'/g, "'\\''");
    const command = [
      "sh",
      "-c",
      `cat >> '${path}' << 'EOF'\n${escapedContent}\nEOF`,
    ];

    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to append to file ${path}: ${result.stderr}`);
    }

    this.logger.debug(`Appended to file ${path} on instance ${instanceId}`);
  }

  async deleteFile(instanceId: string, path: string): Promise<void> {
    const command = ["rm", "-f", path];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to delete file ${path}: ${result.stderr}`);
    }

    this.logger.debug(`Deleted file ${path} on instance ${instanceId}`);
  }

  async renameFile(
    instanceId: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    const command = ["mv", oldPath, newPath];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to rename file from ${oldPath} to ${newPath}: ${result.stderr}`
      );
    }

    this.logger.debug(
      `Renamed file from ${oldPath} to ${newPath} on instance ${instanceId}`
    );
  }

  async moveFile(
    instanceId: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    return this.renameFile(instanceId, oldPath, newPath);
  }

  async copyFile(
    instanceId: string,
    source: string,
    dest: string
  ): Promise<void> {
    const command = ["cp", source, dest];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(
        `Failed to copy file from ${source} to ${dest}: ${result.stderr}`
      );
    }

    this.logger.debug(
      `Copied file from ${source} to ${dest} on instance ${instanceId}`
    );
  }

  async createDirectory(
    instanceId: string,
    path: string,
    recursive = false
  ): Promise<void> {
    const command = recursive ? ["mkdir", "-p", path] : ["mkdir", path];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to create directory ${path}: ${result.stderr}`);
    }

    this.logger.debug(`Created directory ${path} on instance ${instanceId}`);
  }

  async listDirectory(instanceId: string, path: string): Promise<string[]> {
    const command = ["ls", "-1a", path];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to list directory ${path}: ${result.stderr}`);
    }

    return result.stdout
      .split("\n")
      .filter((line) => line.trim() && line !== "." && line !== "..")
      .map((line) => line.trim());
  }

  async deleteDirectory(instanceId: string, path: string): Promise<void> {
    const command = ["rm", "-rf", path];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      throw new Error(`Failed to delete directory ${path}: ${result.stderr}`);
    }

    this.logger.debug(`Deleted directory ${path} on instance ${instanceId}`);
  }

  async fileExists(instanceId: string, path: string): Promise<boolean> {
    const command = ["test", "-f", path];
    const result = await this.instanceService.exec(instanceId, command);
    return result.exit_code === 0;
  }

  async isDirectory(instanceId: string, path: string): Promise<boolean> {
    const command = ["test", "-d", path];
    const result = await this.instanceService.exec(instanceId, command);
    return result.exit_code === 0;
  }
}
