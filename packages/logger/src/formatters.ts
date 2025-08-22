import type { LogEntry, LogFormatter } from "./types.js";

const LEVEL_COLORS = {
  trace: "\x1b[90m", // gray
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[35m", // magenta
} as const;

const RESET = "\x1b[0m";

export const prettyFormatter: LogFormatter = (entry: LogEntry): string => {
  const { timestamp, level, message, context, error, prefix, childPrefix } =
    entry;
  const color = LEVEL_COLORS[level];
  const levelStr = level.toUpperCase().padEnd(5);
  const timeStr = timestamp.toISOString();

  const prefixStr = [prefix, childPrefix]
    .filter(Boolean)
    .map((p) => `[${p}]`)
    .join(" ");

  const parts: string[] = [`${color}${levelStr}${RESET}`, `[${timeStr}]`];

  if (prefixStr) {
    parts.push(prefixStr);
  }

  parts.push(message);

  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([key, value]) => {
        const val =
          typeof value === "object"
            ? JSON.stringify(value, null, 2).split("\n").join("\n  ")
            : String(value);
        return `  ${key}: ${val}`;
      })
      .join("\n");
    parts.push(`\n${contextStr}`);
  }

  if (error) {
    parts.push(`\n  Error: ${error.message}`);
    if (error.stack) {
      const stackLines = error.stack
        .split("\n")
        .slice(1)
        .map((line) => `  ${line}`)
        .join("\n");
      parts.push(stackLines);
    }
  }

  return parts.join(" ");
};

export const jsonFormatter: LogFormatter = (entry: LogEntry): string => {
  const { timestamp, level, message, context, error, prefix, childPrefix } =
    entry;

  const logObject: Record<string, unknown> = {
    timestamp: timestamp.toISOString(),
    level,
    message,
  };

  if (prefix || childPrefix) {
    logObject.prefix = [prefix, childPrefix].filter(Boolean).join(".");
  }

  if (context) {
    logObject.context = context;
  }

  if (error) {
    logObject.error = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return JSON.stringify(logObject);
};
