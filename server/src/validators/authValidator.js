import { body } from 'express-validator';
import { ROLES } from '../utils/constants.js';

const password = body('password')
  .isString()
  .withMessage('Password is required')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[a-zA-Z]/)
  .withMessage('Password must contain at least one letter')
  .matches(/\d/)
  .withMessage('Password must contain at least one number');

const email = body('email').isEmail().withMessage('A valid email is required').normalizeEmail();

export const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
  email,
  password,
  body('role')
    .optional()
    .isIn([ROLES.CUSTOMER, ROLES.OWNER])
    .withMessage('Role must be customer or owner'),
  body('phone').optional().isString().isLength({ max: 20 }), 
];

export const loginValidator = [
  email,
  body('password').isString().withMessage('Password is required'),
];

export const forgotPasswordValidator = [email];

export const resetPasswordValidator = [
  body('token').isString().withMessage('Reset token is required'),
  password,
];

export const verifyEmailValidator = [
  body('token')
    .isString().withMessage('Verification code is required')
    .matches(/^\d{6}$/).withMessage('Enter the 6-digit code from your email'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

export const resendVerificationValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

export const changePasswordValidator = [
  body('currentPassword').isString().withMessage('Current password is required'),
  password,
];

export const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('phone').optional().isString().isLength({ max: 20 }),
  body('address').optional().isObject(),
  body('preferences').optional().isObject(),
];