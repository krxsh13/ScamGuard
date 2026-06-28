import helmet from 'helmet';
import cors from 'cors';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// CORS configuration
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Enhanced Helmet security headers with CSP
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", env.AI_SERVICE_URL || 'http://localhost:8000'],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  frameguard: {
    action: 'deny',
  },
});

// Compression middleware for gzip responses
export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024 * 10, // Only compress responses larger than 10KB
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// Global rate limiter - fallback for all routes (200 req per 15 min)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Global rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  },
});

// Auth endpoint limiter - 5 requests per 15 minutes per IP
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req: Request) => req.method !== 'POST',
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  },
});

// Register endpoint limiter - 3 requests per hour per IP
export const registerLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many account creation attempts, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Register rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many account creation attempts, please try again later.',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  },
});

// Scan endpoint limiter - 20 requests per minute per authenticated user
export const scanLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many scan requests, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated requests, IP for unauthenticated
    return req.user?.userId || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn(`Scan rate limit exceeded for user/IP: ${req.user?.userId || req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many scan requests, please try again later.',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    });
  },
});

// Slow-down middleware for auth routes - progressive delays
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: 500,
  maxDelayMs: 10 * 1000,
});

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  req.id = `${timestamp}-${randomStr}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel as 'info' | 'warn' | 'error'](
      `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`,
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        requestId: req.id,
      }
    );
  });
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove potential XSS patterns
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  return value;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}
