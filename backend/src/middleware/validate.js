import { ApiError } from '../utils/ApiError.js';
import { formatZodIssues } from './errorHandler.js';

/**
 * Validate req[part] with a zod schema and replace it with the parsed value
 * (unknown keys are stripped by default, which blocks mass-assignment).
 */
export const validate = (schema, part = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[part] ?? {});
  if (!result.success) return next(ApiError.validation(formatZodIssues(result.error)));
  if (part === 'query') {
    req.validatedQuery = result.data;
  } else {
    req[part] = result.data;
  }
  return next();
};
