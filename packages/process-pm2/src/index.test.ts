import type {
  CommandSpec,
  ExecAPI,
  ProcessSpec,
} from "@repo/runtime-interfaces";
import { describe, expect, it } from "vitest";
import { PM2ProcessManager } from "./index.js";

function captureExec(): {
  runner: ExecAPI;
  calls: Array<{ spec: CommandSpec }>;
} {
  const calls: Array<{ spec: CommandSpec }> = [];
  const runner: ExecAPI = (_instanceId, spec) => {
    calls.push({ spec });
    return Promise.resolve({ stdout: "", stderr: "", exit_code: 0 });
  };
  return { runner, calls };
}

describe("PM2ProcessManager", () => {
  it("builds pm2 argv for shell spec", async () => {
    const { runner, calls } = captureExec();
    const pm = PM2ProcessManager(runner);
    const spec: ProcessSpec = {
      command: {
        kind: "shell",
        script: "echo hi",
        name: "my job",
        cwd: "/tmp",
      },
      restart: "never",
    };
    await pm.start("i-1", spec);
    const first = calls.at(0)?.spec;
    expect(first && first.kind === "argv").toBeTruthy();
    if (first && first.kind === "argv") {
      expect(first.command).toBe("pm2");
      expect(first.args?.at(0)).toBe("start");
      expect(first.args?.includes("--no-autorestart")).toBe(true);
    }
  });

  it("builds payload for argv spec with args", async () => {
    const { runner, calls } = captureExec();
    const pm = PM2ProcessManager(runner);
    const spec: ProcessSpec = {
      command: {
        kind: "argv",
        command: "echo",
        args: ["hi", "there"],
        name: "a b",
      },
    };
    await pm.start("i-1", spec);
    const argv = calls.at(0)?.spec;
    expect(argv && argv.kind === "argv").toBeTruthy();
  });
});
