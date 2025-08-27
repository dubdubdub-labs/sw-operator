# Progress Log (Append-Only)

This is an append-only implementation log. Append new entries at the end with a timestamp. Keep entries dense and precise.

Entry format
- Datetime: UTC ISO8601 from `date -u +%Y-%m-%dT%H:%M:%SZ`
- Summary: 1–2 lines
- Sections: Done / Next / Decisions / Issues / Notes

---

2025-08-27T18:28:17Z — Scaffolded core base packages and aligned config usage
- Done:
  - Created `@repo/runtime-interfaces` (contracts, errors, tests, docs; `AGENTS.md` symlinked).
  - Created `@repo/logger` (no-deps logger, tests, docs; `AGENTS.md` symlinked).
  - Updated tsconfigs to extend `@repo/typescript-config/base.json`; include `vitest.config.ts`; add `types: ["vitest/globals"]`.
  - Switched Vitest configs to `import { extendVitestConfig } from '@repo/vitest-config'`.
- Next:
  - Add `@repo/process-shell` and `@repo/process-pm2` skeletons with tests.
  - Implement `@repo/providers-codesandbox` adapter scaffolding and fakes.
- Decisions:
  - Use shared config packages via package imports (no relative paths).
  - Split build vs typecheck (`tsconfig.build.json` excludes tests/config).
- Issues:
  - Initial `bun install` failed resolving some `catalog:` entries; required retry.
- Notes:
  - Paths: `packages/runtime-interfaces`, `packages/logger`, `packages/vitest-config`, `packages/typescript-config`.

---

2025-08-27T18:37:14Z — Typechecked, tested, linted; added process managers
- Done:
  - Ran `bunx turbo typecheck`, `bunx turbo test`, `bunx turbo lint` successfully.
  - Implemented `@repo/process-shell` with tests and docs; list/logs/stop no-ops; conforms to interfaces and lint rules.
  - Implemented `@repo/process-pm2` with payload construction, list/logs/stop, tests for argv/shell payload.
  - Fixed Biome issues (no-empty blocks, block statements, `at()` instead of indexes, avoid async-without-await, formatting/sorting).
- Next:
  - Scaffold `@repo/agents-claude-cli` and `@repo/credentials` per spec, with tests.
  - Begin provider adapter skeleton for CodeSandbox.
- Decisions:
  - Process managers accept injected `ExecAPI`; avoid provider coupling.
  - Enforce sanitized process names and explicit argv payload construction.
- Issues: None blocking locally.
- Notes: `packages/process-shell`, `packages/process-pm2`.

---

2025-08-27T18:47:50Z — Added agents-claude-cli and credentials; repo green
- Done:
  - Implemented `@repo/agents-claude-cli` (base64 prompts, safe names, defaults). Tests + docs.
  - Implemented `@repo/credentials` (atomic writes with `createDirs`, postInstall) and Claude profile helper. Tests + docs.
  - Resolved Biome issues (no-await-in-loop, nested ternary, async-without-await in fakes, formatting).
  - Ran `bunx turbo build`, `typecheck`, `test`, `lint` successfully across all current packages.
- Next:
  - Scaffold `@repo/providers-codesandbox` adapter (interfaces + fakes) and `@repo/orchestrator`.
- Decisions:
  - Agents remain PM2/provider agnostic; PM2 consumes `command.name`.
  - Credentials installer parallelizes writes via `Promise.all` with per-file error mapping.
- Issues: None currently; provider SDK integration will introduce network deps and zod validation.
- Notes: `packages/agents-claude-cli`, `packages/credentials`.

---

2025-08-27T18:59:12Z — scaffolded provider + orchestrator
- Done:
  - Implemented `@repo/providers-codesandbox` skeleton with status mapping, stubs for files/exec, tests, docs.
  - Implemented `@repo/orchestrator` with `bootAndPrepare` (machine info write + optional creds), `startSession`, `logs`, `listProcesses`.
  - Ensured monorepo passes `bunx turbo build`, `typecheck`, `test`, `lint` across all packages.
- Next:
  - Flesh out CodeSandbox provider with SDK wiring (instances/files/exec) + zod validation and fakes.
  - Add orchestrator integration tests with richer fakes and evented logging.
- Decisions:
  - Provider methods return explicit Promises; unimplemented ops reject with `ProviderError`.
  - Orchestrator parallelizes credential installs with `Promise.all`.
- Issues:
  - `bun install` can fail on `catalog:` resolution intermittently; avoid adding new external deps until necessary.
- Notes:
  - Paths: `packages/providers-codesandbox`, `packages/orchestrator`, `problems.md`.
