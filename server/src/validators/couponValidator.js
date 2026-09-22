import { body, param } from 'express-validator';
import { COUPON_DISCOUNT_TYPE } from '../utils/constants.js';

export const validateCouponValidator = [
  body('code').trim().isLength({ min: 3, max: 30 }).withMessage('A valid coupon code is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Invalid booking amount'),
];

export const createCouponValidator = [
  body('code').trim().isLength({ min: 3, max: 30 }).withMessage('Coupon code must be 3–30 characters'),
  body('description').optional().trim().isLength({ max: 300 }),
  body('discountType').isIn(Object.values(COUPON_DISCOUNT_TYPE)).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0.01 }).withMessage('Discount value must be positive'),
  body('minimumBookingAmount').optional().isFloat({ min: 0 }),
  body('maximumDiscount').optional().isFloat({ min: 0 }),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 1, max: 100 }),
  body('active').optional().isBoolean(),
];

export const updateCouponValidator = createCouponValidator.map((v) => v.optional({ values: 'undefined' }));

export const couponParamValidator = [param('id').isMongoId().withMessage('Invalid coupon id')];