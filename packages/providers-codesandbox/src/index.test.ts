import type { CommandSpec } from "@repo/runtime-interfaces";
import { describe, expect, it } from "vitest";
import type { CodeSandboxAdapter } from "./adapter.js";
import { createCodeSandboxProvider, mapBootupToStatus } from "./index.js";

describe("mapBootupToStatus", () => {
  it("maps FORK/RESUME/RUNNING to ready; CLEAN to booting", () => {
    expect(mapBootupToStatus("FORK")).toBe("ready");
    expect(mapBootupToStatus("RESUME")).toBe("ready");
    expect(mapBootupToStatus("RUNNING")).toBe("ready");
    expect(mapBootupToStatus("CLEAN")).toBe("booting");
  });
});

describe("createCodeSandboxProvider", () => {
  it("exposes default capabilities and a simple boot stub", async () => {
    const p = createCodeSandboxProvider({ apiKey: "x" });
    expect(p.capabilities?.homeDir).toBe("/project/workspace");
    const vm = await p.instances.boot("tpl-1");
    expect(vm.id).toContain("csb-tpl-1");
    expect(vm.status).toBe("ready");
  });

  it("builds exec payload for shell and argv using adapter", async () => {
    const calls: string[] = [];
    const adapter: CodeSandboxAdapter = {
      connect() {
        return Promise.resolve({
          run(command: string) {
            calls.push(command);
            return Promise.resolve({ stdout: "", stderr: "", exit_code: 0 });
          },
          fs: {
            writeTextFile() {
              return Promise.resolve();
            },
            readTextFile() {
              return Promise.resolve("");
            },
          },
        });
      },
    };
    const p = createCodeSandboxProvider({ apiKey: "x", adapter });
    const shell: CommandSpec = {
      kind: "shell",
      script: "echo hi",
      cwd: "/tmp",
    };
    await p.exec("i-1", shell);
    expect(calls.at(0)).toContain("cd /tmp && echo hi");
    const argv: CommandSpec = {
      kind: "argv",
      command: "echo",
      args: ["hi", "there"],
      env: { A: "1" },
    };
    await p.exec("i-1", argv);
    const c = calls.at(1) ?? "";
    expect(c).toContain('export A="1";');
    expect(c).toContain('echo "hi" "there"');
  });

  it("normalizes ~ paths and uses writeFileAtomic fallback", async () => {
    const writes: Array<{ path: string; text: string }> = [];
    const adapter: CodeSandboxAdapter = {
      connect() {
        return Promise.resolve({
          run(_c: string) {
            return Promise.resolve({ stdout: "", stderr: "", exit_code: 0 });
          },
          fs: {
            writeTextFile(pth: string, text: string) {
              writes.push({ path: pth, text });
              return Promise.resolve();
            },
            readTextFile() {
              return Promise.resolve("");
            },
          },
        });
      },
    };
    const p = createCodeSandboxProvider({ apiKey: "x", adapter });
    await p.files.writeFileAtomic("i-1", "~/.claude/creds.json", "{}", {
      encoding: "utf8",
      createDirs: true,
    });
    // Path becomes relative to workspace for SDK
    expect(writes.at(0)?.path).toBe("./.claude/creds.json");
  });
});
