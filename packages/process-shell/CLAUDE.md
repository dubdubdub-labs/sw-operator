# `@repo/process-shell`

Purpose
- Minimal ProcessManager that runs a single command via the provider exec. Good for tests and simple flows; not a daemon.

Quickstart
```ts
import { ShellProcessManager } from '@repo/process-shell';
import type { ExecAPI } from '@repo/runtime-interfaces';

const pm = ShellProcessManager(execRunner as ExecAPI);
await pm.start(instanceId, { command: { kind: 'argv', command: 'echo', args: ['ok'] } });
```

Key Exports
- `ShellProcessManager(execRunner: ExecAPI)`: returns a `ProcessManager`.

Limitations
- `list`, `logs`, `stop` are effectively no-ops.
- Returns the `command.name` if provided.

