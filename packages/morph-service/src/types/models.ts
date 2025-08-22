// Generated types from OpenAPI specification

export interface ImageModel {
  id: string;
  object: "image";
  created: number;
  name: string;
  description?: string | null;
  disk_size: number;
}

export interface ImageModelCollection {
  object: "list";
  data: ImageModel[];
}

export type InstanceStatus =
  | "pending"
  | "ready"
  | "paused"
  | "saving"
  | "error";

export type InstanceExpireAction = "stop" | "pause";

export type SnapshotStatus =
  | "pending"
  | "ready"
  | "failed"
  | "deleting"
  | "deleted";

export type HttpServiceAuthMode = "none" | "api_key";

export interface ResourceSpec {
  vcpus: number;
  memory: number;
  disk_size: number;
}

export interface InstanceRefs {
  snapshot_id: string;
  image_id: string;
}

export interface InstanceHttpService {
  name: string;
  port: number;
  url: string;
  auth_mode: HttpServiceAuthMode;
}

export interface InstanceNetworking {
  internal_ip?: string | null;
  http_services?: InstanceHttpService[];
}

export interface InstanceTTL {
  ttl_seconds?: number | null;
  ttl_expire_at?: number | null;
  ttl_action: InstanceExpireAction;
}

export interface InstanceWakeOn {
  wake_on_ssh?: boolean;
  wake_on_http?: boolean;
}

export interface InstanceModel {
  id: string;
  object: "instance";
  created: number;
  status: InstanceStatus;
  spec: ResourceSpec;
  refs: InstanceRefs;
  networking: InstanceNetworking;
  metadata?: Record<string, string>;
  ttl: InstanceTTL;
  wake_on: InstanceWakeOn;
}

export interface InstanceModelCollection {
  object: "list";
  data: InstanceModel[];
}

export interface SnapshotRefs {
  image_id: string;
}

export interface SnapshotModel {
  id: string;
  object: "snapshot";
  created: number;
  status: SnapshotStatus;
  spec: ResourceSpec;
  refs: SnapshotRefs;
  digest?: string | null;
  metadata?: Record<string, string>;
}

export interface SnapshotModelCollection {
  object: "list";
  data: SnapshotModel[];
}

export interface InstanceSshKey {
  object: "instance_ssh_key";
  private_key: string;
  public_key: string;
  password: string;
}

export interface APIKeyModel {
  id: string;
  key_prefix: string;
  created: number;
  last_used?: number | null;
}

export interface APIKeyModelCollection {
  object: "list";
  data: APIKeyModel[];
}

export interface CreateAPIKeyResponse {
  id: string;
  key: string;
  key_prefix: string;
  created: number;
}

export interface UserSSHKeyModel {
  public_key: string;
  created: number;
}

export interface UserInstanceUsageModel {
  instance_cpu_time: number;
  instance_memory_time: number;
  instance_disk_time: number;
  period_start: number;
  period_end: number;
}

export interface UserSnapshotUsageModel {
  snapshot_memory_time: number;
  snapshot_disk_time: number;
  period_start: number;
  period_end: number;
}

export interface UserUsageOverviewModel {
  instance: UserInstanceUsageModel[];
  snapshot: UserSnapshotUsageModel[];
  items: string[];
}

export interface ExecResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface CreateSnapshotTokenResponse {
  token: string;
  expires_in: number;
}

export interface BranchInstanceResponse {
  snapshot: SnapshotModel;
  instances: InstanceModel[];
}
