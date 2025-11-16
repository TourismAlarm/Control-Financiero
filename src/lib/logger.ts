/**
 * Custom logger utility that respects NODE_ENV
 * - In development: logs to console
 * - In production: silent or can be configured to send to external service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableInProduction?: boolean;
  externalLogger?: (level: LogLevel, message: string, ...args: any[]) => void;
}

class Logger {
  private isDevelopment: boolean;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.config = config;
  }

  private shouldLog(): boolean {
    return this.isDevelopment || this.config.enableInProduction || false;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private sendToExternal(level: LogLevel, message: string, ...args: any[]): void {
    if (this.config.externalLogger) {
      try {
        this.config.externalLogger(level, message, ...args);
      } catch (error) {
        // Silently fail if external logger has issues
        console.error('External logger failed:', error);
      }
    }
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, ...args: any[]): void {
    if (!this.isDevelopment) return;

    console.debug(this.formatMessage('debug', message), ...args);
    this.sendToExternal('debug', message, ...args);
  }

  /**
   * Log informational messages
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog()) {
      this.sendToExternal('info', message, ...args);
      return;
    }

    console.info(this.formatMessage('info', message), ...args);
    this.sendToExternal('info', message, ...args);
  }

  /**
   * Log general messages
   */
  log(message: string, ...args: any[]): void {
    if (!this.shouldLog()) {
      this.sendToExternal('info', message, ...args);
      return;
    }

    console.log(this.formatMessage('info', message), ...args);
    this.sendToExternal('info', message, ...args);
  }

  /**
   * Log warning messages
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog()) {
      this.sendToExternal('warn', message, ...args);
      return;
    }

    console.warn(this.formatMessage('warn', message), ...args);
    this.sendToExternal('warn', message, ...args);
  }

  /**
   * Log error messages (always logged, even in production)
   */
  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message), ...args);
    this.sendToExternal('error', message, ...args);
  }

  /**
   * Create a scoped logger with a prefix
   */
  scope(scopeName: string): Logger {
    const scopedLogger = new Logger(this.config);

    // Override methods to include scope
    const originalLog = this.log.bind(this);
    const originalInfo = this.info.bind(this);
    const originalWarn = this.warn.bind(this);
    const originalError = this.error.bind(this);
    const originalDebug = this.debug.bind(this);

    scopedLogger.log = (message: string, ...args: any[]) => {
      originalLog(`[${scopeName}] ${message}`, ...args);
    };
    scopedLogger.info = (message: string, ...args: any[]) => {
      originalInfo(`[${scopeName}] ${message}`, ...args);
    };
    scopedLogger.warn = (message: string, ...args: any[]) => {
      originalWarn(`[${scopeName}] ${message}`, ...args);
    };
    scopedLogger.error = (message: string, ...args: any[]) => {
      originalError(`[${scopeName}] ${message}`, ...args);
    };
    scopedLogger.debug = (message: string, ...args: any[]) => {
      originalDebug(`[${scopeName}] ${message}`, ...args);
    };

    return scopedLogger;
  }
}

// Create default logger instance
export const logger = new Logger();

// Export factory for custom configurations
export const createLogger = (config: LoggerConfig): Logger => {
  return new Logger(config);
};

// Example: Configure external logger (e.g., Sentry, LogRocket, etc.)
// export const logger = createLogger({
//   externalLogger: (level, message, ...args) => {
//     // Send to external service
//     // Example: Sentry.captureMessage(message, level);
//   }
// });

export default logger;
