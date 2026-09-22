import { body } from 'express-validator';

const PROPERTY_TYPES = ['hotel', 'resort', 'villa', 'apartment', 'guesthouse', 'homestay', 'hostel', 'cottage'];
const AMENITIES = ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'air-conditioning', 'parking', 'room-service', 'laundry', 'airport-shuttle', 'breakfast', 'pets-allowed', 'child-friendly', 'beachfront', 'mountain-view', 'kitchen', 'fireplace', 'workspace', 'elevator', '24x7-front-desk', 'luggage-storage'];

export const createHotelValidator = [
  body('name').trim().isLength({ min: 3, max: 140 }).withMessage('Hotel name must be 3–140 characters'),
  body('tagline').optional().trim().isLength({ max: 160 }),
  body('description').trim().isLength({ min: 20, max: 5000 }).withMessage('Description must be at least 20 characters'),
  body('propertyType').optional().isIn(PROPERTY_TYPES).withMessage('Invalid property type'),
  body('starRating').optional().isInt({ min: 1, max: 5 }),
  body('address').trim().isLength({ min: 3, max: 300 }).withMessage('Address is required'),
  body('city').trim().isLength({ min: 2, max: 80 }).withMessage('City is required'),
  body('state').optional().trim().isLength({ max: 80 }),
  body('country').optional().trim().isLength({ max: 80 }),
  body('postalCode').optional().trim().isLength({ max: 20 }),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('location.latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }),
  body('location.longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('amenities.*').optional().isIn(AMENITIES).withMessage('Unknown amenity'),
  body('policies').optional().isObject(),
  body('policies.checkInTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Check-in time must be HH:MM'),
  body('policies.checkOutTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Check-out time must be HH:MM'),
  body('policies.cancellation').optional().isObject(),
  body('policies.cancellation.freeCancellationHours').optional().isInt({ min: 0, max: 720 }),
  body('policies.cancellation.cancellationFeePercent').optional().isInt({ min: 0, max: 100 }),
  body('policies.houseRules').optional().isArray(),
  body('images').optional().isArray().withMessage('Images must be an array of URLs'),
  body('images.*').optional().isURL().withMessage('Invalid image URL'),
];

export const updateHotelValidator = createHotelValidator.map((v) => v.optional({ values: 'undefined' }));

export const reviewHotelValidator = [
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']),
  body('rejectionReason').optional().trim().isLength({ max: 500 }),
];