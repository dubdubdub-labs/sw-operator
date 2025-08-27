export type LogLevelName =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"
  | "silent";

const levelWeights: Record<Exclude<LogLevelName, "silent">, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export type LogContext = Record<string, unknown>;

export type LogSink = (
  level: Exclude<LogLevelName, "silent">,
  message: string,
  context?: LogContext
) => void;

export type Logger = {
  debug: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  error: (msg: string, ctx?: LogContext) => void;
  trace?: (msg: string, ctx?: LogContext) => void;
  fatal?: (msg: string, ctx?: LogContext) => void;
  child?: (opts: { name?: string; context?: LogContext }) => Logger;
};

export type CreateLoggerOptions = {
  name: string;
  level?: LogLevelName;
  sink?: LogSink;
  context?: LogContext;
};

function resolveWeight(level: LogLevelName): number {
  return level === "silent" ? Number.POSITIVE_INFINITY : levelWeights[level];
}

function defaultSink(
  level: Exclude<LogLevelName, "silent">,
  message: string,
  context?: LogContext
) {
  const payload =
    context && Object.keys(context).length > 0 ? { context } : undefined;
  const line = payload ? `${message} ${JSON.stringify(payload)}` : message;
  // Route warn/error/fatal to stderr; others to stdout
  if (level === "warn" || level === "error" || level === "fatal") {
    // eslint-disable-next-line no-console
    console.error(`[${level}] ${line}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${level}] ${line}`);
  }
}

function joinNames(parent?: string, child?: string): string | undefined {
  if (parent && child) {
    return `${parent}:${child}`;
  }
  return child ?? parent ?? undefined;
}

export function createLogger(opts: CreateLoggerOptions): Logger {
  const baseName = opts.name;
  const baseLevel: LogLevelName = opts.level ?? "info";
  const baseWeight = resolveWeight(baseLevel);
  const baseContext: LogContext = { ...(opts.context ?? {}), logger: baseName };
  const sink: LogSink = opts.sink ?? defaultSink;

  function make(level: Exclude<LogLevelName, "silent">) {
    const weight = levelWeights[level];
    return (msg: string, ctx?: LogContext) => {
      if (weight < baseWeight) {
        return;
      }
      const merged = ctx ? { ...baseContext, ...ctx } : baseContext;
      sink(level, msg, merged);
    };
  }

  const logger: Logger = {
    trace: make("trace"),
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: make("error"),
    fatal: make("fatal"),
    child: ({ name, context } = {}) =>
      createLogger({
        name: joinNames(baseName, name) ?? baseName,
        level: baseLevel,
        sink,
        context: context ? { ...baseContext, ...context } : baseContext,
      }),
  };
  return logger;
}

export const noopLogger: Logger = {
  debug() {
    // intentional no-op
  },
  info() {
    // intentional no-op
  },
  warn() {
    // intentional no-op
  },
  error() {
    // intentional no-op
  },
  trace() {
    // intentional no-op
  },
  fatal() {
    // intentional no-op
  },
  child: () => noopLogger,
};

export default createLogger;
