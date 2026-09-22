import { body, param, query } from 'express-validator';
import { BOOKING_STATUS } from '../utils/constants.js';

const validDate = (msg) => (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

export const checkAvailabilityValidator = [
  param('id').isMongoId().withMessage('Invalid room id'),
  query('checkIn').custom(validDate()).withMessage('Invalid check-in date'),
  query('checkOut').custom(validDate()).withMessage('Invalid check-out date'),
  query('rooms').optional().isInt({ min: 1, max: 10 }),
];

export const createBookingValidator = [
  body('roomId').isMongoId().withMessage('Invalid room id'),
  body('checkIn').custom(validDate('Invalid check-in date')).withMessage('Invalid check-in date'),
  body('checkOut').custom(validDate('Invalid check-out date')).withMessage('Invalid check-out date'),
  body('guests').optional().isObject(),
  body('guests.adults').optional().isInt({ min: 1, max: 16 }),
  body('guests.children').optional().isInt({ min: 0, max: 8 }),
  body('rooms').optional().isInt({ min: 1, max: 10 }).withMessage('Rooms must be 1–10'),
  body('guestDetails').isObject().withMessage('Guest details are required'),
  body('guestDetails.fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Guest full name is required'),
  body('guestDetails.email').isEmail().withMessage('Guest email is required'),
  body('guestDetails.phone').optional().isString().isLength({ max: 20 }),
  body('guestDetails.country').optional().isString().isLength({ max: 80 }),
  body('specialRequests').optional().isString().isLength({ max: 1000 }),
  body('couponCode').optional().trim().isString().isLength({ min: 3, max: 30 }),
];

export const cancelBookingValidator = [
  param('id').isMongoId().withMessage('Invalid booking id'),
  body('reason').optional({ values: 'falsy' }).trim().isString().isLength({ min: 3, max: 1000 }),
];

export const updateBookingStatusValidator = [
  param('id').isMongoId(),
  body('status').isIn([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW, BOOKING_STATUS.CANCELLED])
    .withMessage('Invalid status transition'),
];