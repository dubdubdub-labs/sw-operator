// Request types from OpenAPI specification

import type { HttpServiceAuthMode, InstanceExpireAction } from "./models.js";

export interface BootInstanceFromImageRequest {
  vcpus?: number;
  memory?: number;
  disk_size?: number | null;
  metadata?: Record<string, string> | null;
  ttl_seconds?: number | null;
  ttl_action?: InstanceExpireAction | null;
}

export interface BootInstanceRequest {
  vcpus?: number | null;
  memory?: number | null;
  disk_size?: number | null;
  metadata?: Record<string, string> | null;
  ttl_seconds?: number | null;
  ttl_action?: InstanceExpireAction | null;
}

export interface BranchInstanceRequest {
  snapshot_metadata?: Record<string, string> | null;
  instance_metadata?: Record<string, string> | Record<string, string>[] | null;
}

export interface TimeoutCheck {
  type: "timeout";
  timeout?: number;
}

export interface CreateSnapshotRequest {
  image_id?: string | null;
  readiness_check?: TimeoutCheck | null;
  vcpus?: number;
  memory?: number;
  disk_size?: number;
  digest?: string | null;
  metadata?: Record<string, string> | null;
}

export interface ExecRequest {
  command: string[];
}

export interface ExposeHttpServiceRequest {
  name: string;
  port: number;
  auth_mode?: HttpServiceAuthMode | null;
}

export interface SnapshotInstanceRequest {
  metadata?: Record<string, string> | null;
}

export interface StartInstanceRequest {
  metadata?: Record<string, string> | null;
  ttl_seconds?: number | null;
  ttl_action?: InstanceExpireAction | null;
}

export interface UpdateSSHKeyRequest {
  public_key: string;
}

export interface UpdateTTLRequest {
  ttl_seconds?: number | null;
  ttl_action?: InstanceExpireAction | null;
}

export interface UpdateWakeRequest {
  wake_on_http?: boolean;
  wake_on_ssh?: boolean;
}
