import { jsonFormatter, prettyFormatter } from "./formatters.js";
import { consoleTransport } from "./transports.js";
import type {
  LogContext,
  LogEntry,
  LogFormatter,
  Logger,
  LoggerConfig,
  LogLevel,
  LogTransport,
} from "./types.js";

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

class LoggerImpl implements Logger {
  private readonly level: LogLevel;
  private readonly formatter: LogFormatter;
  private readonly transport: LogTransport;
  private readonly prefix?: string;
  private readonly childPrefix?: string;
  private readonly context?: LogContext;

  constructor(config: LoggerConfig & { childPrefix?: string } = {}) {
    this.level = config.level ?? "info";
    this.formatter = config.format === "json" ? jsonFormatter : prettyFormatter;
    this.transport = consoleTransport;
    this.prefix = config.prefix;
    this.childPrefix = config.childPrefix;
    this.context = config.context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
      prefix: this.prefix,
      childPrefix: this.childPrefix,
    };

    const formatted = this.formatter(entry);
    this.transport(formatted);
  }

  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext
  ): void {
    const isError = errorOrContext instanceof Error;
    const actualError = isError ? errorOrContext : undefined;
    const actualContext = isError ? context : errorOrContext;
    this.log("error", message, actualContext, actualError);
  }

  fatal(
    message: string,
    errorOrContext?: Error | LogContext,
    context?: LogContext
  ): void {
    const isError = errorOrContext instanceof Error;
    const actualError = isError ? errorOrContext : undefined;
    const actualContext = isError ? context : errorOrContext;
    this.log("fatal", message, actualContext, actualError);
  }

  child(config: { prefix?: string; context?: LogContext }): Logger {
    const childPrefix = config.prefix
      ? [this.childPrefix, config.prefix].filter(Boolean).join(".")
      : this.childPrefix;

    return new LoggerImpl({
      level: this.level,
      format: this.formatter === jsonFormatter ? "json" : "pretty",
      prefix: this.prefix,
      childPrefix,
      context: { ...this.context, ...config.context },
    });
  }
}

export const createLogger = (config?: LoggerConfig): Logger => {
  return new LoggerImpl(config);
};
