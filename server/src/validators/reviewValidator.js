import { body, param } from 'express-validator';

export const commentValidator = [
  param('id').isMongoId(),
  param('commentId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid comment id'),
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1–1000 characters'),
];

export const deleteCommentValidator = [
  param('id').isMongoId(),
  param('commentId').isMongoId().withMessage('Invalid comment id'),
];

export const createReviewValidator = [
  body('hotelId').isMongoId().withMessage('Invalid hotel id'),
  body('bookingId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid booking id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('cleanliness').optional().isInt({ min: 1, max: 5 }),
  body('location').optional().isInt({ min: 1, max: 5 }),
  body('service').optional().isInt({ min: 1, max: 5 }),
  body('value').optional().isInt({ min: 1, max: 5 }),
  body('title').optional().trim().isLength({ max: 160 }),
  body('comment').trim().isLength({ min: 10, max: 3000 }).withMessage('Review must be at least 10 characters'),
];

export const updateReviewValidator = createReviewValidator.map((v) => v.optional({ values: 'undefined' }));

export const replyReviewValidator = [
  param('id').isMongoId(),
  body('text').trim().isLength({ min: 2, max: 2000 }).withMessage('Reply must be 2–2000 characters'),
];

export const moderateReviewValidator = [
  param('id').isMongoId(),
  body('status').isIn(['active', 'hidden']).withMessage('Status must be active or hidden'),
];