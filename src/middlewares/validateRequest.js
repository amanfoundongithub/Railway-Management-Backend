import { ZodError } from 'zod';
import { Logger } from '../../utils/logger.js';

const logger = new Logger("Validate_Request");

export const validateRequest = (schema) => (req, res, next) => {
  try {
    if (!schema) {
      logger.error("The schema provided to the middleware is undefined. Check your schema and try again.");
      return res.status(500).json({ 
        status: 'error', 
        message: 'The server encountered an error during request validation.' 
      });
    }
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next(); 
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path[err.path.length - 1], 
        message: err.message,
      }));
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid request. Refers to the "errors" field for more details.',
        errors: formattedErrors,
      });
    }
    logger.error("Unexpected error in middleware", error);
    next(error);
  }
};