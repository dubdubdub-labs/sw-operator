import { z } from "zod";

// Enum schemas
export const InstanceStatusSchema = z.enum([
  "pending",
  "ready",
  "paused",
  "saving",
  "error",
]);
export const InstanceExpireActionSchema = z.enum(["stop", "pause"]);
export const SnapshotStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
  "deleting",
  "deleted",
]);
export const HttpServiceAuthModeSchema = z.enum(["none", "api_key"]);

// Request validation schemas
export const BootOptionsSchema = z.object({
  vcpus: z.number().min(1).max(32).optional(),
  memory: z.number().min(128).max(65_536).optional(),
  disk_size: z.number().min(100).optional().nullable(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
  ttl_seconds: z.number().min(60).optional().nullable(),
  ttl_action: InstanceExpireActionSchema.optional().nullable(),
});

export const CreateSnapshotOptionsSchema = z.object({
  image_id: z.string().nullable().optional().default("morphvm-minimal"),
  readiness_check: z
    .object({
      type: z.literal("timeout"),
      timeout: z.number().default(10.0),
    })
    .optional()
    .nullable(),
  vcpus: z.number().min(1).max(32).default(1),
  memory: z.number().min(128).max(65_536).default(128),
  disk_size: z.number().min(100).default(700),
  digest: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).optional().nullable(),
});

export const ExecCommandSchema = z.object({
  command: z.array(z.string()).min(1),
});

export const ExposeHttpServiceSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9]([a-z0-9-_]*[a-z0-9])?$/),
  port: z.number().min(1).max(65_535),
  auth_mode: HttpServiceAuthModeSchema.nullable().optional().default("none"),
});

export const UpdateTTLSchema = z.object({
  ttl_seconds: z.number().min(60).optional().nullable(),
  ttl_action: InstanceExpireActionSchema.optional().nullable(),
});

export const UpdateWakeSchema = z.object({
  wake_on_http: z.boolean().default(false),
  wake_on_ssh: z.boolean().default(false),
});

// Response validation schemas
export const ResourceSpecSchema = z.object({
  vcpus: z.number(),
  memory: z.number(),
  disk_size: z.number(),
});

export const InstanceRefsSchema = z.object({
  snapshot_id: z.string(),
  image_id: z.string(),
});

export const InstanceHttpServiceSchema = z.object({
  name: z.string(),
  port: z.number(),
  url: z.string(),
  auth_mode: HttpServiceAuthModeSchema,
});

export const InstanceNetworkingSchema = z.object({
  internal_ip: z.string().nullable().optional(),
  http_services: z.array(InstanceHttpServiceSchema).optional(),
});

export const InstanceTTLSchema = z.object({
  ttl_seconds: z.number().nullable().optional(),
  ttl_expire_at: z.number().nullable().optional(),
  ttl_action: InstanceExpireActionSchema,
});

export const InstanceWakeOnSchema = z.object({
  wake_on_ssh: z.boolean().optional(),
  wake_on_http: z.boolean().optional(),
});

export const InstanceSchema = z.object({
  id: z.string(),
  object: z.literal("instance"),
  created: z.number(),
  status: InstanceStatusSchema,
  spec: ResourceSpecSchema,
  refs: InstanceRefsSchema,
  networking: InstanceNetworkingSchema,
  metadata: z.record(z.string(), z.string()).optional(),
  ttl: InstanceTTLSchema,
  wake_on: InstanceWakeOnSchema,
});

export const SnapshotRefsSchema = z.object({
  image_id: z.string(),
});

export const SnapshotSchema = z.object({
  id: z.string(),
  object: z.literal("snapshot"),
  created: z.number(),
  status: SnapshotStatusSchema,
  spec: ResourceSpecSchema,
  refs: SnapshotRefsSchema,
  digest: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const ImageSchema = z.object({
  id: z.string(),
  object: z.literal("image"),
  created: z.number(),
  name: z.string(),
  description: z.string().optional().nullable(),
  disk_size: z.number(),
});

export const ExecResponseSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exit_code: z.number(),
});

export const InstanceSshKeySchema = z.object({
  object: z.literal("instance_ssh_key"),
  private_key: z.string(),
  public_key: z.string(),
  password: z.string(),
});

export const CreateSnapshotTokenResponseSchema = z.object({
  token: z.string(),
  expires_in: z.number(),
});

export const BranchInstanceResponseSchema = z.object({
  snapshot: SnapshotSchema,
  instances: z.array(InstanceSchema),
});
