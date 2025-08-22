import type { Logger } from "@repo/logger";
import type { InstanceService } from "../services/instance.service.js";

export class FileUtility {
  private readonly instanceService: InstanceService;
  private readonly logger: Logger;

  constructor(instanceService: InstanceService, logger: Logger) {
    this.instanceService = instanceService;
    this.logger = logger;
  }

  /**
   * Write file - using Python for reliable special character handling
   */
  async writeFile(
    instanceId: string,
    path: string,
    content: string
  ): Promise<void> {
    // Use Python with base64 encoding to handle all special characters
    const base64Content = Buffer.from(content).toString("base64");

    // Python command that decodes base64 and writes to file
    const pythonCode = `
import base64
content = base64.b64decode('${base64Content}')
with open('${path}', 'wb') as f:
    f.write(content)
`;

    const command = ["python3", "-c", pythonCode.trim()];

    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      // Fallback to simpler approach with heredoc
      const delimiter = this.generateUniqueDelimiter(content);
      const fallbackCommand = [
        "sh",
        "-c",
        `cat > '${path}' << '${delimiter}'\n${content}\n${delimiter}`,
      ];

      const fallbackResult = await this.instanceService.exec(
        instanceId,
        fallbackCommand
      );

      if (fallbackResult.exit_code !== 0) {
        throw new Error(
          `Failed to write file ${path}: ${fallbackResult.stderr || result.stderr}`
        );
      }
    }

    this.logger.debug(`Wrote file ${path} on instance ${instanceId}`, {
      contentLength: content.length,
    });
  }

  /**
   * Generate a unique delimiter that doesn't appear in the content
   */
  private generateUniqueDelimiter(content: string): string {
    const base = "MORPHEOF";
    let delimiter = base;
    let counter = 0;

    // Keep trying until we find a delimiter that doesn't exist in content
    while (content.includes(delimiter)) {
      counter++;
      delimiter = `${base}_${counter}_${Date.now()}`;
    }

    return delimiter;
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
    // Use Python with base64 encoding for reliable append
    const base64Content = Buffer.from(content).toString("base64");

    const pythonCode = `
import base64
content = base64.b64decode('${base64Content}')
with open('${path}', 'ab') as f:
    f.write(content)
`;

    const command = ["python3", "-c", pythonCode.trim()];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      // Fallback to heredoc
      const delimiter = this.generateUniqueDelimiter(content);
      const fallbackCommand = [
        "sh",
        "-c",
        `cat >> '${path}' << '${delimiter}'\n${content}\n${delimiter}`,
      ];

      const fallbackResult = await this.instanceService.exec(
        instanceId,
        fallbackCommand
      );

      if (fallbackResult.exit_code !== 0) {
        throw new Error(
          `Failed to append to file ${path}: ${fallbackResult.stderr || result.stderr}`
        );
      }
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

  moveFile(
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

  /**
   * Write binary file - using Python for reliable binary handling
   */
  async writeBinaryFile(
    instanceId: string,
    path: string,
    buffer: Buffer
  ): Promise<void> {
    // Use Python with base64 for binary files
    const base64Content = buffer.toString("base64");

    const pythonCode = `
import base64
content = base64.b64decode('${base64Content}')
with open('${path}', 'wb') as f:
    f.write(content)
`;

    const command = ["python3", "-c", pythonCode.trim()];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      // Fallback to xxd if Python fails
      const hexContent = buffer.toString("hex");
      const fallbackCommand = [
        "sh",
        "-c",
        `echo '${hexContent}' | xxd -r -p > '${path}'`,
      ];

      const fallbackResult = await this.instanceService.exec(
        instanceId,
        fallbackCommand
      );

      if (fallbackResult.exit_code !== 0) {
        throw new Error(
          `Failed to write binary file ${path}: ${fallbackResult.stderr || result.stderr}`
        );
      }
    }

    this.logger.debug(`Wrote binary file ${path} on instance ${instanceId}`, {
      size: buffer.length,
    });
  }

  /**
   * Read binary file
   */
  async readBinaryFile(instanceId: string, path: string): Promise<Buffer> {
    // Use xxd to convert file to hex
    const command = ["xxd", "-p", path];
    const result = await this.instanceService.exec(instanceId, command);

    if (result.exit_code !== 0) {
      // Fallback to od (octal dump) with hex output
      const fallbackCommand = ["od", "-An", "-tx1", path];
      const fallbackResult = await this.instanceService.exec(
        instanceId,
        fallbackCommand
      );

      if (fallbackResult.exit_code !== 0) {
        throw new Error(
          `Failed to read binary file ${path}: ${fallbackResult.stderr || result.stderr}`
        );
      }

      // od output has spaces, remove them
      const hex = fallbackResult.stdout.replace(/\s/g, "");
      return Buffer.from(hex, "hex");
    }

    // Remove any whitespace and decode
    const hex = result.stdout.replace(/\s/g, "");
    return Buffer.from(hex, "hex");
  }
}
