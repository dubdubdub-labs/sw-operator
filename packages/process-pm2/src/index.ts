import type {
  CommandSpec,
  ExecAPI,
  ProcessInfo,
  ProcessManager,
} from "@repo/runtime-interfaces";
import { ProcessError } from "@repo/runtime-interfaces";

function sanitizeName(input?: string): string | undefined {
  if (!input) {
    return;
  }
  const cleaned = input
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 50)
    .replace(/^-+|-+$/g, "");
  return cleaned || undefined;
}

function toPayload(spec: CommandSpec): string {
  const cwd = spec.cwd ? `cd ${spec.cwd} && ` : "";
  const env = spec.env
    ? `${Object.entries(spec.env)
        .map(([k, v]) => `export ${k}=${JSON.stringify(v)};`)
        .join(" ")} `
    : "";
  if (spec.kind === "shell") {
    return `${cwd}${env}${spec.script}`;
  }
  const args = spec.args?.map((a) => JSON.stringify(a)).join(" ") ?? "";
  return `${cwd}${env}${spec.command} ${args}`.trim();
}

export function PM2ProcessManager(execRunner: ExecAPI): ProcessManager {
  return {
    async start(instanceId, spec) {
      const name = sanitizeName(spec.command.name) ?? undefined;
      const payload = toPayload(spec.command);
      const args: string[] = [
        "start",
        "bash",
        ...(name ? ["--name", name] : []),
        ...(spec.restart === "never" ? ["--no-autorestart"] : []),
        "--",
        "-lc",
        payload,
      ];
      const result = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args,
      });
      if (result.exit_code !== 0) {
        throw new ProcessError("PROCESS_ERROR", "PM2 start failed", {
          instanceId,
          stderr_len: result.stderr.length,
        });
      }
      return { name };
    },
    async stop(instanceId, nameOrId) {
      const args = ["stop", String(nameOrId)];
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args,
      });
      if (res.exit_code !== 0) {
        throw new ProcessError("PROCESS_ERROR", "PM2 stop failed", {
          instanceId,
        });
      }
    },
    async list(instanceId) {
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args: ["jlist"],
      });
      if (res.exit_code !== 0) {
        return [] as ProcessInfo[];
      }
      try {
        const data = JSON.parse(res.stdout) as Array<{
          name?: string;
          pid?: number;
          pm2_env?: { status?: string };
        }>;
        return data.map((d) => ({
          name: d.name,
          pid: d.pid,
          status: (d.pm2_env?.status as ProcessInfo["status"]) ?? "unknown",
        }));
      } catch {
        return [] as ProcessInfo[];
      }
    },
    async logs(instanceId, params) {
      const lines = params?.lines ?? 100;
      const args = params?.nameOrId
        ? [
            "logs",
            String(params.nameOrId),
            "--nostream",
            "--lines",
            String(lines),
          ]
        : ["logs", "--nostream", "--lines", String(lines)];
      const res = await execRunner(instanceId, {
        kind: "argv",
        command: "pm2",
        args,
      });
      if (res.exit_code !== 0) {
        return { out: undefined, err: res.stderr };
      }
      return { out: res.stdout, err: res.stderr };
    },
  } satisfies ProcessManager;
}

export default PM2ProcessManager;
