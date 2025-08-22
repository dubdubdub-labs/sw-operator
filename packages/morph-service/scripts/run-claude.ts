/*
  Script: run-claude.ts
  Purpose: Exercise the examples from packages/morph-service/CLAUDE.md, with emphasis on PM2 commands.
  Usage:
    bun packages/morph-service/scripts/run-claude.ts

  Env:
    - MORPH_API_KEY: required (loaded from repo .env by Bun)
    - SNAPSHOT_ID: optional override; defaults to 'snapshot_c1p8b6c2'
*/

import { createLogger } from "@repo/logger";
import {
  createMorphClient,
  type MorphService,
  type PM2ProcessInfo,
} from "@repo/morph-service";

const logger = createLogger({ prefix: "MorphDoc", level: "info" });

const SNAPSHOT_ID = process.env.SNAPSHOT_ID ?? "snapshot_c1p8b6c2";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

async function waitForReady(morph: MorphService, instanceId: string): Promise<void> {
  const started = Date.now();
  const timeoutMs = 3 * 60 * 1000; // 3 minutes
  while (true) {
    const it = await morph.instances.get(instanceId);
    if (it.status === "ready") return;
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Instance ${instanceId} not ready after ${timeoutMs}ms (status: ${it.status})`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function ensurePm2Available(morph: MorphService, instanceId: string): Promise<void> {
  const res = await morph.instances.exec(instanceId, ["pm2", "-v"]);
  if (res.exit_code !== 0) {
    throw new Error(`pm2 not available on instance ${instanceId}: ${res.stderr}`);
  }
}

async function run(): Promise<void> {
  const apiKey = requireEnv("MORPH_API_KEY");
  logger.info("Starting CLAUDE.md runner", { SNAPSHOT_ID });

  const morph = createMorphClient({ apiKey, logger: logger.child({ prefix: "Morph" }) });

  // 1) Boot instance from snapshot
  logger.info("Booting instance from snapshot...");
  const instance = await morph.instances.boot(SNAPSHOT_ID, {
    ttl_seconds: 300,
    ttl_action: "stop",
  } as const);
  logger.info("Instance booted", { instanceId: instance.id, status: instance.status });

  let instanceId = instance.id;
  try {
    // 2) Wait for ready
    await waitForReady(morph, instanceId);
    logger.info("Instance is ready", { instanceId });

    // 3) Files quick check
    logger.info("Testing file operations");
    const testPath = "/tmp/morph-doc-test.txt";
    await morph.files.writeFile(instanceId, testPath, "hello from morph docs");
    const content = await morph.files.readFile(instanceId, testPath);
    logger.info("File read ok", { content: content.slice(0, 64) });

    // 4) PM2 checks
    logger.info("Checking pm2 availability");
    await ensurePm2Available(morph, instanceId);
    logger.info("pm2 is available");

    // 4a) Start a simple process via PM2
    const procName = "morph-doc-sleeper";
    logger.info("Starting pm2 process", { name: procName });
    await morph.pm2.start(instanceId, "/bin/sleep", {
      name: procName,
      args: "60",
      autorestart: false,
      env: { DEMO: "1" },
      script: "/bin/sleep",
    });

    // 4b) List processes
    const list1: PM2ProcessInfo[] = await morph.pm2.list(instanceId);
    logger.info("pm2 list", { count: list1.length });

    // 4c) Describe the process
    const desc = await morph.pm2.describe(instanceId, procName);
    logger.info("pm2 describe", { name: desc.name, status: desc.status, pm_id: desc.pm_id });

    // 4d) Logs (will likely be empty for sleep, but exercise the API)
    const logs = await morph.pm2.logs(instanceId, procName, 10);
    logger.info("pm2 logs fetched", { outLen: logs.out.length, errLen: logs.error.length });

    // 4e) Restart, then Stop, then Delete the process
    logger.info("pm2 restart", { name: procName });
    await morph.pm2.restart(instanceId, procName);

    logger.info("pm2 stop", { name: procName });
    await morph.pm2.stop(instanceId, procName);

    logger.info("pm2 delete", { name: procName });
    await morph.pm2.delete(instanceId, procName);

    // 4f) StartMany, then StopAll/DeleteAll
    logger.info("pm2 startMany");
    await morph.pm2.startMany(instanceId, [
      { name: "morph-doc-sleep10", script: "/bin/sleep", args: "10", autorestart: false },
      { name: "morph-doc-sleep20", script: "/bin/sleep", args: "20", autorestart: false },
    ]);

    const list2 = await morph.pm2.list(instanceId);
    logger.info("pm2 list after startMany", { count: list2.length });

    logger.info("pm2 stopAll");
    await morph.pm2.stopAll(instanceId);

    logger.info("pm2 deleteAll");
    await morph.pm2.deleteAll(instanceId);

    // 4g) Dump/Save/Resurrect (non-destructive)
    logger.info("pm2 dump/save/resurrect");
    await morph.pm2.dump(instanceId);
    await morph.pm2.save(instanceId);
    await morph.pm2.resurrect(instanceId);

    // Note: startup/unstartup may require elevated privileges; skipping here.

    // 5) Exec streaming quick smoke (echo only)
    logger.info("exec stream smoke test");
    const stream = morph.instances.execStream(instanceId, ["bash", "-lc", "echo line1; echo line2; echo done 1>&2"]);
    for await (const evt of stream) {
      logger.info("stream", { type: evt.type, content: String(evt.content).slice(0, 64) });
    }

    logger.info("CLAUDE.md run complete");
  } catch (e) {
    logger.error("Runner failed", e instanceof Error ? e : undefined, {
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  } finally {
    // Always stop instance
    try {
      logger.info("Stopping instance", { instanceId });
      await morph.instances.stop(instanceId);
      logger.info("Instance stopped");
    } catch (stopErr) {
      logger.warn("Failed to stop instance", { error: stopErr instanceof Error ? stopErr.message : String(stopErr) });
    }
  }
}

run().catch((e) => {
  // Propagate non-zero exit for CI visibility
  console.error(e);
  process.exit(1);
});
