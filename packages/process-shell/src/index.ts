import type {
  CommandSpec,
  ExecAPI,
  ProcessInfo,
  ProcessManager,
} from "@repo/runtime-interfaces";
import { ProcessError } from "@repo/runtime-interfaces";

function commandName(spec: CommandSpec): string | undefined {
  return spec.name;
}

export function ShellProcessManager(execRunner: ExecAPI): ProcessManager {
  return {
    async start(instanceId, spec) {
      const result = await execRunner(instanceId, spec.command);
      if (result.exit_code !== 0) {
        throw new ProcessError("PROCESS_ERROR", "Shell process failed", {
          instanceId,
          exit_code: result.exit_code,
          stderr_len: result.stderr.length,
        });
      }
      return { name: commandName(spec.command) };
    },
    stop(_instanceId, _nameOrId) {
      // no-op for shell runner
      return Promise.resolve();
    },
    list(_instanceId) {
      const list: ProcessInfo[] = [];
      return Promise.resolve(list);
    },
    logs(_instanceId) {
      return Promise.resolve({ out: undefined, err: undefined });
    },
  } satisfies ProcessManager;
}

export default ShellProcessManager;
