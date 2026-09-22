import mongoose from 'mongoose';
import { COUPON_DISCOUNT_TYPE } from '../utils/constants.js';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    description: { type: String, default: '', maxlength: 300 },
    discountType: {
      type: String,
      enum: Object.values(COUPON_DISCOUNT_TYPE),
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0.01 },
    minimumBookingAmount: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usersUsed: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
      },
    ],
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

couponSchema.index({ active: 1, startDate: 1, endDate: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;