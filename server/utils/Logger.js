const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

/**
 * Logger utility class for SELO Media Server
 * Uses Winston for console and file logging with different log levels
 */
class Logger {
  constructor(options = {}) {
    // Set default options
    this.options = {
      logLevel: options.logLevel || process.env.LOG_LEVEL || 'info',
      logDirectory: options.logDirectory || path.join(process.cwd(), 'logs'),
      consoleOutput: options.consoleOutput !== undefined ? options.consoleOutput : true,
      fileOutput: options.fileOutput !== undefined ? options.fileOutput : true,
      serviceName: options.serviceName || 'SELO-Media-Server'
    };

    // Create log directory if it doesn't exist
    if (this.options.fileOutput) {
      fs.ensureDirSync(this.options.logDirectory);
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(info => {
        return `${info.timestamp} [${info.level.toUpperCase()}] [${this.options.serviceName}] ${info.message}${info.stack ? `\n${info.stack}` : ''}`;
      })
    );

    // Define transports
    const transports = [];
    
    // Console transport
    if (this.options.consoleOutput) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }));
    }
    
    // File transport
    if (this.options.fileOutput) {
      transports.push(
        new winston.transports.File({
          filename: path.join(this.options.logDirectory, 'error.log'),
          level: 'error',
          format: logFormat
        }),
        new winston.transports.File({
          filename: path.join(this.options.logDirectory, 'combined.log'),
          format: logFormat
        })
      );
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level: this.options.logLevel,
      levels: winston.config.npm.levels,
      transports,
      exitOnError: false
    });
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  info(message, meta) {
    this.logger.info(this._formatMessage(message, meta));
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  debug(message, meta) {
    this.logger.debug(this._formatMessage(message, meta));
  }

  /**
   * Log a warn message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  warn(message, meta) {
    this.logger.warn(this._formatMessage(message, meta));
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {object|Error} meta - Additional metadata or Error object
   */
  error(message, meta) {
    this.logger.error(this._formatMessage(message, meta));
  }

  /**
   * Format log message with metadata
   * @private
   */
  _formatMessage(message, meta) {
    if (meta instanceof Error) {
      return { message, stack: meta.stack };
    }
    
    if (meta && typeof meta === 'object') {
      return `${message} ${JSON.stringify(meta)}`;
    }
    
    return message;
  }

  /**
   * Create a default logger instance
   * @static
   */
  static createDefaultLogger() {
    return new Logger();
  }
}

// Export singleton instance by default
const defaultLogger = Logger.createDefaultLogger();
module.exports = {
  Logger,
  logger: defaultLogger
};
