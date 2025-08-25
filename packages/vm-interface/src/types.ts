import type { PM2Config } from "@repo/pm2-commands";

// VM Provider Types
export interface VMInstance {
  id: string;
  status: "booting" | "ready" | "stopping" | "stopped" | "error";
  metadata?: Record<string, string>;
  created_at: string;
  ttl?: {
    seconds?: number;
    action?: "stop" | "terminate";
  };
}

export interface VMSnapshot {
  id: string;
  status: "creating" | "ready" | "deleting" | "error";
  created_at: string;
  metadata?: Record<string, string>;
}

export interface VMImage {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface ExecStreamChunk {
  type: "stdout" | "stderr" | "exit";
  data: string;
  exit_code?: number;
}

export interface BootOptions {
  ttl_seconds?: number;
  ttl_action?: "stop" | "terminate";
  metadata?: Record<string, string>;
}

export interface SnapshotOptions {
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}

// File operation types
export interface FileInfo {
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

// Process management types
export interface ProcessStartOptions extends PM2Config {
  // Additional VM-specific options if needed
}

export interface ProcessLogs {
  out: string;
  err: string;
}
