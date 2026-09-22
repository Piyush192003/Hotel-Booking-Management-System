/**
 * Wraps async route handlers and forwards rejections to the central error
 * handler — removes the need for try/catch in controllers.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;