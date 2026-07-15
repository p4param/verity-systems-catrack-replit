export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export class RuntimeLogger {
  private static instance: RuntimeLogger;
  
  private constructor() {}

  static getInstance(): RuntimeLogger {
    if (!RuntimeLogger.instance) {
      RuntimeLogger.instance = new RuntimeLogger();
    }
    return RuntimeLogger.instance;
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [CAP-RUNTIME] [${level}] ${message}`;
    if (level === LogLevel.ERROR) {
      console.error(formatted, context || "");
    } else if (level === LogLevel.WARN) {
      console.warn(formatted, context || "");
    } else if (level === LogLevel.INFO) {
      console.info(formatted, context || "");
    } else {
      console.debug(formatted, context || "");
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context);
  }
}

export const logger = RuntimeLogger.getInstance();
export default logger;
