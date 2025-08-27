import type {
  CommandSpec,
  CredentialProfile,
  ExecResult,
  VMProvider,
} from "@repo/runtime-interfaces";
import { describe, expect, it } from "vitest";
import {
  buildClaudeCredentialProfile,
  DefaultCredentialsInstaller,
} from "./index.js";

function fakeProvider(): {
  provider: VMProvider;
  writes: Array<{
    path: string;
    content: string;
    mode?: number;
    encoding?: string;
    createDirs?: boolean;
  }>;
  execs: Array<{ spec: CommandSpec }>;
  setWriteError: (path: string) => void;
  setExecExit: (code: number) => void;
} {
  const writes: Array<{
    path: string;
    content: string;
    mode?: number;
    encoding?: string;
    createDirs?: boolean;
  }> = [];
  const execs: Array<{ spec: CommandSpec }> = [];
  let writeErrorPath: string | undefined;
  let execExit = 0;
  const provider: VMProvider = {
    name: "fake",
    version: "0.0.0",
    capabilities: { homeDir: "/home/user" },
    instances: {
      boot() {
        return Promise.resolve({ id: "i", status: "ready" });
      },
      get() {
        return Promise.resolve({ id: "i", status: "ready" });
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
      fork() {
        return Promise.resolve({ id: "i2", status: "ready" });
      },
    },
    files: {
      readFile() {
        return Promise.resolve("");
      },
      writeFile() {
        return Promise.resolve();
      },
      writeFileAtomic(_instanceId, path, content, opts) {
        if (writeErrorPath && path === writeErrorPath) {
          throw new Error("write fail");
        }
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
      const res: ExecResult = { stdout: "", stderr: "", exit_code: execExit };
      return Promise.resolve(res);
    },
  };
  return {
    provider,
    writes,
    execs,
    setWriteError: (p: string) => {
      writeErrorPath = p;
    },
    setExecExit: (c: number) => {
      execExit = c;
    },
  };
}

describe("DefaultCredentialsInstaller", () => {
  it("writes files atomically and runs postInstall", async () => {
    const { provider, writes, execs } = fakeProvider();
    const profile: CredentialProfile = {
      name: "test",
      files: [
        {
          path: "~/.claude/.credentials.json",
          content: "{}",
          mode: 0o600,
          encoding: "utf8",
        },
      ],
      postInstall: { kind: "argv", command: "echo", args: ["ok"] },
    };
    await DefaultCredentialsInstaller(provider, "i-1", profile);
    expect(writes.at(0)?.path).toBe("~/.claude/.credentials.json");
    expect(execs.length).toBe(1);
  });

  it("throws on write failure", async () => {
    const f = fakeProvider();
    f.setWriteError("~/.claude/.credentials.json");
    const profile: CredentialProfile = {
      name: "test",
      files: [
        {
          path: "~/.claude/.credentials.json",
          content: "{}",
          mode: 0o600,
          encoding: "utf8",
        },
      ],
    };
    await expect(
      DefaultCredentialsInstaller(f.provider, "i-1", profile)
    ).rejects.toMatchObject({ code: "FILE_IO_ERROR" });
  });

  it("buildClaudeCredentialProfile produces correct path and mode", () => {
    const prof = buildClaudeCredentialProfile({
      authToken: "tok",
      expiresAt: "2025-01-01T00:00:00Z",
    });
    const f = prof.files.at(0);
    expect(f?.path).toBe("~/.claude/.credentials.json");
    expect(f?.mode).toBe(0o600);
    expect(typeof f?.content).toBe("string");
  });
});
