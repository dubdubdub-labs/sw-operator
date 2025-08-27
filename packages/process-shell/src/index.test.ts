import type {
  CommandSpec,
  ExecAPI,
  ProcessSpec,
} from "@repo/runtime-interfaces";
import { describe, expect, it } from "vitest";
import { ShellProcessManager } from "./index.js";

function fakeExec({ exit = 0, stdout = "", stderr = "" } = {}): {
  runner: ExecAPI;
  calls: Array<{ instanceId: string; spec: CommandSpec }>;
} {
  const calls: Array<{ instanceId: string; spec: CommandSpec }> = [];
  const runner: ExecAPI = (instanceId, spec) => {
    calls.push({ instanceId, spec });
    return Promise.resolve({ stdout, stderr, exit_code: exit });
  };
  return { runner, calls };
}

describe("ShellProcessManager", () => {
  it("runs the command and returns name", async () => {
    const { runner, calls } = fakeExec({ exit: 0, stdout: "ok" });
    const pm = ShellProcessManager(runner);
    const spec: ProcessSpec = {
      command: { kind: "argv", command: "echo", args: ["ok"], name: "t1" },
    };
    const res = await pm.start("i-1", spec);
    expect(res.name).toBe("t1");
    expect(calls.length).toBe(1);
  });

  it("throws on non-zero exit", async () => {
    const { runner } = fakeExec({ exit: 2, stderr: "boom" });
    const pm = ShellProcessManager(runner);
    const spec: ProcessSpec = {
      command: { kind: "shell", script: "exit 2", name: "bad" },
    };
    await expect(pm.start("i-1", spec)).rejects.toHaveProperty(
      "code",
      "PROCESS_ERROR"
    );
  });
});
