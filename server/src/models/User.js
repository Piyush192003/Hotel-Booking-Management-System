import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    passwordHash: { type: String, required: [true, 'Password is required'], select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '', maxlength: 20 },
    dateOfBirth: { type: Date },
    gender: { type: String, default: '', enum: ['', 'female', 'male', 'non_binary', 'prefer_not_to_say'] },
    address: {
      line1: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
      postalCode: { type: String, default: '' },
    },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    isBlocked: { type: Boolean, default: false },
    /**
     * Session generation. Every access/refresh token carries the value it was
     * issued with; bumping this field instantly invalidates all existing
     * sessions ("log out of all devices") without touching the DB per token.
     */
    tokenVersion: { type: Number, default: 0, select: false },

    // ---------- Settings (single nested tree, edited from the Settings page) ----------
    preferences: {
      // Preferences
      currency: { type: String, default: 'INR' },
      language: { type: String, default: 'en', enum: ['en', 'hi', 'mr'] },
      theme: { type: String, default: 'system', enum: ['light', 'dark', 'system'] },

      // Notifications — security-critical entries stay on (enforced in the service)
      emailNotifications: {
        bookingConfirmation: { type: Boolean, default: true },
        bookingCancellation: { type: Boolean, default: true },
        bookingModification: { type: Boolean, default: true },
        paymentConfirmation: { type: Boolean, default: true },
        refundUpdates: { type: Boolean, default: true },
        promotional: { type: Boolean, default: true },
        reviews: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true, immutable: false }, // always delivered
      },
      inAppNotifications: {
        bookingUpdates: { type: Boolean, default: true },
        hotelUpdates: { type: Boolean, default: true },
        paymentUpdates: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: true },
      },

      // Privacy
      privacy: {
        profileVisibility: { type: String, default: 'private', enum: ['private', 'owners', 'public'] },
        showPhoto: { type: Boolean, default: true },
        shareWithOwners: { type: Boolean, default: true },
        marketing: { type: Boolean, default: true },
        personalization: { type: Boolean, default: true },
        dataSharing: { type: Boolean, default: false },
      },

      // Guest booking preferences
      bookingPreferences: {
        roomType: { type: String, default: '' },
        bedType: { type: String, default: '' },
        smoking: { type: String, default: 'non_smoking', enum: ['non_smoking', 'smoking', 'no_preference'] },
        accessibility: { type: String, default: '' },
        checkInPreference: { type: String, default: '' },
        checkOutPreference: { type: String, default: '' },
        guests: { type: Number, default: 2, min: 1, max: 20 },
        specialRequests: { type: String, default: '', maxlength: 1000 },
      },

      // Guest travel preferences (used later for recommendations)
      travelPreferences: {
        hotelCategory: { type: String, default: '' },
        amenities: { type: [String], default: [] },
        locationTypes: { type: [String], default: [] },
        budgetMin: { type: Number, default: 0, min: 0 },
        budgetMax: { type: Number, default: 0, min: 0 },
        breakfast: { type: String, default: 'no_preference', enum: ['included', 'not_included', 'no_preference'] },
      },

      // Owner business settings (also used for the admin-adjustable hero for owners)
      business: {
        businessName: { type: String, default: '', maxlength: 140 },
        businessEmail: { type: String, default: '', maxlength: 140 },
        businessPhone: { type: String, default: '', maxlength: 30 },
        address: { type: String, default: '', maxlength: 240 },
        city: { type: String, default: '', maxlength: 80 },
        state: { type: String, default: '', maxlength: 80 },
        country: { type: String, default: 'India', maxlength: 80 },
        description: { type: String, default: '', maxlength: 2000 },
        timezone: { type: String, default: 'Asia/Kolkata' },
        defaultCurrency: { type: String, default: 'INR' },
        taxPercent: { type: Number, default: 0, min: 0, max: 50 },
        invoicePrefix: { type: String, default: 'INV', maxlength: 12 },
        notifyEmail: { type: String, default: '', maxlength: 140 },
        // Booking rules (applied to new reservations on this owner's properties)
        autoConfirmBookings: { type: Boolean, default: false },
        requireApproval: { type: Boolean, default: true },
        minNights: { type: Number, default: 1, min: 1, max: 30 },
        maxNights: { type: Number, default: 30, min: 1, max: 365 },
        advanceBookingDays: { type: Number, default: 365, min: 1, max: 1095 },
        sameDayBooking: { type: Boolean, default: true },
        // Payout preferences — amounts/schedules only, never account credentials.
        payoutSchedule: { type: String, default: 'weekly', enum: ['daily', 'weekly', 'biweekly', 'monthly'] },
        payoutThreshold: { type: Number, default: 1000, min: 0 },
        payoutMethod: { type: String, default: 'bank_transfer', enum: ['bank_transfer', 'upi', 'paypal'] },
      },

      // Legacy flag kept in sync with privacy.marketing for older call sites.
      marketingEmails: { type: Boolean, default: true },
    },

    lastLoginAt: { type: Date },
    lastLoginUserAgent: { type: String, default: '', maxlength: 300 },
    deletedAt: { type: Date },
    deletionRequestedAt: { type: Date },
    deletionReason: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const {
    passwordHash,
    emailVerificationToken,
    emailVerificationExpires,
    resetPasswordToken,
    resetPasswordExpires,
    tokenVersion,
    __v,
    ...safe
  } = this.toObject();
  return safe;
};

const User = mongoose.model('User', userSchema);
export default User;