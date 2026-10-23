import { ApiError } from '../lib/errors.js';

// Express 5 makes req.query read-only, so parsed values go on req.valid.
function validator(source) {
  return (schema) => (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ApiError(
        400,
        'invalid_request',
        `Invalid ${source === 'query' ? 'query parameters' : source}.`,
        result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      );
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}

export const validateQuery = validator('query');
export const validateParams = validator('params');
export const validateBody = validator('body');
