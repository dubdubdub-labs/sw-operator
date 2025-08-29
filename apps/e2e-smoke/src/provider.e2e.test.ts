import { createCodeSandboxProvider } from "@repo/providers-codesandbox";
import { createCodeSandboxSdkAdapter } from "@repo/providers-codesandbox/sdk-adapter";
import { describe, expect, it } from "vitest";
import { getResultsFile, logEvent } from "./log.js";

const shouldRun = Boolean(process.env.RUN_E2E);

describe.runIf(shouldRun)("Provider + SDK adapter E2E", () => {
  it("exec echo and file IO via provider", async () => {
    const apiKey = process.env.CSB_API_KEY;
    expect(apiKey && apiKey.length > 0).toBe(true);
    if (!apiKey) {
      return;
    }

    // Use the SDK directly to create a sandbox (fork template)
    const { createSandboxFromTemplate, cleanupSandbox } = await import(
      "@repo/providers-codesandbox"
    );
    const template = process.env.TESTING_TEMPLATE_ID ?? "69vrxg";
    await logEvent({
      kind: "test_start",
      test: "provider_smoke",
      resultsFile: getResultsFile(),
    });
    const sandbox = await createSandboxFromTemplate({
      apiKey,
      templateId: template,
    });
    await logEvent({ kind: "sandbox_created", id: sandbox.id, template });

    const provider = createCodeSandboxProvider({
      apiKey,
      adapter: createCodeSandboxSdkAdapter(apiKey),
    });

    try {
      // Exec
      const cmdSpec = {
        kind: "shell",
        script: "echo ok",
      } as const;
      await logEvent({ kind: "provider_exec_start", spec: cmdSpec });
      const res = await provider.exec(sandbox.id, cmdSpec);
      await logEvent({
        kind: "provider_exec_done",
        out_sample: res.stdout.slice(0, 120),
        exit_code: res.exit_code,
      });
      expect(String(res.stdout).toLowerCase()).toContain("ok");

      // Files
      const filePath = "~/.e2e-smoke.txt";
      await provider.files.writeFileAtomic(sandbox.id, filePath, "Hello", {
        encoding: "utf8",
        createDirs: true,
      });
      await logEvent({ kind: "provider_write_done", path: filePath });
      const text = await provider.files.readFile(sandbox.id, filePath, "utf8");
      await logEvent({
        kind: "provider_read_done",
        path: filePath,
        read_sample: text.slice(0, 120),
      });
      expect(text).toBe("Hello");
    } finally {
      await cleanupSandbox({ apiKey, id: sandbox.id, preferShutdown: true });
      await logEvent({ kind: "sandbox_cleaned", id: sandbox.id });
    }
  }, 120_000);
});
