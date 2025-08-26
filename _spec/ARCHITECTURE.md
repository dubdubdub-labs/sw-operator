# From‑Scratch Architecture and Implementation Guide

This guide defines a clean, modular, testable architecture for a new Turborepo that orchestrates coding agents on remote VMs. It emphasizes separation of concerns, pragmatic interfaces, and incremental validation. It is self‑contained and does not rely on any previous code in this repository. Where external behavior is required, use the reference materials in `_reference/` as the source of truth:

- Morph API (OpenAPI): `_reference/morph.json`
- Anthropic/Claude OAuth helper (PKCE): `_reference/cc-oauth.ts`
- PM2 + Claude Code command patterns: `_reference/pm2-claude-code.ts`
- Instant Platform (ephemeral DB) example: `_reference/instant-platform.ts`


## Objectives and Constraints

- Pluggable choices along three axes:
  - VM providers (e.g., Morph; others later)
  - Process managers (PM2; or a simple shell runner for tests)
  - Coding agents (Claude CLI now; others later)
- Strong separation of concerns with minimal interfaces between layers.
- Deterministic, testable units; add integration tests that run without any cloud access by using test doubles.
- Bun for scripts and tooling; all packages ESM; strict TypeScript; Biome/Ultracite linting.
- Consistent package layout, exports, scripts, and base configs for easy Turbo orchestration.
- Safe remote operations: explicit command specs, atomic file writes, and clear error handling.
- Built‑in logging that is lightweight and easy to swap or silence.


## System Overview

Conceptually, four pieces collaborate at runtime:

1) VM Provider
- Abstracts a remote compute API (e.g., Morph). Provides instance lifecycle, file IO, and one‑shot command execution.
- Hides provider nuances (e.g., status mapping, TTL semantics) behind a small, stable interface.

2) Process Manager
- Manages long‑running processes on a remote machine using the provider’s exec/file primitives.
- PM2 implementation for production; a simple shell implementation for tests and minimal flows.

3) Agent
- Converts a high‑level session input (prompt, model, env) into a runnable process spec (command + restart policy).
- Has no knowledge of providers or PM2.

4) Orchestrator
- A thin coordinator that composes the three, adds credential installation, and exposes simple actions suitable for server endpoints.
- Emits structured events and maps errors; no internal persistence.

High‑level flow (Claude example):
- Boot VM from a snapshot → wait for ready → install credentials → write machine info → start agent process via process manager → inspect logs and status.


## Key Design Principles

- Minimal interfaces: keep contracts small and stable; adapt provider/PM2 specifics inside adapters.
- Explicit commands: represent commands as either argv or shell with cwd/env captured; never build opaque strings at call sites.
- Atomic writes: upload credentials/configs with atomic semantics and post‑write verification.
- Observability first: consistent log context and error codes; return useful details without leaking secrets.
- Test in layers: unit tests for pure logic, adapters tested with doubles, end‑to‑end smoke constrained to local or a single provider when explicitly opted in.


## Package Map (New Monorepo)

Follow the package structure and scripts conventions described in the monorepo guidelines. Each package below lists responsibilities, exports, dependencies, and acceptance tests. Use `catalog:` and `workspace:*` appropriately.

0) `@repo/logger`
- Purpose: Lightweight, dependency-free logger with child loggers and leveled methods (`debug/info/warn/error`).
- Responsibilities: Provide a minimal interface consumed by providers, process managers, agents, and orchestrator; never log secrets.
- Exports: `createLogger({ name, level? })`, `child({ name? })`, and a no-op logger for tests.
- Dependencies: none (runtime); dev: TypeScript, vitest.
- Tests: basic unit tests to verify child scoping and level filtering.

1) `@repo/runtime-interfaces`
- Purpose: Type‑only contracts for cross‑package interaction.
- Exports:
  - CommandSpec: two forms
    - argv: `{ kind: 'argv', command: string, args?: string[], cwd?: string, env?: Record<string,string>, name?: string }`
    - shell: `{ kind: 'shell', script: string, cwd?: string, env?: Record<string,string>, name?: string }`
  - ProcessSpec: `{ command: CommandSpec, restart?: 'never' | { maxRestarts?: number; minUptimeMs?: number }, instances?: number, maxMemory?: string, logs?: { out?: string; err?: string } }`
  - VMProvider: `{ name, version, capabilities?, logger?; instances, files, exec }`
    - instances: `boot/get/list/stop/terminate/fork`
    - files: `readFile/writeFile/writeFileAtomic/fileExists/createDirectory/deleteFile/deleteDirectory`
    - exec: `exec(instanceId, CommandSpec) -> { stdout, stderr, exit_code }`
  - ProcessManager: `start/stop/list/logs`
  - Agent: `{ name, toProcessSpec(input) }`
  - Credentials: `CredentialProfile`, `CredentialsInstaller`
  - Orchestrator: `bootAndPrepare/startSession/logs/listProcesses`
  - Error classes: `ProviderError`, `ProcessError`, `AgentError`, `CredentialsError`, `OrchestrationError`
- Dependencies: dev only (TypeScript, vitest). No runtime deps.
- Tests: types compile; sample narrowing tests; no runtime assertions needed.
 - Notes: Path semantics allow absolute or `~`-prefixed paths; providers expand `~` to their `capabilities.homeDir`.

2) `@repo/providers-morph`
- Purpose: Implement `VMProvider` using Morph API.
- References: `_reference/morph.json` for endpoints and types.
- Responsibilities:
  - HTTP client with retry, timeout, and zod validation for Morph responses.
  - Map Morph instance/snapshot statuses to provider‑agnostic statuses.
  - Implement `exec(instanceId, spec)` using direct argv where possible. For multi-step scripts, write a temp script and invoke the interpreter directly (argv). Avoid appending `bash -lc` in provider exec calls.
  - Implement atomic file IO: base64 + decode or python helper, then chmod/chown; verify existence and non‑empty content.
  - `capabilities.homeDir = '/root'` (override with provider metadata if available).
- Exports:
  - `createMorphProvider({ apiKey, baseUrl?, timeout?, logger? })`
  - Types for configuration (no leaks of Morph‑specific model types on public API)
- Dependencies:
  - `zod` (catalog), `@repo/runtime-interfaces` (workspace), `@repo/logger` (workspace)
- Tests:
  - Unit: URL building, status mapping, atomic write plan assembling.
  - Integration (mocked): HTTP stubs for list/boot/get/exec endpoints; file write verification; error mapping (401/404/429/5xx).
  - Optional real smoke (flagged): environment‑guarded test to run a no‑op command on a real instance.

3) `@repo/process-pm2`
- Purpose: ProcessManager backed by PM2 CLI, executed remotely via provider exec.
- Responsibilities:
  - Convert `CommandSpec` to a PM2 `start` command.
  - Use `pm2 jlist` for JSON listing; `pm2 logs --nostream` for logs; handle non‑zero exits with actionable errors.
  - Never rely on inline env in PM2 flags when it’s fragile; prefer exporting env in the shell payload.
- Exports:
  - `PM2ProcessManager(execRunner: ExecRunner)` where `execRunner` is `(instanceId, CommandSpec) -> ExecResult` from the selected provider.
- Dependencies: `@repo/runtime-interfaces`
- Tests:
  - Unit: command construction covers name, restart policy, cwd/env, and argv vs shell forms.
  - Integration: fake `execRunner` returning canned PM2 responses; list/logs parsing.

4) `@repo/process-shell`
- Purpose: Minimal ProcessManager that runs commands directly (non‑daemonized), for tests and simple flows.
- Responsibilities: Convert to shell, run once via `execRunner`, return results; list/logs are no‑ops.
- Exports: `ShellProcessManager(execRunner)`
- Tests: execution path and error handling with fake runner.

5) `@repo/agents-claude-cli`
- Purpose: Provide an Agent for Claude CLI (Claude Code) sessions.
- Responsibilities:
  - `toProcessSpec(input)`: return a `ProcessSpec` using base64 to safely pass prompt/systemPrompt; set cwd to provider home‑relative working directory (e.g., `/root/operator/sw-compose`).
  - Expose sensible defaults (model, cwd) with options.
- Exports: `createClaudeAgent({ defaultModel?, workDir? })`
- Tests: spec builder correctness; naming sanitize; env merge.

6) `@repo/credentials`
- Purpose: Reusable installer(s) for credential profiles.
- Responsibilities:
  - Define `CredentialProfile` shape and a default `CredentialsInstaller` that writes files atomically, creates dirs, applies modes, and runs optional validation commands.
  - Provide helpers for common files (e.g., `${homeDir}/.claude/.credentials.json`).
- Exports: `DefaultCredentialsInstaller`, profile helpers (optional)
- Tests: installer orchestrates file writes and modes using a fake provider.

7) `@repo/claude-oauth` (optional but recommended)
- Purpose: A thin adapter around the reference OAuth PKCE helper to obtain/refresh tokens.
- Responsibilities: No storage; just functions to generate URL, exchange code, refresh; return typed credentials.
- Exports: `generateSignInURL()`, `exchangeOAuthToken()`, `refreshAuthToken()`, `isTokenExpired()`
- Tests: none beyond simple unit tests; real flows are manual due to OAuth.

8) `@repo/instant-platform-service` (optional utility)
- Purpose: Wrap creation of ephemeral databases using the Instant Platform API.
- Scope: small helper used by apps; not coupled to orchestration.
- Tests: response shape validation via zod; error mapping.

9) `@repo/orchestrator`
- Purpose: Compose provider + process manager + agent + credentials installers into a tiny, server‑friendly API.
- Responsibilities:
  - `bootAndPrepare(snapshotId, { ttl_seconds?, ttl_action?, credentialProfiles?, machineInfo? })`
    - Boot (awaits until ready; no client-side polling)
    - Install each credential profile (via installer and provider.files)
    - Write `${homeDir}/.machine.json` with passed metadata and `createdAt` timestamp (mode `640`; use `600` for single-user-only)
  - `startSession(instanceId, input)` → call `agent.toProcessSpec(input)` and `processManager.start()`
  - `logs(instanceId, name?, lines?)` → processManager.logs
  - `listProcesses(instanceId)` → processManager.list
  - Emit `RuntimeEvent`s (hook up to logger; ready for future persistence)
- Exports: `createOrchestrator(deps)`
- Tests: all orchestration paths with fake provider/process manager/agent/installer.


## Interfaces (Natural Language Contract)

- CommandSpec: a remote command is either:
  - argv: exact program + args; provider executes without an extra shell when safe.
  - shell: a script executed with `bash -lc`, with cwd/env exported explicitly.
  - Providers must sanitize/quote as needed when assembling the final call.

- VMProvider responsibilities:
  - instances: `boot/get/list/stop/terminate/fork` returning normalized `VMInstance` with status among `booting|ready|stopping|stopped|error`.
  - files: high‑level operations that succeed or throw; `writeFileAtomic` must ensure:
    - parent dir exists (create if asked),
    - write in an atomic fashion,
    - chmod/chown optional,
    - verification step (exists + non‑empty),
    - return only on success.
  - exec: execute a single command and return `{ stdout, stderr, exit_code }`.
  - Path semantics: callers may use `~` in paths; providers must expand it to `capabilities.homeDir`.
  - capabilities: include `homeDir` when known; allow overriding via provider configuration for non-root images.

- ProcessManager responsibilities:
  - start: turn `ProcessSpec` into a long‑lived process (PM2) or one‑shot (shell), returning on success or throwing with details.
  - list/logs/stop: normalized outputs and errors; never leak PM2 raw formatting.

- Agent responsibilities:
  - Statelesly transform a high‑level session description into a portable `ProcessSpec`.
  - Use base64 to move large/multiline prompts safely.

- CredentialsInstaller responsibilities:
  - Create directories first (mode optional) → atomically write files (mode required when secret) → optional post‑install command → throw on failure.


## Error Handling and Logging

- Error classes with codes:
  - ProviderError, ProcessError, AgentError, CredentialsError, OrchestrationError
  - Include context (e.g., instanceId, process name, action) and a user‑readable message; attach a `details` object when it helps.
- Logging:
  - Logger interface with `trace|debug|info|warn|error|fatal` and `child({ prefix, context })`.
  - Avoid logging secrets (mask tokens before logging); provide a debug flag to emit verbose command construction without sensitive data.
  - Each package should create its own child logger using a clear prefix (e.g., `Morph`, `PM2`, `Orch`, `Agent`).


## Implementation Plan (Phased, Test‑First)

Phase 0: Repo Scaffolding
- Create the Turborepo root with Bun, Biome/Ultracite, and Turbo tasks from the guidelines.
- Add `@repo/typescript-config` and `@repo/vitest-config` base packages.

Phase 1: Contracts
- Implement `@repo/runtime-interfaces` only (types, no logic).
- Add minimal unit tests that validate example usage and compile under strict TS.

Phase 2: Provider (Morph)
- Build `@repo/providers-morph` that:
  - Implements a small HTTP client (fetch) with timeout and retry (exponential backoff) and zod validation against `_reference/morph.json`.
  - Implements exec using direct argv; for multi-step scripts, write a temp script and invoke the interpreter directly (argv), avoiding forced `bash -lc`.
  - Implements robust file IO:
    - writeFile: use python base64 or heredoc; escape correctly.
    - writeFileAtomic: create parent dir (optional), write, chmod/chown, verify.
  - Unit/integration tests cover URL building, status mapping, file write/verify, error mapping.

Phase 3: Process Managers
- `@repo/process-shell`: minimal runner using the provider exec; unit tests only.
- `@repo/process-pm2`: PM2 CLI wrapper using `pm2 start bash -- -lc <payload>`, `pm2 jlist`, `pm2 logs --nostream` (validate exact behavior with diagnostic test scripts first).
  - Tests with a fake exec runner returning canned outputs; verify start/list/logs parse and error paths.

Phase 4: Agent (Claude CLI)
- `@repo/agents-claude-cli`: transform session inputs to a `ProcessSpec` with base64 prompts, safe names, sensible defaults.
- Unit tests for spec construction; no remote calls.

Phase 5: Credentials
- `@repo/credentials`: `DefaultCredentialsInstaller` that uses provider.files to create dirs and write files atomically, then optional post‑install.
- Unit tests with fake provider verifying sequence and options.

Phase 6: Orchestrator
- `@repo/orchestrator`: `bootAndPrepare`, `startSession`, `logs`, `listProcesses`.
- Provider owns readiness; do not add an orchestrator polling helper. Emit structured events via logger.
- Integration tests with fakes for provider, process manager, agent, installer.

Phase 7: Optional Utilities
- `@repo/claude-oauth`: wrap the reference PKCE helper (no storage; just functions); unit tests for non‑network parts.
- `@repo/instant-platform-service`: zod‑validated helper; unit tests for shape.

Phase 8: App/CLI (optional for manual testing)
- A small `apps/cli` that wires dependencies via DI, reads env for keys, and exercises orchestrator actions.


## Testing Strategy (What to Validate at Each Phase)

- Contracts:
  - Types compile and are ergonomic to use; add a few generic tests to prevent regressions (e.g., exhaustive status mappings).

- Provider (Morph):
  - URL builder produces correct query params (including deep object e.g., `metadata[key]=value`).
  - Status mapping is exhaustive (pending→booting, ready→ready, paused→stopped, saving→stopping, error→error).
  - Readiness signal: Morph instance status `ready` (from GET instance); no SSH/HTTP probes in provider; optional post-ready exec check can be added later if needed.
  - Error mapping: 400→validation, 401→auth, 404→not found, 429→rate limit, 5xx→server; include parsed body when available.
  - File IO writes and verifies content; fallback path exercised (e.g., write/verify failure throws actionable error).
  - Exec argv vs shell: for provider exec, prefer argv; avoid forcing `bash -lc`. PM2 payloads can use `bash -lc` inside PM2 itself.

- PM2 manager:
  - Start command covers name, `--no-autorestart`, `--` separator, and payload quoting.
  - List and logs parsing are robust; non‑zero exits return actionable errors.
  - Before finalizing command construction, run PM2 investigation scripts on the target image to confirm cwd/env handling, naming, and log semantics.

- Agent (Claude):
  - Prompt/system prompt are base64‑encoded safely; session names sanitized; cwd default is configurable.

- Credentials installer:
  - Creates dir(s) with mode when provided; writes files atomically with mode; runs optional post‑install; sequence enforced.

- Orchestrator:
  - Provider ensures readiness (no client-side polling); credential installation invoked; machine info written; errors captured with context.

Coverage goals: Focus on correctness over percentage. Each public function should have at least one test that demonstrates the success path and one test for a representative failure path.


## Operational Runbook (Local Manual Verification)

Prereqs
- Bun installed; `turbo` installed globally.
- A Morph API key for real smoke tests (optional).
- A Claude OAuth token JSON or an Anthropic API key (use the OAuth helper in `reference/cc-oauth.ts` to obtain one if needed).

Local commands
- `bunx turbo build` → typecheck and build all packages.
- `bunx turbo test` → run tests.
- `bunx turbo dev` → iterative build for packages you’re editing.

Manual smoke (optional, requires Morph):
- Wire provider = Morph, process manager = PM2, agent = Claude.
- Boot from a known snapshot, install credentials profile that writes `${homeDir}/.claude/.credentials.json` with `600` mode.
- Verify with `provider.files.readFile()` that the file exists and is non‑empty, and print sanitized contents for debug.
- Start a session; fetch logs; confirm output appears.
- Run a standalone file-IO test script to write/read JSON and binary content, verifying permissions and integrity.

Debug tips
- If files “don’t appear”, run a round‑trip read immediately after write; fail fast with the stderr from the provider exec.
- Avoid shell pipes in remote exec for writes; prefer base64 + decode or python helpers.
- If PM2 start fails, echo the exact argv we constructed (without secrets) and try running it interactively via provider.exec to isolate quoting issues.
- Boot returns when the instance is ready (provider ensures this); no client-side polling.


## Package Setup Conventions (apply to each package)

- package.json
  - `"name": "@repo/<package-name>"`
  - `"type": "module"`
  - `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`
  - Scripts:
    - build/dev/test/lint/lint:fix/typecheck as per repo guidelines
    - `clean` for packages producing `dist`
  - Dependencies: use `catalog:` and `workspace:*`

- tsconfig.json
  - extends `@repo/typescript-config/base.json`
  - compilerOptions: `outDir: dist`, `rootDir: src`, `declaration: true`, `declarationMap: true`

- vitest.config.ts (if tests)
  - extend `@repo/vitest-config/base`

- Errors
  - Create dedicated error classes under `src/errors/` with codes and helpful messages.
  - Export errors from `errors/index.ts`.

- Linting
  - Follow Ultracite rules: strict TS, no `any`, no unsafe patterns; prefer for‑of, object spread, etc.

## Package Docs (CLAUDE.md)

Each package must include a dense, focused `CLAUDE.md`, symlinked from `AGENTS.md`. Keep it short and high signal.
- Purpose: 1–2 sentences describing the package’s role.
- Quickstart: minimal snippet showing how to import and use the main API.
- Key Types/Interfaces: bullets for the most important exports.
- Errors: what error classes can be thrown and when.
- Testing: how to run tests and notable fakes/doubles.
- Gotchas: 3–5 bullets on pitfalls (cwd/env, path semantics, PM2 quirks, etc.).

Guidelines
- Be concise (aim for < 1 page). No narration, just essentials.
- Link to `_reference/*` where relevant.
- Update when public API changes; the file is a contract to users of the package.


## Reference Integration Notes

- Morph API
  - Build a small typed client around the endpoints you need (images, snapshots, instances, exec, http exposure if needed).
  - Use zod schemas that mirror `_reference/morph.json` fields; validate all responses at runtime.

- Claude OAuth
  - Use `_reference/cc-oauth.ts` to implement `@repo/claude-oauth` or call it directly in app code.
  - Store tokens locally (developer machine) only for manual test flows; do not bake secrets into code.

- PM2 + Claude Code
  - Shell payloads should follow the pattern in `_reference/pm2-claude-code.ts`: safe base64 for user prompts, `--no-autorestart` when appropriate, and sanitized process names.
  - Use `bash -lc` inside PM2 to ensure login shell PATH/rcfiles on the target image.
  - Reminder: `claude -p` reads from stdin; pipe the decoded prompt into stdin to avoid quoting issues.

- Instant Platform
  - Keep the helper package thin and decoupled; only call it from app/server layers, not from orchestrator core.


## Acceptance Checklist (Before Integrations)

- Contracts:
  - CommandSpec/ProcessSpec are documented; examples compile in tests.

- Provider:
  - Can boot (resolves when ready), run `echo ok`, write a small file atomically, and read it back.
  - Clear error boundaries: auth error, validation error, not found, rate limit, server error.

- PM2 manager:
  - Can start a trivial process (`bash -lc 'echo hello'`) and retrieve logs.

- Agent:
  - Generates a valid ProcessSpec; prompts encoded; names sanitized; cwd set.

- Credentials installer:
  - Creates dir, writes credentials with mode 600, and verifies content.

- Orchestrator:
  - End‑to‑end (with fakes): bootAndPrepare → startSession → logs returns data.


## Future Extensions (Out of Scope Now)

- Additional providers (e.g., other VM APIs) via the same `VMProvider` contract.
- Additional agents (e.g., Codex CLI) via the `Agent` contract.
- Rich event storage and UI: persist orchestrator events in an ephemeral or remote DB; build a UI on top.
- Health checks and dependency installers (preflight checks for `pm2`, `claude`, `bun`, etc.).


---
This document is the single source of truth for the initial build. Implement packages in the order above, write tests as you go, and treat provider/PM2 specifics as adapter concerns behind the small interfaces described here. Keep changes small, verify each step, and favor explicit, observable behavior over implicit conventions.
