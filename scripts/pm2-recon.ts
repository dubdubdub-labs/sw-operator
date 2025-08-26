#!/usr/bin/env bun
/**
 * PM2 Recon Script (temporary)
 *
 * Goal: validate PM2 behavior on the target snapshot/image before finalizing
 * the ProcessManager implementation.
 *
 * What to check:
 * - cwd semantics: confirm `cd <cwd> && <cmd>` inside payload runs in the expected directory
 * - env export: confirm exported env variables are visible to the process
 * - jlist shape: confirm `pm2 jlist` returns parseable JSON; capture failure modes
 * - logs: confirm `pm2 logs --nostream` output format and line counts
 * - name collisions: attempt to start two processes with same name; observe behavior
 *
 * Usage:
 *   bun scripts/pm2-recon.ts
 *
 * Notes:
 * - This is a stub. Fill in once provider + exec runner exist.
 */

async function main() {
  console.log("[pm2-recon] Stub placeholder. Implement once provider is wired.");
}

void main();

