import type {
  CommandSpec,
  ExecRunner,
  ProcessInfo,
  ProcessLogsResult,
  ProcessManager,
  ProcessSpec,
} from "@repo/runtime-interfaces";

function toPayload(spec: CommandSpec): string {
  const cd = spec.cwd ? `cd ${spec.cwd} && ` : "";
  const env = spec.env
    ? `${Object.entries(spec.env)
        .map(([k, v]) => `export ${k}=${JSON.stringify(v)}`)
        .join(" && ")} && `
    : "";
  if (spec.kind === "shell") {
    return `${cd}${env}${spec.script}`;
  }
  const args = spec.args?.map((a) => JSON.stringify(a)).join(" ") ?? "";
  return `${cd}${env}${spec.command}${args ? ` ${args}` : ""}`;
}

function sanitizeName(name?: string): string | undefined {
  if (!name) {
    return;
  }
  return name.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 50);
}

export function PM2ProcessManager(execRunner: ExecRunner): ProcessManager {
  return {
    async start(instanceId: string, spec: ProcessSpec) {
      const payload = toPayload(spec.command);
      const pm2Args = [
        "start",
        "bash",
        ...(sanitizeName(spec.command.name)
          ? ["--name", sanitizeName(spec.command.name) as string]
          : []),
        "--no-autorestart",
        "--",
        "-lc",
        payload,
      ];
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args: pm2Args,
      });
      if (res.exit_code !== 0) {
        throw new Error(`PM2 start failed (exit ${res.exit_code})`);
      }
      return { name: sanitizeName(spec.command.name) };
    },
    async stop(instanceId: string, nameOrId: string | number) {
      const idArg = typeof nameOrId === "number" ? String(nameOrId) : nameOrId;
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args: ["stop", idArg],
      });
      if (res.exit_code !== 0) {
        throw new Error(`PM2 stop failed (exit ${res.exit_code})`);
      }
    },
    async list(instanceId: string): Promise<ProcessInfo[]> {
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args: ["jlist"],
      });
      if (res.exit_code !== 0) {
        return [];
      }
      try {
        type Pm2ListItem = {
          pm_id?: number;
          name?: string;
          pid?: number;
          monit?: { memory?: number; cpu?: number };
          pm2_env?: { status?: string };
        };
        const parsed = JSON.parse(res.stdout) as unknown;
        if (!Array.isArray(parsed)) {
          return [];
        }
        return (parsed as Pm2ListItem[]).map((p) => ({
          id: p.pm_id,
          name: p.name,
          status: p.pm2_env?.status,
          pid: p.pid,
          memory: p.monit?.memory,
          cpu: p.monit?.cpu,
        }));
      } catch {
        return [];
      }
    },
    async logs(
      instanceId: string,
      name?: string,
      lines = 100
    ): Promise<ProcessLogsResult> {
      const args = name
        ? ["logs", name, "--nostream", "--lines", String(lines)]
        : ["logs", "--nostream", "--lines", String(lines)];
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args,
      });
      return { out: res.stdout, err: res.stderr };
    },
  };
}
