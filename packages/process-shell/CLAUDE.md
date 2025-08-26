# @repo/process-shell

Purpose: Minimal ProcessManager that runs a single command via provider.exec without daemonizing. Useful for local tests and simple flows.

Quickstart
```ts
import { ShellProcessManager } from '@repo/process-shell';
const pm = ShellProcessManager(provider.exec);
await pm.start(instanceId, { command: { kind: 'argv', command: 'echo', args: ['ok'] }, restart: 'never' });
```

Key Exports
- ShellProcessManager(execRunner) → ProcessManager

Errors
- Throws on non-zero exit when starting.

Testing
- Pair with a fake ExecRunner returning canned results.

Gotchas
- list/logs/stop are no-ops; use PM2 manager for real process supervision.

