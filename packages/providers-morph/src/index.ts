import type { Logger } from "@repo/logger";
import type {
  ExecResult,
  VMInstance,
  VMProvider,
  VMProviderCapabilities,
} from "@repo/runtime-interfaces";

export type MorphProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  logger?: Logger;
  homeDir?: string;
};

export function createMorphProvider(opts: MorphProviderOptions): VMProvider {
  const capabilities: VMProviderCapabilities = {
    homeDir: opts.homeDir ?? "/root",
  };
  const notImpl = () =>
    Promise.reject(new Error("Morph provider not yet implemented"));
  const exec = (): Promise<ExecResult> =>
    Promise.reject(new Error("Morph exec not yet implemented"));
  const instances = {
    boot: (_snapshotId: string): Promise<VMInstance> =>
      Promise.reject(new Error("Morph instances.boot not yet implemented")),
    get: (_instanceId: string): Promise<VMInstance> =>
      Promise.reject(new Error("Morph instances.get not yet implemented")),
    list: () => Promise.resolve([] as VMInstance[]),
    stop: notImpl,
    terminate: notImpl,
    fork: (_instanceId: string): Promise<VMInstance> =>
      Promise.reject(new Error("Morph instances.fork not yet implemented")),
  };
  const files = {
    readFile: () => Promise.resolve(""),
    fileExists: () => Promise.resolve(false),
    writeFile: () =>
      Promise.reject(new Error("Morph files.writeFile not yet implemented")),
    writeFileAtomic: () =>
      Promise.reject(
        new Error("Morph files.writeFileAtomic not yet implemented")
      ),
    createDirectory: () =>
      Promise.reject(
        new Error("Morph files.createDirectory not yet implemented")
      ),
    deleteFile: () =>
      Promise.reject(new Error("Morph files.deleteFile not yet implemented")),
    deleteDirectory: () =>
      Promise.reject(
        new Error("Morph files.deleteDirectory not yet implemented")
      ),
  };

  return {
    name: "morph",
    version: "0.0.1",
    capabilities,
    instances,
    files,
    exec,
  };
}
