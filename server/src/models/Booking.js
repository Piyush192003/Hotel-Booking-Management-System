import mongoose from 'mongoose';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
} from '../utils/constants.js';

const guestDetailsSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '', maxlength: 20 },
    country: { type: String, default: 'India' },
  },
  { _id: false },
);

const pricingSchema = new mongoose.Schema(
  {
    currency: { type: String, default: 'INR' },
    nights: { type: Number, required: true },
    basePricePerNight: { type: Number, required: true },
    roomSubtotal: { type: Number, required: true },
    taxes: { type: Number, required: true },
    serviceFee: { type: Number, required: true },
    couponDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    // Optional season/weekend adjustments included in roomSubtotal
    adjustments: {
      weekendMarkup: { type: Number, default: 0 },
      seasonalMarkup: { type: Number, default: 0 },
    },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true }, // local midnight
    checkOut: { type: Date, required: true }, // local midnight
    nights: { type: Number, required: true, min: 1 },
    guests: {
      adults: { type: Number, required: true, min: 1, max: 16 },
      children: { type: Number, default: 0, min: 0, max: 8 },
    },
    rooms: { type: Number, required: true, min: 1, max: 10, default: 1 },
    guestDetails: { type: guestDetailsSchema, required: true },
    specialRequests: { type: String, default: '', maxlength: 1000 },
    pricing: { type: pricingSchema, required: true },
    coupon: {
      code: { type: String, default: '' },
      discountType: { type: String, default: '' },
      discountValue: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },
    payment: {
      provider: { type: String, enum: Object.values(PAYMENT_PROVIDERS), default: PAYMENT_PROVIDERS.MOCK },
      paymentId: { type: String, default: '' }, // payment reference (mock or razorpay)
      orderId: { type: String, default: '' },
      method: { type: String, default: '' },
      paidAt: { type: Date },
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    bookingStatus: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    cancellation: {
      cancelledAt: { type: Date },
      reason: { type: String, default: '', maxlength: 1000 },
      cancelledBy: { type: String, enum: ['customer', 'owner', 'admin', 'system'], default: 'customer' },
      refundAmount: { type: Number, default: 0 },
      feeAmount: { type: Number, default: 0 },
      refundId: { type: String, default: '' },
    },
    checkInCode: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

bookingSchema.index({ userId: 1 });
bookingSchema.index({ userId: 1, bookingStatus: 1 });
bookingSchema.index({ hotelId: 1 });
bookingSchema.index({ roomId: 1 });
bookingSchema.index({ bookingStatus: 1, paymentStatus: 1 });
bookingSchema.index({ checkIn: 1 });
bookingSchema.index({ checkOut: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;