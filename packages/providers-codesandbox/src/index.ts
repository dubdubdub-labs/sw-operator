import type {
  CommandSpec,
  ExecAPI,
  ExecResult,
  FilesAPI,
  InstancesAPI,
  ProviderCapabilities,
  VMInstance,
  VMProvider,
} from "@repo/runtime-interfaces";
import { ProviderError } from "@repo/runtime-interfaces";
import { mapBootupToStatus } from "./status.js";

export type CodeSandboxProviderOptions = {
  apiKey: string;
  homeDir?: string;
};

function notImplemented<T>(op: string): Promise<T> {
  return Promise.reject(
    new ProviderError(
      "SERVER_ERROR",
      `CodeSandbox provider operation not implemented: ${op}`
    )
  );
}

export function createCodeSandboxProvider(
  opts: CodeSandboxProviderOptions
): VMProvider {
  const capabilities: ProviderCapabilities = {
    homeDir: opts.homeDir ?? "/project/workspace",
  };

  const instances: InstancesAPI = {
    boot(snapshotId: string): Promise<VMInstance> {
      return Promise.resolve({
        id: `csb-${snapshotId}`,
        status: mapBootupToStatus("FORK"),
      });
    },
    get(instanceId: string): Promise<VMInstance> {
      return Promise.resolve({ id: instanceId, status: "ready" });
    },
    list(): Promise<VMInstance[]> {
      return Promise.resolve([]);
    },
    stop(_instanceId: string): Promise<void> {
      return Promise.resolve();
    },
    terminate(_instanceId: string): Promise<void> {
      return Promise.resolve();
    },
    fork(instanceId: string): Promise<VMInstance> {
      return Promise.resolve({ id: `${instanceId}-fork`, status: "ready" });
    },
  };

  const files: FilesAPI = {
    readFile(_instanceId, _path, _enc) {
      return notImplemented("files.readFile");
    },
    writeFile(_instanceId, _path, _content, _opts) {
      return notImplemented("files.writeFile");
    },
    writeFileAtomic(_instanceId, _path, _content, _opts) {
      return notImplemented("files.writeFileAtomic");
    },
    fileExists(_instanceId, _path) {
      return notImplemented("files.fileExists");
    },
    createDirectory(_instanceId, _path, _opts) {
      return notImplemented("files.createDirectory");
    },
    deleteFile(_instanceId, _path) {
      return notImplemented("files.deleteFile");
    },
    deleteDirectory(_instanceId, _path, _opts) {
      return notImplemented("files.deleteDirectory");
    },
  };

  const exec: ExecAPI = (
    _instanceId,
    _spec: CommandSpec
  ): Promise<ExecResult> => {
    return notImplemented("exec.run");
  };

  return {
    name: "codesandbox",
    version: "0.0.1",
    capabilities,
    instances,
    files,
    exec,
  } satisfies VMProvider;
}

export { mapBootupToStatus } from "./status.js";
export default createCodeSandboxProvider;
