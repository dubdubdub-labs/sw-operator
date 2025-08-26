export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type Logger = {
  level: LogLevel;
  name?: string;
  trace: (msg: string, context?: Record<string, unknown>) => void;
  debug: (msg: string, context?: Record<string, unknown>) => void;
  info: (msg: string, context?: Record<string, unknown>) => void;
  warn: (msg: string, context?: Record<string, unknown>) => void;
  error: (msg: string, context?: Record<string, unknown>) => void;
  fatal: (msg: string, context?: Record<string, unknown>) => void;
  child: (opts?: {
    name?: string;
    context?: Record<string, unknown>;
  }) => Logger;
};

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
const SENSITIVE_KEY_RE = /token|secret|key|password/i;

function levelIndex(level: LogLevel): number {
  return LEVELS.indexOf(level);
}

function redact(
  obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!obj) {
    return obj;
  }
  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && SENSITIVE_KEY_RE.test(k)) {
      redacted[k] = "[redacted]";
    } else if (typeof v === "object" && v !== null) {
      redacted[k] = "[object]"; // avoid deep-copy and accidental leaks
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

export type CreateLoggerOptions = {
  name?: string;
  level?: LogLevel;
  sink?: (entry: {
    level: LogLevel;
    name?: string;
    msg: string;
    context?: Record<string, unknown>;
  }) => void;
};

export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const minLevel: LogLevel = opts.level ?? "info";
  const baseName: string | undefined = opts.name;
  const sink =
    opts.sink ??
    ((e) => {
      const line = e.name
        ? `[${e.level.toUpperCase()}] ${e.name}: ${e.msg}`
        : `[${e.level.toUpperCase()}] ${e.msg}`;
      // eslint-disable-next-line no-console -- logger may write to console by default
      console.log(line, e.context ? redact(e.context) : "");
    });

  const emit = (
    level: LogLevel,
    msg: string,
    context?: Record<string, unknown>
  ) => {
    if (levelIndex(level) < levelIndex(minLevel)) {
      return;
    }
    sink({ level, name: baseName, msg, context });
  };

  const api: Logger = {
    level: minLevel,
    name: baseName,
    trace: (msg, context) => emit("trace", msg, context),
    debug: (msg, context) => emit("debug", msg, context),
    info: (msg, context) => emit("info", msg, context),
    warn: (msg, context) => emit("warn", msg, context),
    error: (msg, context) => emit("error", msg, context),
    fatal: (msg, context) => emit("fatal", msg, context),
    child: (childOpts) =>
      createLogger({
        name: childOpts?.name ?? baseName,
        level: minLevel,
        sink: (e) => sink({ ...e, name: e.name ?? baseName }),
      }),
  };

  return api;
}

export function createNoopLogger(): Logger {
  const fn = () => {
    // no-op
  };
  return {
    level: "fatal",
    name: "noop",
    trace: fn,
    debug: fn,
    info: fn,
    warn: fn,
    error: fn,
    fatal: fn,
    child: () => createNoopLogger(),
  };
}
