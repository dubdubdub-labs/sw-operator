// Types and interfaces shared across packages

// Command specifications
export type ArgvCommand = {
  kind: "argv";
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  name?: string;
};

export type ShellCommand = {
  kind: "shell";
  script: string;
  cwd?: string;
  env?: Record<string, string>;
  name?: string;
};

export type CommandSpec = ArgvCommand | ShellCommand;

// Process specification for managers (PM2/shell)
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

// Exec and provider contracts
export type ExecResult = {
  stdout: string;
  stderr: string;
  exit_code: number;
};

export type ExecRunner = (
  instanceId: string,
  spec: CommandSpec
) => Promise<ExecResult>;

export type VMStatus = "booting" | "ready" | "stopping" | "stopped" | "error";

export type VMInstance = {
  id: string;
  status: VMStatus;
  name?: string;
  metadata?: Record<string, string>;
};

export type VMProviderCapabilities = {
  homeDir?: string;
};

export type VMProviderInstances = {
  boot: (
    snapshotId: string,
    opts?: {
      ttl_seconds?: number;
      ttl_action?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ) => Promise<VMInstance>;
  get: (instanceId: string) => Promise<VMInstance>;
  list: (filters?: Record<string, string>) => Promise<VMInstance[]>;
  stop: (instanceId: string) => Promise<void>;
  terminate: (instanceId: string) => Promise<void>;
  fork: (instanceId: string, opts?: { name?: string }) => Promise<VMInstance>;
};

export type VMProviderFiles = {
  readFile: (instanceId: string, path: string) => Promise<string>;
  fileExists: (instanceId: string, path: string) => Promise<boolean>;
  writeFile: (
    instanceId: string,
    path: string,
    content: string | Uint8Array,
    opts?: {
      mode?: string;
      owner?: string;
      group?: string;
      createDirs?: boolean;
    }
  ) => Promise<void>;
  writeFileAtomic: (
    instanceId: string,
    path: string,
    content: string | Uint8Array,
    opts?: {
      mode?: string;
      owner?: string;
      group?: string;
      createDirs?: boolean;
    }
  ) => Promise<void>;
  createDirectory: (
    instanceId: string,
    path: string,
    opts?: { mode?: string; parents?: boolean }
  ) => Promise<void>;
  deleteFile: (instanceId: string, path: string) => Promise<void>;
  deleteDirectory: (
    instanceId: string,
    path: string,
    opts?: { recursive?: boolean }
  ) => Promise<void>;
};

export type VMProvider = {
  name: string;
  version: string;
  capabilities?: VMProviderCapabilities;
  instances: VMProviderInstances;
  files: VMProviderFiles;
  exec: ExecRunner;
};

// Process manager contract
export type ProcessInfo = {
  id?: number;
  name?: string;
  status?: "online" | "stopped" | "errored" | string;
  pid?: number;
  memory?: number;
  cpu?: number;
};

export type ProcessLogsResult = { out: string; err: string };

export type ProcessManager = {
  start: (
    instanceId: string,
    spec: ProcessSpec
  ) => Promise<{ name?: string; id?: number }>;
  stop: (instanceId: string, nameOrId: string | number) => Promise<void>;
  list: (instanceId: string) => Promise<ProcessInfo[]>;
  logs: (
    instanceId: string,
    name?: string,
    lines?: number
  ) => Promise<ProcessLogsResult>;
};

// Agent
export type AgentInput = {
  sessionName?: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  cwd?: string; // allow '~' expansion by provider
  env?: Record<string, string>;
};

export type Agent = {
  name: string;
  toProcessSpec: (input: AgentInput) => ProcessSpec;
};

// Credentials
export type CredentialFile = {
  path: string; // may be '~' prefixed
  content: string | Uint8Array | Record<string, unknown>;
  mode?: string; // e.g., '600'
};

export type CredentialProfile = {
  name: string;
  files: CredentialFile[];
  postInstall?: CommandSpec | CommandSpec[];
};

export type CredentialsInstaller = {
  install: (
    provider: VMProvider,
    instanceId: string,
    profile: CredentialProfile
  ) => Promise<void>;
};

// Orchestrator
export type Orchestrator = {
  bootAndPrepare: (
    snapshotId: string,
    opts?: {
      ttl_seconds?: number;
      ttl_action?: string;
      credentialProfiles?: CredentialProfile[];
      machineInfo?: Record<string, unknown>;
    }
  ) => Promise<{ instanceId: string; capabilities?: VMProviderCapabilities }>;
  startSession: (
    instanceId: string,
    input: AgentInput
  ) => Promise<{ processName?: string }>;
  logs: (
    instanceId: string,
    name?: string,
    lines?: number
  ) => Promise<ProcessLogsResult>;
  listProcesses: (instanceId: string) => Promise<ProcessInfo[]>;
};

// Error classes
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

export class BaseError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    details?: Record<string, unknown>,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

export class ProviderError extends BaseError {}
export class ProcessError extends BaseError {}
export class AgentError extends BaseError {}
export class CredentialsError extends BaseError {}
export class OrchestrationError extends BaseError {}
