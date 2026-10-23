import { ApiError } from '../lib/errors.js';

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'not_found', `No route for ${req.method} ${req.path}.`));
}

// Every error leaves the API as { error: { code, message, details? } }.
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body is too large.' } });
  }

  req.log.error({ err }, 'unhandled error');
  return res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong.' } });
}
