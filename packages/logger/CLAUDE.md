# @repo/logger

Purpose: Tiny, dependency-free logger with child loggers and leveled methods. Never logs secrets; redacts obvious sensitive keys.

Quickstart
```ts
import { createLogger } from "@repo/logger";

const log = createLogger({ name: "Orch", level: "info" });
log.info("boot_started", { instanceId: "i-123" });
const child = log.child({ name: "Morph" });
child.debug("exec", { cmd: "echo ok" });
```

Key Exports
- createLogger({ name?, level?, sink? }) → Logger
- createNoopLogger() → Logger that discards logs
- Logger: trace|debug|info|warn|error|fatal, child()

Errors
- None specific; this package should not throw in normal operation.

Testing
- `bunx turbo test` or `bun test` inside the package.
- Unit tests verify level filtering and child scoping.

Gotchas
- Provide a custom sink if you need structured log shipping; the default writes to console.
- Secrets in context are shallow-redacted by key name (token, secret, key, password); avoid passing full secret blobs.

