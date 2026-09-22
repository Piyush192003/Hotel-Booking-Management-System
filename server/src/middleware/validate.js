import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/** Runs express-validator validations and 400s with details when invalid. */
export function validate(validations) {
  return async (req, res, next) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    const details = {};
    for (const e of errors.array({ onlyFirstError: true })) {
      details[e.path] = e.msg;
    }
    return next(ApiError.badRequest('Please fix the highlighted fields', 'VALIDATION_ERROR', details));
  };
}

export default validate;