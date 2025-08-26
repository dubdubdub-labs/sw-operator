# Progress Log (Append-Only)

This is an append-only implementation log. Do not edit previous entries; always append new entries at the end with a timestamp. Keep entries dense and precise.

Entry format
- Summary: 1–2 lines
- Done: short bullets
- Next: short bullets
- Decisions: short bullets (what we locked in)
- Issues/Risks: short bullets
- Notes/Links: short bullets (paths, refs)

---

## Initial spec + implementation plan
- Summary: Created architecture and implementation guides; aligned with morph/pm2 realities; set up scripts and logging approach.
- Done:
  - Wrote `_spec/ARCH.md` (modular architecture, provider/process/agent/orchestrator, errors, testing).
  - Wrote `_spec/IMPLEMENTATION.md` (phase-by-phase plan, E2E smoke, PM2 recon scripts, file-IO semantics).
  - Updated references to `_reference/*`; clarified provider exec (no `bash -lc`), PM2 specifics kept.
  - Clarified boot semantics: `instances.boot` resolves when ready (no client-side polling).
  - Documented `~` expansion based on `capabilities.homeDir`; allow overriding home directory.
  - Added CLAUDE.md guidelines per package; require `AGENTS.md` symlink.
  - Created `scripts/` folder scaffold (to be populated with recon/smoke scripts).
- Next:
  - Add script stubs: pm2 recon, file-IO smoke, morph preflight; run them against `snapshot_c1p8b6c2`.
  - Scaffold package skeletons per ARCH.md (types only for `@repo/runtime-interfaces`).
  - Define error envelope (code, operation, resource, hint) templates for all packages.
- Decisions:
  - Provider exec: prefer argv; temp-script + interpreter argv for complex cases; no forced `bash -lc`.
  - PM2 manager: use `pm2 start bash -- -lc '<payload>'` with strict cwd/env exporting inside payload.
  - Assume tools preinstalled on snapshot; use scripts to validate/adjust image rather than baking preflight into packages.
- Issues/Risks:
  - PM2 behavior differences across images; need recon scripts to lock semantics.
  - Large file writes may hit payload limits; may require chunking/verify strategy.
- Notes/Links:
  - Morph OpenAPI: `_reference/morph.json`
  - PM2 + Claude patterns: `_reference/pm2-claude-code.ts`
  - OAuth helper: `_reference/cc-oauth.ts`

## 2025-08-26T00:48:10Z — Phase 1 scaffolding start
- Summary: Scaffolded `@repo/runtime-interfaces` (contracts) and `@repo/logger` with tests and docs; verified build/tests via Bun.
- Done:
  - Created packages with ESM, exports, standard scripts, and tsconfig extending `@repo/typescript-config`.
  - Implemented minimal logger with level filtering and child loggers; added unit test.
  - Implemented contracts for commands, processes, provider, process manager, agent, credentials, orchestrator, and error classes; added a compile-time style test using fakes.
  - Added CLAUDE.md for both packages and symlinked AGENTS.md.
  - Adjusted vitest usage to local minimal config to avoid cross-package TS import friction.
  - Verified: `bunx turbo build` succeeds; `bun run test` passes in both packages.
- Next:
  - Phase 2: Scaffold `@repo/providers-morph` with HTTP client skeleton, status mapping, and file IO plan; add unit tests (URL building, status mapping).
  - Phase 3A: Add `@repo/process-shell` with a simple runner and tests.
  - Optionally standardize test configuration import once `@repo/vitest-config` exports a JS entry.
- Decisions:
  - Keep vitest config local for now to avoid Node ESM importing raw TS from another package.
  - Exclude tests from `tsc` build output to keep dist clean and avoid type friction.
- Issues/Risks:
  - Turbo `test` across all packages fails when some packages lack a test script; run tests per-package or add placeholder scripts later.
- Notes/Links:
  - New packages: `packages/runtime-interfaces`, `packages/logger`
  - Build: `bunx turbo build`
  - Tests: `cd packages/logger && bun run test`; `cd packages/runtime-interfaces && bun run test`

## 2025-08-26T01:00:26Z — Monorepo scaffolding expanded
- Summary: Expanded initial scaffolding across core packages and validated builds/lint/tests locally.
- Done:
  - Added packages: `@repo/process-shell`, `@repo/process-pm2` (skeleton), `@repo/agents-claude-cli`, `@repo/credentials`, `@repo/orchestrator`, `@repo/providers-morph` (skeleton), `@repo/claude-oauth` (skeleton).
  - Ensured all packages follow ESM, exports, tsconfig, and scripts conventions; added CLAUDE.md + AGENTS.md symlinks.
  - Implemented orchestrator wiring for boot → credentials → .machine.json → startSession → logs/list.
  - Implemented default credentials installer with atomic writes and optional post-install commands.
  - Implemented PM2 payload construction and list/logs/stop parsing to a basic level.
  - Local builds pass with `bunx turbo build`; package-level tests pass for logger and interfaces.
- Next:
  - Implement Morph provider HTTP client, status mapping, exec, and atomic file I/O with zod validation.
  - Add unit tests for PM2 manager payloads/parsing and Claude agent spec generation.
  - Add orchestrator integration tests with fakes; prepare optional E2E smoke script wiring Morph + PM2 + Claude.
- Decisions:
  - Keep `@repo/providers-morph` and `@repo/claude-oauth` as explicit skeletons until Phase 2/7.
  - Prefer per-package vitest configs for now to avoid cross-package TS config coupling.
- Issues/Risks:
  - Provider exec/file I/O edge cases (payload size, permissions) to be validated during Morph implementation.
- Notes/Links:
  - Package dirs updated under `packages/*`; see CLAUDE.md in each for quickstart and gotchas.
