# @repo/process-pm2

Purpose: PM2-backed ProcessManager building safe payloads for starting, listing, logging, and stopping remote processes via provider.exec.

Quickstart
```ts
import { PM2ProcessManager } from '@repo/process-pm2';
const pm = PM2ProcessManager(provider.exec);
await pm.start(instanceId, { command: { kind: 'shell', name: 'demo', script: 'echo ok' } });
```

Key Exports
- PM2ProcessManager(execRunner) → ProcessManager

Gotchas
- CWD/env are embedded into the bash payload; do not rely on PM2 --cwd.
- Names sanitized to [a-zA-Z0-9-] and truncated to 50 chars.

