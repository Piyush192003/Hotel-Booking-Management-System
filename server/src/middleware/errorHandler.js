import mongoose from 'mongoose';
import { config } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Central error handler. Maps known error types to the standard envelope:
 * { success: false, message, code, [details] }
 * Stack traces are only visible outside production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  // Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
    error = ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details);
  }

  // Mongoose duplicate key errors
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    error = ApiError.conflict(`${field} already exists`, 'DUPLICATE_KEY');
  }

  // Cast errors (invalid ObjectId etc.)
  if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for "${err.path}"`, 'INVALID_ID');
  }

  // JSON body parse errors
  if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Invalid JSON payload', 'INVALID_JSON');
  }

  // Multer / upload errors
  if (err && err.name === 'MulterError') {
    error = ApiError.badRequest(`Upload error: ${err.message}`, 'UPLOAD_ERROR');
  }

  if (!(error instanceof ApiError)) {
    const message = error?.message || 'Internal server error';
    error = ApiError.internal(message, 'INTERNAL_ERROR', false);
  }

  const statusCode = error.statusCode || 500;
  const payload = {
    success: false,
    message: error.message,
    code: error.code || 'INTERNAL_ERROR',
  };
  if (error.details && (config.isDevelopment || statusCode >= 400 && statusCode < 500)) {
    payload.details = error.details;
  }
  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${req.method} ${req.originalUrl}:`, error);
  }
  return res.status(statusCode).json(payload);
}

export default errorHandler;