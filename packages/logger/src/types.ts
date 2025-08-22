export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogFormat = "pretty" | "json";

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  prefix?: string;
  childPrefix?: string;
}

export interface LoggerConfig {
  level?: LogLevel;
  format?: LogFormat;
  prefix?: string;
  context?: LogContext;
}

export interface Logger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(
    message: string,
    error?: Error | LogContext,
    context?: LogContext
  ): void;
  fatal(
    message: string,
    error?: Error | LogContext,
    context?: LogContext
  ): void;
  child(config: { prefix?: string; context?: LogContext }): Logger;
}

export type LogFormatter = (entry: LogEntry) => string;

export type LogTransport = (formattedMessage: string) => void;
