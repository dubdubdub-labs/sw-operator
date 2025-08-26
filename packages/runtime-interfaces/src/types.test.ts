import { describe, expect, it } from "vitest";
import type {
  Agent,
  AgentInput,
  CommandSpec,
  ExecResult,
  Orchestrator,
  ProcessManager,
  ProcessSpec,
  VMProvider,
} from "./index";

describe("runtime-interfaces types", () => {
  it("accepts example shapes for contracts", async () => {
    const cmd: CommandSpec = {
      kind: "argv",
      command: "echo",
      args: ["ok"],
      cwd: "~",
    };
    const _spec: ProcessSpec = { command: cmd, restart: "never", instances: 1 };

    const provider: VMProvider = {
      name: "fake",
      version: "0.0.1",
      capabilities: { homeDir: "/root" },
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
        readFile() {
          return Promise.resolve("");
        },
        fileExists() {
          return Promise.resolve(true);
        },
        writeFile() {
          return Promise.resolve();
        },
        writeFileAtomic() {
          return Promise.resolve();
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
      exec(): Promise<ExecResult> {
        return Promise.resolve({ stdout: "ok", stderr: "", exit_code: 0 });
      },
    };

    const pm: ProcessManager = {
      start() {
        return Promise.resolve({ name: "p1" });
      },
      stop() {
        return Promise.resolve();
      },
      list() {
        return Promise.resolve([]);
      },
      logs() {
        return Promise.resolve({ out: "", err: "" });
      },
    };

    const agent: Agent = {
      name: "test",
      toProcessSpec(input: AgentInput): ProcessSpec {
        return { command: { kind: "shell", script: `echo ${input.prompt}` } };
      },
    };

    const orch: Orchestrator = {
      async bootAndPrepare(snapshotId: string) {
        const vm = await provider.instances.boot(snapshotId);
        return { instanceId: vm.id, capabilities: provider.capabilities };
      },
      async startSession(instanceId: string, input: AgentInput) {
        const s = agent.toProcessSpec(input);
        const res = await pm.start(instanceId, s);
        return { processName: res.name };
      },
      logs(instanceId: string) {
        return pm.logs(instanceId);
      },
      listProcesses(instanceId: string) {
        return pm.list(instanceId);
      },
    };

    const boot = await orch.bootAndPrepare("snap-1");
    expect(boot.instanceId).toContain("i-snap-1");
    const started = await orch.startSession(boot.instanceId, { prompt: "hi" });
    expect(started.processName).toBe("p1");
  });
});
