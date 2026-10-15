export class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static validation(details, message = 'Some fields need attention') {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }
  static unauthorized(message = 'Please sign in to continue', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }
  static forbidden(message = 'You do not have permission to do this', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Conflict', details) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
  static tooMany(message = 'Too many requests, please try again later') {
    return new ApiError(429, message, 'RATE_LIMITED');
  }
  static serviceUnavailable(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new ApiError(503, message, code);
  }
}
