import type { PM2Config } from "./types.js";

export class PM2ProcessBuilder {
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

  build(): PM2Config {
    return { ...this.config };
  }
}