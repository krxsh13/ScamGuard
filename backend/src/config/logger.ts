import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Get package version
const packageVersion = process.env.npm_package_version || '1.0.0';

// Structured logging format with context
const structuredFormat = json();

// Development format (colorized, readable)
const developmentFormat = printf(({ level, message, timestamp, requestId, userId, service, environment, version, stack, ...metadata }) => {
  const context = [];
  if (requestId) context.push(`req=${requestId}`);
  if (userId) context.push(`user=${userId}`);
  if (service) context.push(`service=${service}`);
  
  const metadataStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
  const contextStr = context.length > 0 ? ` [${context.join(', ')}]` : '';
  
  return `${timestamp} [${level}]${contextStr}: ${stack || message}${metadataStr}`;
});

// Create logger instance with JSON format in production
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Add default metadata to all logs
    winston.format((info) => {
      return {
        ...info,
        service: 'scamguard-backend',
        environment: env.NODE_ENV,
        version: packageVersion,
      };
    })(),
    env.NODE_ENV === 'production' ? structuredFormat : developmentFormat
  ),
  defaultMeta: {
    service: 'scamguard-backend',
    environment: env.NODE_ENV,
    version: packageVersion,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        env.NODE_ENV === 'production' ? structuredFormat : developmentFormat,
        env.NODE_ENV !== 'production' ? colorize() : winston.format.uncolorize()
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: structuredFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: structuredFormat,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      format: structuredFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      format: structuredFormat,
    }),
  ],
});

/**
 * Child logger with context (requestId, userId)
 * Usage: logger.child({ requestId: '123', userId: 'user-456' })
 */
export const getContextLogger = (requestId?: string, userId?: string) => {
  const metadata: Record<string, string> = {};
  if (requestId) metadata.requestId = requestId;
  if (userId) metadata.userId = userId;
  return logger.child(metadata);
};
