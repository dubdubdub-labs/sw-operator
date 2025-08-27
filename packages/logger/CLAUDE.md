# `@repo/logger`

Purpose
- Lightweight, dependency-free logger with level filtering and child loggers. Designed for adapters and orchestrator; never log secrets.

Quickstart
```ts
import { createLogger } from '@repo/logger';
const log = createLogger({ name: 'Orch', level: 'info' });
log.info('boot_started', { snapshotId: 'abc' });
const pmLog = log.child?.({ name: 'PM2' });
pmLog?.debug?.('start_payload_ready');
```

Key Exports
- `createLogger({ name, level?, context?, sink? })`: returns a logger with `trace/debug/info/warn/error/fatal`.
- `noopLogger`: no-op implementation for tests.

Gotchas
- Level `silent` suppresses all logs (useful in tests).
- Provide a custom `sink` to capture logs in tests or redirect output.

