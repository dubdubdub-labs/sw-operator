#!/usr/bin/env node
import {
  buildClaudeCredentialProfile,
  DefaultCredentialsInstaller,
} from "@repo/credentials";
import { createOrchestrator } from "@repo/orchestrator";
import { ShellProcessManager } from "@repo/process-shell";
import {
  cleanupSandbox,
  createCodeSandboxProvider,
  createSandboxFromTemplate,
} from "@repo/providers-codesandbox";
import { createCodeSandboxSdkAdapter } from "@repo/providers-codesandbox/sdk-adapter";
import { Command } from "commander";

const program = new Command();
program
  .name("orchestrator")
  .description("CLI for orchestrator utilities")
  .version("0.0.1");

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}`);
    process.exit(1);
  }
  return v;
}

program
  .command("csb:create")
  .description("Create a CodeSandbox sandbox from a template and print its ID")
  .requiredOption("-t, --template <id>", "Template ID (e.g., 69vrxg)")
  .option(
    "-p, --privacy <mode>",
    "privacy: private|public|public-hosts",
    "private"
  )
  .action(async (opts) => {
    const apiKey = requireEnv("CSB_API_KEY");
    const sandbox = await createSandboxFromTemplate({
      apiKey,
      templateId: String(opts.template),
      privacy: opts.privacy,
    });
    console.log(sandbox.id);
  });

program
  .command("csb:cleanup")
  .description("Shutdown or hibernate a sandbox by ID")
  .requiredOption("-i, --id <sandboxId>", "Sandbox ID")
  .option("--shutdown", "Prefer shutdown over hibernate", false)
  .action(async (opts) => {
    const apiKey = requireEnv("CSB_API_KEY");
    await cleanupSandbox({
      apiKey,
      id: String(opts.id),
      preferShutdown: Boolean(opts.shutdown),
    });
    console.log("cleaned", opts.id);
  });

program
  .command("creds:install")
  .description("Install Claude OAuth credentials to a sandbox via orchestrator")
  .requiredOption("-i, --id <sandboxId>", "Sandbox ID to target")
  .requiredOption("--token <accessToken>", "Claude access token")
  .requiredOption(
    "--expires <iso|millis>",
    "Token expiry (ISO string or ms since epoch)"
  )
  .action(async (opts) => {
    const apiKey = requireEnv("CSB_API_KEY");
    const adapter = createCodeSandboxSdkAdapter(apiKey);
    const provider = createCodeSandboxProvider({ apiKey, adapter });
    // Orchestrator instantiated (uses Shell PM for completeness)
    const _orch = createOrchestrator({
      provider,
      processManager: ShellProcessManager(provider.exec),
    });

    // Build credentials profile
    const profile = buildClaudeCredentialProfile({
      authToken: String(opts.token),
      expiresAt: String(opts.expires),
    });

    // Use the credentials installer directly for an existing sandbox id
    await DefaultCredentialsInstaller(provider, String(opts.id), profile);
    // Also write/update machine info like orchestrator.bootAndPrepare would
    const info = {
      updatedAt: new Date().toISOString(),
      note: "installed claude credentials via CLI",
    };
    const home = provider.capabilities?.homeDir ?? "/project/workspace";
    const path = `${home}/.machine.json`;
    await provider.files.writeFileAtomic(
      String(opts.id),
      path,
      JSON.stringify(info, null, 2),
      {
        encoding: "utf8",
        mode: 0o640,
        createDirs: true,
      }
    );
    console.log("credentials installed and .machine.json updated for", opts.id);
  });

program.parseAsync().catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
