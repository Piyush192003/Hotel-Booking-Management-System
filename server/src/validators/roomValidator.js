import { body } from 'express-validator';

const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'family', 'dormitory', 'studio', 'presidential'];
const BED_TYPES = ['king', 'queen', 'twin', 'double', 'single', 'bunk', 'sofa'];

export const createRoomValidator = [
  body('roomType').optional().isIn(ROOM_TYPES).withMessage('Invalid room type'),
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Room name must be 2–120 characters'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('pricePerNight').isFloat({ min: 1, max: 10000000 }).withMessage('Price must be a positive number'),
  body('capacity').optional().isObject(),
  body('capacity.adults').optional().isInt({ min: 1, max: 16 }),
  body('capacity.children').optional().isInt({ min: 0, max: 8 }),
  body('bedType').optional().isIn(BED_TYPES).withMessage('Invalid bed type'),
  body('amenities').optional().isArray(),
  body('images').optional().isArray(),
  body('totalUnits').optional().isInt({ min: 1, max: 1000 }).withMessage('Units must be between 1 and 1000'),
  body('status').optional().isIn(['active', 'inactive']),
  body('seasonalRates').optional().isArray(),
  body('weekendMarkupPercent').optional().isInt({ min: 0, max: 200 }),
];

export const updateRoomValidator = createRoomValidator.map((v) => v.optional({ values: 'undefined' }));