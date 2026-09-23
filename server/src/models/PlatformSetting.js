import mongoose from 'mongoose';

/**
 * Platform-wide configuration, editable by admins from Settings → Platform.
 * Stored as a single document (key = 'platform') so reads are trivially cheap
 * and the whole config can be served/updated in one request.
 */
export const DEFAULT_PLATFORM_SETTINGS = {
  general: {
    appName: 'Wanderlust',
    supportEmail: 'support@wanderlust.dev',
    supportPhone: '+91 90000 00000',
    defaultLanguage: 'en',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
  },
  booking: {
    minNights: 1,
    maxNights: 30,
    advanceBookingDays: 365,
    sameDayBooking: true,
    requireApproval: false,
    autoConfirmOnPayment: true,
  },
  hotels: {
    hotelApprovalRequired: true,
    ownerVerificationRequired: false,
  },
  reviews: {
    reviewsEnabled: true,
    reviewModerationRequired: false,
  },
  payments: {
    platformCommissionPercent: 8,
    taxPercent: 12,
    refundsEnabled: true,
    provider: 'mock',
  },
};

const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'platform', unique: true, immutable: true },
    general: {
      appName: { type: String, default: DEFAULT_PLATFORM_SETTINGS.general.appName, maxlength: 80 },
      supportEmail: { type: String, default: DEFAULT_PLATFORM_SETTINGS.general.supportEmail },
      supportPhone: { type: String, default: DEFAULT_PLATFORM_SETTINGS.general.supportPhone, maxlength: 30 },
      defaultLanguage: { type: String, default: DEFAULT_PLATFORM_SETTINGS.general.defaultLanguage },
      defaultCurrency: { type: String, default: DEFAULT_PLATFORM_SETTINGS.general.defaultCurrency },
      timezone: { type: String, default: DEFAULT_PLATFORM_SETTINGS.general.timezone },
    },
    booking: {
      minNights: { type: Number, default: 1, min: 1, max: 30 },
      maxNights: { type: Number, default: 30, min: 1, max: 365 },
      advanceBookingDays: { type: Number, default: 365, min: 1, max: 1095 },
      sameDayBooking: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false },
      autoConfirmOnPayment: { type: Boolean, default: true },
    },
    hotels: {
      hotelApprovalRequired: { type: Boolean, default: true },
      ownerVerificationRequired: { type: Boolean, default: false },
    },
    reviews: {
      reviewsEnabled: { type: Boolean, default: true },
      reviewModerationRequired: { type: Boolean, default: false },
    },
    payments: {
      // Percentage values only — no secrets or provider keys are ever stored here.
      platformCommissionPercent: { type: Number, default: 8, min: 0, max: 50 },
      taxPercent: { type: Number, default: 12, min: 0, max: 50 },
      refundsEnabled: { type: Boolean, default: true },
      provider: { type: String, default: 'mock', enum: ['mock', 'razorpay'] },
    },
  },
  { timestamps: true },
);

const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
export default PlatformSetting;
