/**
 * Standard application error with an HTTP status code, an error code and
 * optional validation details.
 */
export class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = undefined, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.name = 'ApiError';
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static unavailable(message = 'No longer available', code = 'UNAVAILABLE') {
    return new ApiError(410, message, code);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', code = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }

  static paymentRequired(message, code = 'PAYMENT_ERROR') {
    return new ApiError(402, message, code);
  }

  static internal(message = 'Something went wrong on our side', code = 'INTERNAL_ERROR', isOperational = true) {
    return new ApiError(500, message, code, undefined, isOperational);
  }
}

export default ApiError;