#!/usr/bin/env bun
/**
 * Morph Preflight (temporary)
 *
 * Goal: perform quick sanity checks against Morph using the provider and/or
 * the globally authenticated `morphcloud` CLI for parity/error diagnostics.
 *
 * What to check:
 * - Can we list images/snapshots via API (or CLI for cross-check)?
 * - Can we exec a harmless command on a known instance (if any)?
 * - Confirm API key is present; print masked prefix.
 *
 * Usage:
 *   bun scripts/morph-preflight.ts
 *
 * Notes:
 * - This is a stub. Fill in once provider exists.
 */

async function main() {
  const key = process.env.MORPH_API_KEY || "";
  const masked = key ? `${key.slice(0, 6)}...${key.slice(-4)}` : "<missing>`";
  console.log("[morph-preflight] MORPH_API_KEY:", masked);
  console.log(
    "[morph-preflight] Stub placeholder. Implement once provider is wired."
  );
}

void main();
