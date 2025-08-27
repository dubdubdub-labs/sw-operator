# `@repo/runtime-interfaces`

Purpose
- Type-only contracts used across packages: command specs, process specs, provider/process manager/agent interfaces, and standardized error classes.

Quickstart
- Import types to author adapters without runtime coupling.

```
import type { CommandSpec, ProcessSpec, VMProvider } from "@repo/runtime-interfaces";
```

Key Exports
- `CommandSpec`: `{ kind: 'argv' | 'shell', ... }` with `cwd` and `env`.
- `ProcessSpec`: command plus restart policy, instances, and log targets.
- `VMProvider`: `instances`, `files`, `exec` plus `capabilities.homeDir`.
- `ProcessManager`: `start/stop/list/logs` using provider exec.
- `Agent`: `{ name, toProcessSpec(input) }`.
- Error classes: `ProviderError`, `ProcessError`, `AgentError`, `CredentialsError`, `OrchestrationError`.

Errors
- Include `code`, `message`, optional `details`, and `cause`. Never include secrets; callers should redact env before logging.

Testing
- This package has light runtime tests to validate shapes; most validation happens at compile time. Downstream packages include full tests.

Gotchas
- Paths may be absolute or `~`-prefixed; providers expand `~` to `capabilities.homeDir`.
- Keep contracts minimal. Extend cautiously to avoid locking in provider-specific concepts.

```
# Symlink `AGENTS.md` to this file.
```

