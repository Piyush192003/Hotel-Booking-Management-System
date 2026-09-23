import { body } from 'express-validator';

/** Shared building blocks — mirrors the style used by the other validators. */
const optionalString = (field, max = 240) => body(field).optional({ nullable: true }).isString().isLength({ max });

const emailField = (field, { required = false } = {}) => {
  const chain = required ? body(field) : body(field).optional({ nullable: true, checkFalsy: true });
  return chain.isEmail().withMessage('A valid email is required').normalizeEmail();
};

/** GET/PATCH /settings — profile fields + the preferences tree. */
export const settingsPatchValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
  body('phone').optional({ nullable: true, checkFalsy: true }).isString().matches(/^[0-9+\-\s()]{6,20}$/).withMessage('Enter a valid phone number'),
  optionalString('avatar', 500),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Enter a valid date of birth'),
  body('gender').optional({ nullable: true, checkFalsy: true }).isIn(['female', 'male', 'non_binary', 'prefer_not_to_say']).withMessage('Invalid gender option'),
  body('address').optional().isObject().withMessage('Address must be an object'),
  optionalString('address.line1'),
  optionalString('address.city', 80),
  optionalString('address.state', 80),
  optionalString('address.country', 80),
  optionalString('address.postalCode', 16),

  body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'AED']).withMessage('Unsupported currency'),
  body('language').optional().isIn(['en', 'hi', 'mr']).withMessage('Unsupported language'),
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Unsupported theme'),

  body('emailNotifications').optional().isObject(),
  body('emailNotifications.*').optional().isBoolean().withMessage('Notification flags must be true or false'),
  body('inAppNotifications').optional().isObject(),
  body('inAppNotifications.*').optional().isBoolean(),

  body('privacy').optional().isObject(),
  body('privacy.profileVisibility').optional().isIn(['private', 'owners', 'public']),
  body('privacy.showPhoto').optional().isBoolean(),
  body('privacy.shareWithOwners').optional().isBoolean(),
  body('privacy.marketing').optional().isBoolean(),
  body('privacy.personalization').optional().isBoolean(),
  body('privacy.dataSharing').optional().isBoolean(),

  body('bookingPreferences').optional().isObject(),
  body('bookingPreferences.guests').optional().isInt({ min: 1, max: 20 }).withMessage('Guests must be 1–20'),
  body('bookingPreferences.smoking').optional().isIn(['non_smoking', 'smoking', 'no_preference']),
  optionalString('bookingPreferences.roomType', 60),
  optionalString('bookingPreferences.bedType', 60),
  optionalString('bookingPreferences.accessibility', 300),
  optionalString('bookingPreferences.checkInPreference', 30),
  optionalString('bookingPreferences.checkOutPreference', 30),
  optionalString('bookingPreferences.specialRequests', 1000),

  body('travelPreferences').optional().isObject(),
  body('travelPreferences.amenities').optional().isArray(),
  body('travelPreferences.locationTypes').optional().isArray(),
  body('travelPreferences.budgetMin').optional().isInt({ min: 0 }),
  body('travelPreferences.budgetMax').optional().isInt({ min: 0 }),
  body('travelPreferences.breakfast').optional().isIn(['included', 'not_included', 'no_preference']),
  optionalString('travelPreferences.hotelCategory', 60),
];

export default { settingsPatchValidator };

/** Owner-only business/booking/payout preferences (subset of the patch above). */
export const ownerBusinessValidator = [
  body('business').optional().isObject(),
  emailField('business.businessEmail'),
  emailField('business.notifyEmail'),
  optionalString('business.businessName', 140),
  optionalString('business.businessPhone', 30),
  optionalString('business.address', 240),
  optionalString('business.city', 80),
  optionalString('business.state', 80),
  optionalString('business.country', 80),
  optionalString('business.description', 2000),
  optionalString('business.timezone', 60),
  optionalString('business.defaultCurrency', 8),
  optionalString('business.invoicePrefix', 12),
  body('business.taxPercent').optional().isFloat({ min: 0, max: 50 }),
  body('business.autoConfirmBookings').optional().isBoolean(),
  body('business.requireApproval').optional().isBoolean(),
  body('business.minNights').optional().isInt({ min: 1, max: 30 }),
  body('business.maxNights').optional().isInt({ min: 1, max: 365 }),
  body('business.advanceBookingDays').optional().isInt({ min: 1, max: 1095 }),
  body('business.sameDayBooking').optional().isBoolean(),
  body('business.payoutSchedule').optional().isIn(['daily', 'weekly', 'biweekly', 'monthly']),
  body('business.payoutThreshold').optional().isFloat({ min: 0 }),
  body('business.payoutMethod').optional().isIn(['bank_transfer', 'upi', 'paypal']),
];

/** POST /settings/delete-account — destructive, so the password is re-required. */
export const deleteAccountValidator = [
  body('password').isString().isLength({ min: 1 }).withMessage('Enter your password to confirm'),
  body('confirm').equals('DELETE').withMessage('Type DELETE to confirm account deletion'),
  body('reason').optional({ nullable: true }).isString().isLength({ max: 500 }),
];

/** PATCH /settings/platform — admin-only platform configuration. */
export const platformPatchValidator = [
  body('general').optional().isObject(),
  optionalString('general.appName', 80),
  optionalString('general.supportEmail', 140),
  optionalString('general.supportPhone', 30),
  body('general.defaultLanguage').optional().isIn(['en', 'hi', 'mr']),
  body('general.defaultCurrency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'AED']),
  optionalString('general.timezone', 60),

  body('booking').optional().isObject(),
  body('booking.minNights').optional().isInt({ min: 1, max: 30 }),
  body('booking.maxNights').optional().isInt({ min: 1, max: 365 }),
  body('booking.advanceBookingDays').optional().isInt({ min: 1, max: 1095 }),
  body('booking.sameDayBooking').optional().isBoolean(),
  body('booking.requireApproval').optional().isBoolean(),
  body('booking.autoConfirmOnPayment').optional().isBoolean(),

  body('hotels').optional().isObject(),
  body('hotels.hotelApprovalRequired').optional().isBoolean(),
  body('hotels.ownerVerificationRequired').optional().isBoolean(),

  body('reviews').optional().isObject(),
  body('reviews.reviewsEnabled').optional().isBoolean(),
  body('reviews.reviewModerationRequired').optional().isBoolean(),

  body('payments').optional().isObject(),
  body('payments.platformCommissionPercent').optional().isFloat({ min: 0, max: 50 }),
  body('payments.taxPercent').optional().isFloat({ min: 0, max: 50 }),
  body('payments.refundsEnabled').optional().isBoolean(),
  body('payments.provider').optional().isIn(['mock', 'razorpay']),
];
