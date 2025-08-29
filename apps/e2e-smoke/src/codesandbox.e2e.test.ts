import { describe, expect, it } from "vitest";
import { getResultsFile, logEvent } from "./log.js";

const shouldRun = Boolean(process.env.RUN_E2E);

describe.runIf(shouldRun)("CodeSandbox E2E Smoke", () => {
  it("boots, runs echo, and writes a file", async () => {
    const apiKey = process.env.CSB_API_KEY;
    expect(apiKey && apiKey.length > 0).toBe(true);
    if (!apiKey) {
      return;
    }

    // Dynamic import to avoid hard dependency in other packages
    const { createSandboxFromTemplate, cleanupSandbox } = await import(
      "@repo/providers-codesandbox"
    );
    const template = process.env.TESTING_TEMPLATE_ID ?? "69vrxg";
    await logEvent({
      kind: "test_start",
      test: "sdk_smoke",
      resultsFile: getResultsFile(),
    });
    const sandbox = await createSandboxFromTemplate({
      apiKey,
      templateId: template,
    });
    await logEvent({ kind: "sandbox_created", id: sandbox.id, template });
    try {
      type Client = {
        bootupType?: string;
        setup?: { getSteps: () => unknown[] };
        commands: { run: (cmd: string) => Promise<unknown> };
        fs: {
          writeTextFile: (p: string, t: string) => Promise<void>;
          readTextFile: (p: string) => Promise<unknown>;
        };
      };
      const connected = await (
        sandbox as { connect: () => Promise<unknown> }
      ).connect();
      const client = connected as Client;
      await logEvent({ kind: "sandbox_connected", id: sandbox.id });

      // Optional clean boot setup steps
      if (client.bootupType === "CLEAN" && client.setup) {
        const steps = client.setup.getSteps();
        type SetupStep = {
          open: () => Promise<void>;
          waitUntilComplete: () => Promise<void>;
        };
        const typed: SetupStep[] = steps as SetupStep[];
        await logEvent({ kind: "setup_steps", count: typed.length });
        await Promise.all(
          typed.map((step) => step.open().then(() => step.waitUntilComplete()))
        );
        await logEvent({ kind: "setup_complete" });
      }

      // Exec: echo ok
      const cmd = "echo 'ok'";
      const out = await client.commands.run(cmd);
      await logEvent({
        kind: "exec_done",
        cmd,
        out_sample: String(out).slice(0, 120),
      });
      expect(String(out).trim().toLowerCase()).toContain("ok");

      // Files: write/read text
      const file = "./hello.txt";
      await client.fs.writeTextFile(file, "Hello");
      const text = await client.fs.readTextFile(file);
      await logEvent({
        kind: "fs_rw",
        path: file,
        read_sample: String(text).slice(0, 120),
      });
      expect(text).toBe("Hello");
    } finally {
      // best-effort cleanup
      await cleanupSandbox({ apiKey, id: sandbox.id, preferShutdown: true });
      await logEvent({ kind: "sandbox_cleaned", id: sandbox.id });
    }
  }, 120_000);
});
