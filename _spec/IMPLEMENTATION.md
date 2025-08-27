# Implementation Guide (Phase-by-Phase)

This guide expands ARCHITECTURE.md into a concrete, test-first plan for building each package. It focuses on goals, requirements, design choices, error models, and testing (including real E2E smoke with CodeSandbox). No production code is included here.

Use these references while implementing:
- CodeSandbox SDK reference: `_reference/codesandbox.md` (template id: `69vrxg`)
- PM2 + Claude Code command patterns: `_reference/pm2-claude-code.ts`
- Anthropic OAuth helper (PKCE): `_reference/cc-oauth.ts`
- Instant Platform helper (optional): `_reference/instant-platform.ts`

General notes
- Prefer Bun and Turborepo conventions from the repo guidelines.
- In addition to proper unit/integration tests, feel free to write targeted test scripts to debug external services (CodeSandbox, PM2, CLI). We are using a test account — exploratory scripts are encouraged as long as they print clear diagnostics and clean up resources.
- Use the CodeSandbox SDK (and CLI via `npx @codesandbox/sdk`) for quick, manual cross-checks and to investigate error messages while developing.
- Assume required tools are preinstalled on the snapshot (PM2, Claude CLI, python3). Do not bake tool preflight/installation into provider/orchestrator by default; use test scripts to validate and adjust images as needed.
- Test as you go (and ask the user to validate). The goal is not to do this in one shot, but to work thoroughly and ensure we have built a strong foudation before continuing. 
- Update the _spec/PROGRESS.md after major changes

## Global Assumptions

- All packages are ESM, use `@repo/` names, and export types first.
- Standard scripts per package: build/dev/test/lint/lint:fix/typecheck (+ clean if `dist`).
- Strict TypeScript; Biome/Ultracite rules apply (no `any`, no unsafe patterns).
- Logger is lightweight and injected where helpful; never log secrets.
- Paths may include `~`; providers expand it to `capabilities.homeDir`. Also allow overriding `homeDir` via provider configuration to support non-root images.
- Avoid shell quoting pitfalls by using explicit command specs and safe construction.

Environment variables (expected across tests and apps):
- `CSB_API_KEY` — CodeSandbox API key for provider
- `TESTING_TEMPLATE_ID` — default `69vrxg` for E2E smoke
- `CLAUDE_ACCESS_TOKEN` — optional for E2E smoke (or a JSON file path)
- Optional platform vars (kept for later phases): `PLATFORM_TOKEN`, `INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`


## Phase 0 — Repo Setup (once)

- Ensure root has Turbo tasks, Biome config, and base TS configs.
- Create `@repo/typescript-config` and `@repo/vitest-config` if missing.
- Confirm Bun + Turbo flows: `bunx turbo build`, `bunx turbo test`.

Acceptance
- Building and testing no-op packages succeeds.


## Phase 1 — `@repo/runtime-interfaces` (Contracts)

Purpose
- Define the minimal contracts used across all packages; zero implementation.

Requirements
- CommandSpec: two explicit forms
  - argv: `{ kind: 'argv', command: string, args?: string[], cwd?: string, env?: Record<string,string>, name?: string }`
  - shell: `{ kind: 'shell', script: string, cwd?: string, env?: Record<string,string>, name?: string }`
- ProcessSpec: `{ command: CommandSpec, restart?: 'never' | { maxRestarts?: number; minUptimeMs?: number }, instances?: number, maxMemory?: string, logs?: { out?: string; err?: string } }`
- VMProvider: `{ name, version, capabilities?, logger?; instances, files, exec }`
  - instances: `boot/get/list/stop/terminate/fork` → returns normalized `VMInstance` status: `booting|ready|stopping|stopped|error`
  - files: `readFile/writeFile/writeFileAtomic/fileExists/createDirectory/deleteFile/deleteDirectory`
  - exec: `exec(instanceId, CommandSpec)` → `{ stdout, stderr, exit_code }`
  - capabilities: `{ homeDir?: string }` (keep small; extend only if needed)
- ProcessManager: `start/stop/list/logs`
- Agent: `{ name, toProcessSpec(input) }`
- Credential abstractions: `CredentialProfile`, `CredentialsInstaller`
- Orchestrator: `bootAndPrepare/startSession/logs/listProcesses`
- Error classes: `ProviderError`, `ProcessError`, `AgentError`, `CredentialsError`, `OrchestrationError` (with `code`, optional `details`)

Design Notes
- Keep contracts minimal and provider/PM2-agnostic.
- Path semantics: allow absolute or `~`-prefixed paths in CommandSpec/ProcessSpec. Providers MUST expand `~` to `capabilities.homeDir` and normalize to absolute before execution. Callers may pass `~`.

Testing
- Type-only tests: compile-time validation with example specs.
- Optional runtime shims: assert object shapes without external calls.

Acceptance
- Types compile under `strict`; no circular deps.


## Phase 2 — `@repo/providers-codesandbox` (VM Provider)

Purpose
- Implement `VMProvider` using the CodeSandbox SDK for sandbox lifecycle, filesystem, and commands.

Key References
- `_reference/codesandbox.md`

Core Responsibilities
- SDK client wiring with timeout/retry strategy where helpful; validate critical inputs/outputs with zod where appropriate.
- Status mapping across bootup types (`FORK/RESUME/CLEAN/RUNNING`) normalized to `booting|ready|stopping|stopped|error`.
- Exec semantics:
  - Use SDK `commands.run` for one‑shot commands.
  - For multi-step scripts: write a temp script and execute it; avoid fragile inline quoting.
  - Capture complete stdout/stderr and exit code.
- Files API:
  - Use SDK filesystem operations (`fs.writeTextFile`, `fs.readFile`, `fs.readdir`, etc.).
  - Directory ops via SDK; minimize roundtrips with compound operations when reasonable.
  - Virtual file I/O constraints: whole‑buffer operations; practical payload size limits apply; performance dominated by I/O and remote process startup when commands are used.
- Instances API:
  - Create from template (fork), resume/hibernate, restart/shutdown, and list running sandboxes as needed.
  - IMPORTANT: Provider owns readiness. Establish SDK connection; if `bootupType === 'CLEAN'`, run setup steps (see `_reference/codesandbox.md`). Orchestrator must not implement its own polling.
  - Capabilities: `{ homeDir: '/project/workspace' }` by default.

Design Choices
- Use CodeSandbox SDK; no SSH.
- Avoid shell pipes for large writes; use base64 + python.
- Use temp-script pattern for complex commands and clean up afterward.
- Redact secrets in logs; log exit codes and stderr lengths, not contents.

Error Handling
- Map HTTP errors with clear codes and messages:
  - 400 → ValidationError; 401 → AuthenticationError; 404 → NotFoundError; 429 → RateLimitError (parse Retry-After); 5xx → ServerError
- Network/timeout: wrap with `NetworkError`/`TimeoutError` and include operation/context.

Testing
- Unit: status mapping; retry/backoff planner; zod validation errors for our own types.
- Integration (mocked): stub SDK calls; simulate auth/not found/rate limit/server; simulate exec/write success/failure; assert atomic write verification.
- E2E Smoke (real CodeSandbox): see “E2E Smoke: CodeSandbox + PM2 + Claude”.

Acceptance
- Can create/resume (awaits to ready) → exec `echo ok` → atomically write and read a file.
- Clear error boundaries and redacted logs.


## Phase 3 — Process Managers

### 3A — `@repo/process-shell` (Minimal Runner)

Purpose
- Provide a simple ProcessManager that executes the command once via provider exec; not a daemon.

Requirements
- Convert CommandSpec to a shell script only when necessary; execute once; return error on non-zero exit.
- list/logs/stop: no-ops or simple placeholders; document intended limitations.

Testing
- Fake exec runner returning canned outputs; verify env/cwd transforms and error paths.

Acceptance
- Works for quick validations and unit/integration tests without PM2.

### 3B — `@repo/process-pm2` (PM2-backed Manager)

Purpose
- Manage long-running processes via PM2 on the remote VM using the provider’s exec.

Critical PM2 Notes (hard-earned)
- There is no reliable `--cwd`: set cwd inside the bash payload.
- Export env explicitly in the payload; avoid relying on PM2 env flags.
- Use `pm2 start bash --name <name> --no-autorestart -- -lc '<payload>'` for one-shots (this is for PM2; provider exec guidance does not apply here).
- Sanitize process names (alphanumeric + dash), keep < 50 chars.
- Use `pm2 jlist` for JSON; if parsing fails, return a safe default and warn.
- `pm2 logs <name> --nostream --lines <N>`: return raw text if normalization is brittle.

Start Command Construction
- If spec.kind === shell: payload is `cd <cwd> && export K=V ... && <script>`.
- If spec.kind === argv: payload is `cd <cwd> && export ... && <cmd> <args...>` with JSON-stringified args joined by spaces.
- Full command: `["pm2", "start", "bash", "--name", <nameIfAny>, "--no-autorestart", "--", "-lc", <payload>]` (omit `--name` if none).

Other Operations
- list: `pm2 jlist` → map to ProcessInfo.
- logs: `pm2 logs [name] --nostream --lines N` → `{ out, err }` as raw strings.
- stop: `pm2 stop <nameOrId>` → error on non-zero exit.

Testing
- Fake exec runner: scripted outputs for `pm2 start`, `pm2 jlist`, `pm2 logs`, `pm2 stop`.
- Validate payload building for both argv/shell; verify cwd/env handling; name sanitization.

PM2 Recon Scripts
- Before finalizing the PM2 implementation, write and run small diagnostic scripts against the target snapshot to confirm:
  - How `cd` and env export behave inside the PM2 payload
  - Whether `pm2 jlist` returns well-formed JSON (and failure modes)
  - Log output shape for `pm2 logs --nostream`
  - Name collision behavior and namespace considerations
Use the findings to adjust command construction and parsing.

Acceptance
- Starts a process that produces logs; list/logs/stop behave as expected.


## Phase 4 — `@repo/agents-claude-cli` (Agent)

Purpose
- Convert session inputs (prompt, systemPrompt, model, env) into a portable ProcessSpec for Claude CLI.

Reference
- PM2 + Claude command patterns: `_reference/pm2-claude-code.ts`

Requirements
- Base64-encode prompt and systemPrompt to avoid shell quoting issues.
- Produce a shell ProcessSpec with a safe name like `cc-<sanitized(sessionName)>`.
- Defaults: model = `sonnet`, cwd = `/project/workspace/operator/sw-compose` (or from provider capabilities), restart = `never`.
- Avoid embedding secrets; do not pass API keys via env unless explicitly provided (prefer credentials file).
- Reminder: `claude -p` reads the prompt from stdin; the agent/process manager must pipe/echo the base64-decoded prompt into stdin for reliability.

Testing
- Validate ProcessSpec content: payload form, base64 operations, naming, cwd default.

Acceptance
- Returns a correct ProcessSpec that PM2 manager can run.


## Phase 5 — `@repo/credentials` (Installers)

Purpose
- Provide `CredentialsInstaller` and helpers for common credential profiles (Claude credentials file first).

References
- OAuth helper: `_reference/cc-oauth.ts`
- PM2 credentials command: `_reference/pm2-claude-code.ts` (shape of `.credentials.json`)

Requirements
- `DefaultCredentialsInstaller`:
  - Create directories with mode if provided.
  - Atomically write files with mode (600 for secrets) using `writeFileAtomic({ createDirs: true })` to minimize roundtrips.
  - Optional `postInstall` CommandSpec (e.g., to validate installed credentials). Run via provider.exec.
- Claude credential profile helper (optional): build a `CredentialProfile` given a token and expiry that writes `${homeDir}/.claude/.credentials.json` (mode 600).
- Logging: redact tokens; log only sanitized lengths and paths.

Testing
- Fake provider: assert sequence (mkdir → writeAtomic → optional chmod if not in atomic → postInstall).
- Negative tests: write failure becomes a CredentialsError with path context.

Acceptance
- Writes and verifies credentials atomically; honors mode; optional post-install runs.


## Phase 6 — `@repo/orchestrator`

Purpose
- Compose provider + process manager + agent + installers into simple, server-ready actions.

Requirements
- `bootAndPrepare(snapshotId, { ttl_seconds?, ttl_action?, credentialProfiles?, machineInfo? })`:
  - Boot and await until provider reports ready. Do NOT implement client-side polling here if provider `boot` already awaits readiness.
  - Install all credential profiles via installer(s).
  - Write `${homeDir}/.machine.json` with `{ ...machineInfo, createdAt }` and mode `640` (600 if single-user-only).
  - Return `{ instanceId, capabilities }`.
- `startSession(instanceId, input)`:
  - `agent.toProcessSpec(input)` → `processManager.start()` → return `{ processName }`.
- `logs(instanceId, name?, lines?)` → delegate to process manager.
- `listProcesses(instanceId)` → delegate to process manager.

Error Handling
- Wrap failures with context (instanceId, operation, hints like “PM2 not installed”, “credentials missing”).
- Emit structured events via logger at each step (boot_started, boot_ready, creds_installed, session_started, session_error, etc.).

Testing
- Fakes for provider/process manager/agent/installer: cover success and failure paths, and ordering.

Acceptance
- Full flow (with fakes) passes: bootAndPrepare → startSession → logs.


## Optional Utilities (Later)

- `@repo/claude-oauth`: Thin wrapper around `_reference/cc-oauth.ts` to generate/exchange/refresh tokens.
- `@repo/instant-platform-service`: Keep decoupled; used by apps/servers when needed.


## E2E Smoke: CodeSandbox + PM2 + Claude

Goal
- Validate the end-to-end path on a real CodeSandbox sandbox and confirm PM2 + Claude CLI runs with installed credentials.

Prereqs
- Environment:
  - `CSB_API_KEY` set
  - `TESTING_TEMPLATE_ID` set (defaults to `69vrxg` if unspecified)
  - One of:
    - `CLAUDE_ACCESS_TOKEN` (OAuth token or Anthropic key) with a reasonable expiry; or
    - A token file JSON accessible to the app that can be embedded into the credentials file
- Snapshot should include PM2 and Claude CLI (or ensure install steps exist before session start).

Procedure
- Provider: create CodeSandbox provider with `apiKey` and default `homeDir=/project/workspace`.
  - Boot: create sandbox from `TESTING_TEMPLATE_ID` (fork) and connect via SDK; if `bootupType === 'CLEAN'`, run setup steps before proceeding.
- Preflight checks (via exec):
  - `which pm2` and `pm2 -v` → if missing, surface actionable error.
  - `which claude` and `claude --version` → warn if missing; PM2 basics can still be tested.
- Credentials:
  - Build a Claude credential profile writing `${homeDir}/.claude/.credentials.json` (mode 600) with token + expiry.
  - Read file back and log sanitized content (mask tokens) to verify.
- File-IO semantics:
  - Create a separate smoke script to write/read JSON and binary files to `${homeDir}` and other common paths, verifying content integrity and permissions.
- Agent session:
  - Create Claude agent spec for a tiny prompt (e.g., “Say hi”).
  - Start via PM2 manager; wait a few seconds; fetch logs with `pm2 logs <name> --nostream --lines 100`.
  - Verify logs contain CLI output; not only errors.
- Cleanup:
  - Optionally stop/delete the PM2 process; stop/terminate instance per policy.
- Extra diagnostics:
  - Use the SDK or `npx @codesandbox/sdk` CLI to probe operations and compare outputs when diagnosing issues.

Troubleshooting
- PM2 cwd/env: never rely on `--cwd`; embed `cd <cwd> && export ...` inside payload.
- Provider exec: avoid fragile inline quoting; prefer SDK commands and temp scripts for multi‑step flows.
- If `pm2 jlist` parsing fails, return an empty list and warn.
- If files appear missing after writes, immediately read back; throw on empty/missing content.
- If CLI auth fails, verify file path, permissions (600), and JSON structure per `_reference/pm2-claude-code.ts`.


## Error Model (Cross-Cutting)

Principles
- Always return actionable messages with context (operation, instanceId, process name, command form).
- Never leak secrets; mask tokens and redact env values in logs and errors.
- Wrap external failures (HTTP, PM2, exec) into our standardized errors.

Recommended Codes (examples)
- `AUTHENTICATION_ERROR`, `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMIT`, `SERVER_ERROR`, `NETWORK_ERROR`, `TIMEOUT`
- `PROCESS_ERROR`, `FILE_IO_ERROR`, `ORCHESTRATION_ERROR`

Context Fields
- `operation`: e.g., `instances.boot`, `files.writeFileAtomic`, `pm2.start`
- `resource`: e.g., `instance:<id>`, `file:<path>`, `process:<name>`
- `attempt`/`maxAttempts` for retried ops
- `hint`: remediation guidance when known


## Logging & Observability

- Use child loggers per package (CodeSandbox, PM2, Agent, Orchestrator, Credentials).
- Levels: `info` for lifecycle, `debug` for command construction (without secrets), `warn` for retries, `error` for failures.
- Emit event objects from orchestrator for future persistence.
- Manual test scripts are encouraged in addition to automated tests; log clear diagnostics and cleanup steps.


## CI & Local Testing Strategy

- Unit tests: run by default on every PR (no network).
- Integration tests: mocks/stubs only (fast, deterministic).
- E2E smoke: opt-in via env guard (e.g., `RUN_E2E=1`); requires `CSB_API_KEY`; ensure cleanup.
 - Shared Vitest config: import { extendVitestConfig } from `@repo/vitest-config`; for UI packages override `environment: 'jsdom'`.
- For packages without tests, use `vitest --passWithNoTests` so `bunx turbo test` remains green.
- Later: optional local provider (Docker/subprocess) for full local flows without cloud.


## Package Acceptance Checklists (Recap)

- runtime-interfaces: Minimal types; strict TS; example usage compiles.
- providers-codesandbox: Create/resume awaits ready; exec works; atomic write + verify; robust error mapping.
- process-shell: One-shot start works; errors surface; limitations documented.
- process-pm2: Start payload correct; list/logs/stop work; name sanitize; cwd/env handled in payload; no `--cwd` reliance.
- agents-claude-cli: Correct ProcessSpec; base64 handling; sensible defaults; no secrets in spec.
- credentials: Atomic install with mode; optional post-install; logs redacted.
- orchestrator: Full flow with fakes; events emitted; E2E passes on CodeSandbox template.

## TypeScript Build Hygiene

- Typecheck scope (`tsconfig.json`): include tests and config files (e.g., `vitest.config.ts`). Set `rootDir: .` so config is within the program.
- Build scope (`tsconfig.build.json`): set `rootDir: ./src` and exclude tests and config to avoid emitting them.
- Maintain type-only tests for `@repo/runtime-interfaces` to enforce exhaustive mappings and contract shape at compile time.


---
Implement step-by-step with tests first, keep scope tight, and use targeted test scripts to diagnose external issues quickly.

## Package Docs (CLAUDE.md)

For every package, create a dense `CLAUDE.md` (symlink `AGENTS.md` → `CLAUDE.md`) with:
- Purpose: 1–2 sentences.
- Quickstart: minimal snippet using the main API.
- Key exports: short bullets for types/interfaces/classes.
- Errors: possible error classes and typical causes.
- Testing: how to run, notable fakes/doubles.
- Gotchas: cwd/env semantics, path handling (including `~`), PM2 quirks, etc.

Guidelines: keep it < 1 page
