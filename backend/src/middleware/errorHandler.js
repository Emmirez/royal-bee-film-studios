import mongoose from 'mongoose';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export const formatZodIssues = (error) =>
  error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

/** Centralized error handler — never leaks stack traces or internals in production. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof ZodError) {
    error = ApiError.validation(formatZodIssues(err));
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = ApiError.validation(
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${err.path}`);
  } else if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    error = ApiError.conflict(`A record with this ${fields.join(', ') || 'value'} already exists`, { fields });
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : `Upload error: ${err.message}`,
    );
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (err?.type === 'entity.too.large') {
    error = new ApiError(413, 'Request body too large', 'PAYLOAD_TOO_LARGE');
  } else if (!(err instanceof ApiError)) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
    error = new ApiError(500, 'Something went wrong on our side', 'INTERNAL_ERROR');
  }

  if (error.statusCode >= 500 && err instanceof ApiError) {
    logger.error({ err, path: req.originalUrl }, error.message);
  }

  const body = {
    success: false,
    error: { code: error.code, message: error.message },
  };
  if (error.details) body.error.details = error.details;
  if (!env.isProduction && error.statusCode === 500 && err?.message) body.error.debug = err.message;

  res.status(error.statusCode || 500).json(body);
}
