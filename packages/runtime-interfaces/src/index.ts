export type Env = Record<string, string>;

export type CommandSpec =
  | {
      kind: "argv";
      command: string;
      args?: string[];
      cwd?: string;
      env?: Env;
      name?: string;
    }
  | {
      kind: "shell";
      script: string;
      cwd?: string;
      env?: Env;
      name?: string;
    };

export type RestartPolicy =
  | "never"
  | {
      maxRestarts?: number;
      minUptimeMs?: number;
    };

export type ProcessLogs = {
  out?: string;
  err?: string;
};

export type ProcessSpec = {
  command: CommandSpec;
  restart?: RestartPolicy;
  instances?: number;
  maxMemory?: string;
  logs?: ProcessLogs;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  exit_code: number;
};

export type VMInstanceStatus =
  | "booting"
  | "ready"
  | "stopping"
  | "stopped"
  | "error";

export type VMInstance = {
  id: string;
  status: VMInstanceStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ProviderCapabilities = {
  homeDir?: string;
};

export type InstancesAPI = {
  boot: (
    snapshotId: string,
    opts?: Record<string, unknown>
  ) => Promise<VMInstance>;
  get: (instanceId: string) => Promise<VMInstance>;
  list: () => Promise<VMInstance[]>;
  stop: (instanceId: string) => Promise<void>;
  terminate: (instanceId: string) => Promise<void>;
  fork: (instanceId: string) => Promise<VMInstance>;
};

export type FilesAPI = {
  readFile: (
    instanceId: string,
    path: string,
    encoding?: "utf8" | "base64"
  ) => Promise<string>;
  writeFile: (
    instanceId: string,
    path: string,
    content: string,
    opts?: { encoding?: "utf8" | "base64"; mode?: number }
  ) => Promise<void>;
  writeFileAtomic: (
    instanceId: string,
    path: string,
    content: string,
    opts?: { encoding?: "utf8" | "base64"; mode?: number; createDirs?: boolean }
  ) => Promise<void>;
  fileExists: (instanceId: string, path: string) => Promise<boolean>;
  createDirectory: (
    instanceId: string,
    path: string,
    opts?: { mode?: number; recursive?: boolean }
  ) => Promise<void>;
  deleteFile: (instanceId: string, path: string) => Promise<void>;
  deleteDirectory: (
    instanceId: string,
    path: string,
    opts?: { recursive?: boolean }
  ) => Promise<void>;
};

export type ExecAPI = (
  instanceId: string,
  spec: CommandSpec
) => Promise<ExecResult>;

export type Logger = {
  trace?: (msg: string, ctx?: Record<string, unknown>) => void;
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
  fatal?: (msg: string, ctx?: Record<string, unknown>) => void;
  child?: (opts: {
    name?: string;
    context?: Record<string, unknown>;
  }) => Logger;
};

export type VMProvider = {
  name: string;
  version: string;
  capabilities?: ProviderCapabilities;
  logger?: Logger;
  instances: InstancesAPI;
  files: FilesAPI;
  exec: ExecAPI;
};

export type ProcessInfo = {
  id?: string | number;
  name?: string;
  status?: "online" | "stopped" | "errored" | "unknown";
  pid?: number;
};

export type ProcessManager = {
  start: (
    instanceId: string,
    spec: ProcessSpec
  ) => Promise<{ name?: string; id?: string | number }>;
  stop: (instanceId: string, nameOrId: string | number) => Promise<void>;
  list: (instanceId: string) => Promise<ProcessInfo[]>;
  logs: (
    instanceId: string,
    params?: { nameOrId?: string | number; lines?: number }
  ) => Promise<{ out?: string; err?: string }>;
};

export type Agent<Input = unknown> = {
  name: string;
  toProcessSpec: (input: Input) => ProcessSpec;
};

export type CredentialFile = {
  path: string; // may be absolute or '~'-prefixed
  content: string; // utf8 text unless encoding says otherwise
  mode?: number; // e.g., 0o600
  encoding?: "utf8" | "base64";
};

export type CredentialProfile = {
  name: string;
  files: CredentialFile[];
  postInstall?: CommandSpec; // optional validation command
};

export type CredentialsInstaller = (
  provider: VMProvider,
  instanceId: string,
  profile: CredentialProfile
) => Promise<void>;

export type Orchestrator = {
  bootAndPrepare: (
    snapshotId: string,
    opts?: {
      ttl_seconds?: number;
      ttl_action?: "stop" | "terminate" | "hibernate";
      credentialProfiles?: CredentialProfile[];
      machineInfo?: Record<string, unknown>;
    }
  ) => Promise<{ instanceId: string; capabilities?: ProviderCapabilities }>;
  startSession: <Input>(
    instanceId: string,
    agent: Agent<Input>,
    input: Input,
    pm: ProcessManager
  ) => Promise<{ processName?: string }>;
  logs: (
    instanceId: string,
    pm: ProcessManager,
    params?: { nameOrId?: string | number; lines?: number }
  ) => Promise<{ out?: string; err?: string }>;
  listProcesses: (
    instanceId: string,
    pm: ProcessManager
  ) => Promise<ProcessInfo[]>;
};

export type ErrorCode =
  | "AUTHENTICATION_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PROCESS_ERROR"
  | "FILE_IO_ERROR"
  | "ORCHESTRATION_ERROR";

export class BaseRuntimeError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

export class ProviderError extends BaseRuntimeError {}
export class ProcessError extends BaseRuntimeError {}
export class AgentError extends BaseRuntimeError {}
export class CredentialsError extends BaseRuntimeError {}
export class OrchestrationError extends BaseRuntimeError {}
