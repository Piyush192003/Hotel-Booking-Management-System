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
    preferences: {
      currency: { type: String, default: 'INR' },
      marketingEmails: { type: Boolean, default: true },
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const { passwordHash, emailVerificationToken, emailVerificationExpires, resetPasswordToken, resetPasswordExpires, __v, ...safe } = this.toObject();
  return safe;
};

const User = mongoose.model('User', userSchema);
export default User;