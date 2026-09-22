import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_PROVIDERS } from '../utils/constants.js';

const refundSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: Object.values(PAYMENT_PROVIDERS) },
    providerRefundId: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    reason: { type: String, default: '' },
    status: { type: String, default: 'processed' },
    processedAt: { type: Date },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    provider: { type: String, enum: Object.values(PAYMENT_PROVIDERS), required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    orderId: { type: String, default: '' }, // provider order id (or mock_...)
    paymentId: { type: String, default: '' }, // provider payment id
    signature: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    method: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    refunds: { type: [refundSchema], default: [] },
    webhookReceivedAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;