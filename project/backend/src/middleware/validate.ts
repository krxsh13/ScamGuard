import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware factory for Zod schema validation
 * Validates req.body against a provided schema, strips unknown fields,
 * and returns structured 400 errors with field-level detail on failure.
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse the request body, stripping unknown fields
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            timestamp: new Date().toISOString(),
            requestId: req.id,
            details: fieldErrors,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            timestamp: new Date().toISOString(),
            requestId: req.id,
          },
        });
      }
    }
  };
}
