import { ZodError } from 'zod';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    // 1. Safety check to make sure the schema was actually imported correctly!
    if (!schema) {
      console.error("[Zod] ERROR: The schema provided to the middleware is undefined. Check your imports in auth.routes.js.");
      return res.status(500).json({ status: 'error', message: 'Internal Server Validation Error' });
    }

    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    next(); 
  } catch (error) {
    // 2. Safely check if this is a Zod Validation Error
    if (error instanceof ZodError) {
      const formattedErrors = error.issues.map((err) => ({
        field: err.path[err.path.length - 1], 
        message: err.message,
      }));

      return res.status(400).json({
        status: 'fail',
        message: 'Invalid input data',
        errors: formattedErrors,
      });
    }

    // 3. If it is NOT a Zod error, log the REAL error to your terminal so we can fix it!
    console.error("[Middleware Error]:", error);
    next(error);
  }
};