import type {
  CommandSpec,
  ExecRunner,
  ProcessLogsResult,
  ProcessManager,
  ProcessSpec,
} from "@repo/runtime-interfaces";

function toShellPayload(spec: CommandSpec): { script: string } {
  if (spec.kind === "shell") {
    return { script: spec.script };
  }
  const args = spec.args?.map((a) => JSON.stringify(a)) ?? [];
  const cmd = [spec.command, ...args].join(" ");
  return { script: cmd };
}

export function ShellProcessManager(execRunner: ExecRunner): ProcessManager {
  return {
    async start(instanceId: string, spec: ProcessSpec) {
      const { script } = toShellPayload(spec.command);
      const env = spec.command.env ?? {};
      const cwd = spec.command.cwd;
      const wrapped: CommandSpec = {
        kind: "shell",
        name: spec.command.name,
        cwd,
        env,
        script,
      };
      const result = await execRunner(instanceId, wrapped);
      if (result.exit_code !== 0) {
        throw new Error(`Shell start failed (exit ${result.exit_code})`);
      }
      return { name: spec.command.name };
    },
    async stop() {
      // no-op for simple shell runner
    },
    list() {
      return Promise.resolve([]);
    },
    logs(): Promise<ProcessLogsResult> {
      return Promise.resolve({ out: "", err: "" });
    },
  };
}
