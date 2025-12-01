import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

/**
 * Custom log format for console output
 */
const consoleFormat = printf(({ level, message, timestamp, context, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${metaString}`;
});

/**
 * Custom Winston Logger Service
 * @description Provides structured logging with file rotation and console output
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      ),
      defaultMeta: { service: 'audionest-api' },
      transports: [
        // Console transport with colors in development
        new winston.transports.Console({
          format: combine(
            colorize({ all: !isProduction }),
            consoleFormat,
          ),
        }),
        // File transports for production
        ...(isProduction
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: json(),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                format: json(),
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
            ]
          : []),
      ],
    });
  }

  /**
   * Set context for log messages
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Log info level message
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  /**
   * Log error level message
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  /**
   * Log verbose level message
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Log with additional metadata
   */
  logWithMeta(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    meta: Record<string, unknown>,
  ): void {
    this.logger.log(level, message, {
      context: this.context,
      ...meta,
    });
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    details: Record<string, unknown>,
  ): void {
    this.logger.warn('Security Event', {
      context: 'Security',
      event,
      ...details,
    });
  }

  /**
   * Log payment event
   */
  logPaymentEvent(
    event: string,
    userId: string,
    amount: number,
    details?: Record<string, unknown>,
  ): void {
    this.logger.info('Payment Event', {
      context: 'Payment',
      event,
      userId,
      amount,
      ...details,
    });
  }

  /**
   * Log performance warning when response time exceeds threshold
   */
  logSlowRequest(
    method: string,
    url: string,
    duration: number,
    threshold = 3000,
  ): void {
    if (duration > threshold) {
      this.logger.warn('Slow Request Detected', {
        context: 'Performance',
        method,
        url,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
      });
    }
  }
}
