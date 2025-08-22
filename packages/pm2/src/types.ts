export interface PM2Config {
  name?: string;
  script?: string;
  args?: string | string[];
  interpreter?: string;
  interpreterArgs?: string | string[];
  cwd?: string;
  env?: Record<string, string>;
  instances?: number;
  execMode?: "fork" | "cluster";
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

export interface PM2ProcessInfo {
  name: string;
  pm_id: number;
  status: "online" | "stopping" | "stopped" | "launching" | "errored";
  cpu: number;
  memory: number;
  pid?: number;
  pm_uptime?: number;
  restart_time?: number;
}

export interface PM2RawProcess {
  name: string;
  pm_id: number;
  pm2_env: {
    status: PM2ProcessInfo["status"];
    pm_uptime?: number;
    restart_time?: number;
  };
  monit: {
    cpu: number;
    memory: number;
  };
  pid?: number;
}

export interface PM2Logs {
  out: string;
  error: string;
}

export interface CommandExecutor {
  exec(command: string[]): Promise<{
    stdout: string;
    stderr: string;
    exit_code: number;
  }>;
}