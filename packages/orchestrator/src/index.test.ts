import { DefaultCredentialsInstaller } from "@repo/credentials";
import type {
  Agent,
  CommandSpec,
  CredentialProfile,
  ExecResult,
  ProcessInfo,
  ProcessManager,
  VMProvider,
} from "@repo/runtime-interfaces";
import { describe, expect, it } from "vitest";
import { createOrchestrator } from "./index.js";

function makeFakeProvider() {
  const writes: Array<{
    path: string;
    content: string;
    mode?: number;
    encoding?: string;
    createDirs?: boolean;
  }> = [];
  const execs: Array<{ spec: CommandSpec }> = [];

  const provider: VMProvider = {
    name: "fake-csb",
    version: "0.0.0",
    capabilities: { homeDir: "/project/workspace" },
    instances: {
      boot(snapshotId: string) {
        return Promise.resolve({ id: `i-${snapshotId}`, status: "ready" });
      },
      get(instanceId: string) {
        return Promise.resolve({ id: instanceId, status: "ready" });
      },
      list() {
        return Promise.resolve([]);
      },
      stop() {
        return Promise.resolve();
      },
      terminate() {
        return Promise.resolve();
      },
      fork(instanceId: string) {
        return Promise.resolve({ id: `${instanceId}-fork`, status: "ready" });
      },
    },
    files: {
      readFile(_instanceId, _path, _enc) {
        return Promise.resolve("");
      },
      writeFile(_instanceId, path, content, opts) {
        writes.push({
          path,
          content,
          mode: opts?.mode,
          encoding: opts?.encoding,
        });
        return Promise.resolve();
      },
      writeFileAtomic(_instanceId, path, content, opts) {
        writes.push({
          path,
          content,
          mode: opts?.mode,
          encoding: opts?.encoding,
          createDirs: opts?.createDirs,
        });
        return Promise.resolve();
      },
      fileExists() {
        return Promise.resolve(true);
      },
      createDirectory() {
        return Promise.resolve();
      },
      deleteFile() {
        return Promise.resolve();
      },
      deleteDirectory() {
        return Promise.resolve();
      },
    },
    exec(_instanceId, spec) {
      execs.push({ spec });
      const res: ExecResult = { stdout: "", stderr: "", exit_code: 0 };
      return Promise.resolve(res);
    },
  };

  return { provider, writes, execs };
}

function makeFakePM(): {
  pm: ProcessManager;
  starts: Array<{ specCommand: CommandSpec }>;
  lists: Array<{ instanceId: string }>;
  logs: Array<{ instanceId: string }>;
} {
  const starts: Array<{ specCommand: CommandSpec }> = [];
  const lists: Array<{ instanceId: string }> = [];
  const logs: Array<{ instanceId: string }> = [];
  const pm: ProcessManager = {
    start(_instanceId, spec) {
      starts.push({ specCommand: spec.command });
      return Promise.resolve({ name: spec.command.name });
    },
    stop() {
      return Promise.resolve();
    },
    list(instanceId) {
      lists.push({ instanceId });
      const out: ProcessInfo[] = [];
      return Promise.resolve(out);
    },
    logs(instanceId) {
      logs.push({ instanceId });
      return Promise.resolve({ out: "", err: "" });
    },
  };
  return { pm, starts, lists, logs };
}

function simpleAgent(): Agent<{ prompt: string }> {
  return {
    name: "TestAgent",
    toProcessSpec(input) {
      const cmd: CommandSpec = {
        kind: "shell",
        name: "ta-session",
        script: `echo ${JSON.stringify(input.prompt)}`,
        cwd: "/project/workspace",
      };
      return { command: cmd, restart: "never" };
    },
  };
}

describe("orchestrator", () => {
  it("bootAndPrepare writes machine info and installs credentials", async () => {
    const { provider, writes } = makeFakeProvider();
    const orch = createOrchestrator({
      provider,
      processManager: makeFakePM().pm,
      credentialsInstaller: DefaultCredentialsInstaller,
    });

    const cred: CredentialProfile = {
      name: "claude",
      files: [
        {
          path: "~/.claude/.credentials.json",
          content: "{}",
          mode: 0o600,
          encoding: "utf8",
        },
      ],
    };

    const boot = await orch.bootAndPrepare("tpl-1", {
      credentialProfiles: [cred],
      machineInfo: { image: "tpl-1" },
    });

    expect(boot.instanceId).toBe("i-tpl-1");
    // First write credential, then machine info
    const paths = writes.map((w) => w.path);
    expect(paths.some((p) => p.endsWith(".credentials.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith(".machine.json"))).toBe(true);
  });

  it("startSession delegates to process manager with agent spec", async () => {
    const { provider } = makeFakeProvider();
    const { pm, starts } = makeFakePM();
    const orch = createOrchestrator({ provider, processManager: pm });

    const agent = simpleAgent();
    const res = await orch.startSession("i-1", agent, { prompt: "hi" }, pm);
    expect(res.processName).toBe("ta-session");
    expect(starts.length).toBe(1);
    expect(starts[0]?.specCommand.kind).toBe("shell");
  });

  it("listProcesses and logs proxy to process manager", async () => {
    const { provider } = makeFakeProvider();
    const { pm, lists, logs } = makeFakePM();
    const orch = createOrchestrator({ provider, processManager: pm });

    const _list = await orch.listProcesses("i-1", pm);
    const _logs = await orch.logs("i-1", pm);
    expect(lists.length).toBe(1);
    expect(logs.length).toBe(1);
    expect(Array.isArray(_list)).toBe(true);
    expect(typeof _logs.out === "string").toBe(true);
  });
});
