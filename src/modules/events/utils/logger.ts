export class StructuredLogger {
  static info(message: string, context?: Record<string, any>) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message,
        ...context,
      })
    );
  }

  static error(message: string, error?: any, context?: Record<string, any>) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message,
        error: error instanceof Error ? error.message : error,
        ...context,
      })
    );
  }

  static warn(message: string, context?: Record<string, any>) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        message,
        ...context,
      })
    );
  }
}
