import { body, param, query } from 'express-validator';
import { ROLES } from '../utils/constants.js';

export const adminUserActionValidator = [
  param('id').isMongoId().withMessage('Invalid user id'),
];

export const blockUserValidator = [
  param('id').isMongoId(),
  body('blocked').isBoolean().withMessage('blocked must be true/false'),
  body('reason').optional().trim().isLength({ max: 500 }),
];

export const changeRoleValidator = [
  param('id').isMongoId(),
  body('role').isIn(Object.values(ROLES)).withMessage('Invalid role'),
];

export const adminListValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 120 }),
  query('status').optional().trim().isLength({ max: 40 }),
  query('sort').optional().trim().isLength({ max: 40 }),
];