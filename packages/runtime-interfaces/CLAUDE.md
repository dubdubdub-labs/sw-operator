# @repo/runtime-interfaces

Purpose: Minimal, provider-agnostic contracts and error classes shared across packages. No runtime logic.

Quickstart
```ts
import type { CommandSpec, ProcessSpec } from '@repo/runtime-interfaces';

const cmd: CommandSpec = { kind: 'argv', command: 'echo', args: ['ok'] };
const proc: ProcessSpec = { command: cmd, restart: 'never' };
```

Key Exports
- Types: CommandSpec, ProcessSpec, ExecResult, ExecRunner
- VMProvider (+ instances/files/exec), ProcessManager, Agent
- Credentials: CredentialProfile, CredentialsInstaller
- Orchestrator interface
- Errors: ProviderError, ProcessError, AgentError, CredentialsError, OrchestrationError

Notes
- Paths may be absolute or '~'-prefixed; providers expand '~' to capabilities.homeDir.
- Keep interfaces small and stable; adapters hide provider/PM2 specifics.

Testing
- Type compile via `bunx turbo build` or `bun run typecheck`.

Gotchas
- Do not add concrete provider/PM2/OAuth details here to avoid coupling.

