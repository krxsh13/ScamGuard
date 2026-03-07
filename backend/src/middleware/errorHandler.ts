import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
  });

  // Handle known AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    };
    return res.status(err.statusCode).json(response);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.message,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    };
    return res.status(400).json(response);
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    };
    return res.status(400).json(response);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    };
    return res.status(401).json(response);
  }

  if (err.name === 'TokenExpiredError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        timestamp: new Date().toISOString(),
        requestId: req.id,
      },
    };
    return res.status(401).json(response);
  }

  // Default error response
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  };

  res.status(500).json(response);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    },
  };
  res.status(404).json(response);
};
