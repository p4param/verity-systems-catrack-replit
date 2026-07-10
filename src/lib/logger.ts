import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Underlying Pino instance
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        },
      }
    : {}),
});

export type LoggerContext = {
  correlationId?: string;
  tenantId?: number | string;
  userId?: number | string;
  module?: string;
  entity?: string;
  requestId?: string;
  [key: string]: any;
};

/**
 * Platform Logger Abstraction.
 * Supports structured logging with contextual fields.
 * Decouples the application from the underlying logging library (Pino).
 */
export class AppLogger {
  private baseLogger: pino.Logger;

  constructor(baseLogger: pino.Logger = pinoLogger) {
    this.baseLogger = baseLogger;
  }

  /**
   * Creates a child logger with bound contextual fields.
   */
  child(context: LoggerContext): AppLogger {
    return new AppLogger(this.baseLogger.child(context));
  }

  debug(msg: string, context?: LoggerContext) {
    this.baseLogger.debug(context || {}, msg);
  }

  info(msg: string, context?: LoggerContext) {
    this.baseLogger.info(context || {}, msg);
  }

  warn(msg: string, context?: LoggerContext) {
    this.baseLogger.warn(context || {}, msg);
  }

  error(msg: string, error?: Error | unknown, context?: LoggerContext) {
    this.baseLogger.error({ err: error, ...(context || {}) }, msg);
  }

  fatal(msg: string, error?: Error | unknown, context?: LoggerContext) {
    this.baseLogger.fatal({ err: error, ...(context || {}) }, msg);
  }
}

// Export default singleton instance
export const logger = new AppLogger();
