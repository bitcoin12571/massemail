import { ZodError } from 'zod';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 *
 * Usage: app.post('/endpoint', validateRequest(mySchema), controller)
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated/coerced data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors
        });
      }
      next(error);
    }
  };
}

/**
 * Validate query parameters
 * Usage: app.get('/endpoint', validateQuery(querySchema), controller)
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          error: 'Query validation failed',
          details: formattedErrors
        });
      }
      next(error);
    }
  };
}

/**
 * Validate URL parameters
 * Usage: app.get('/endpoint/:id', validateParams(paramsSchema), controller)
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          error: 'Parameter validation failed',
          details: formattedErrors
        });
      }
      next(error);
    }
  };
}
