import mongoose from 'mongoose';
import { REVIEW_STATUS } from '../utils/constants.js';

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: true },
);

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    // Optional: guests with an eligible stay attach a booking; any signed-in
    // user may also review an approved hotel without one.
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: undefined },
    bookingNumber: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5, default: 5 },
    location: { type: Number, min: 1, max: 5, default: 5 },
    service: { type: Number, min: 1, max: 5, default: 5 },
    value: { type: Number, min: 1, max: 5, default: 5 },
    title: { type: String, default: '', maxlength: 160 },
    comment: { type: String, required: true, minlength: 10, maxlength: 3000 },
    ownerReply: {
      text: { type: String, default: '', maxlength: 2000 },
      repliedAt: { type: Date },
    },
    comments: { type: [commentSchema], default: [] },
    status: { type: String, enum: Object.values(REVIEW_STATUS), default: REVIEW_STATUS.ACTIVE, index: true },
  },
  { timestamps: true },
);

// One review per booking (a booking is owned by exactly one user). Sparse so
// booking-less reviews (any user may rate an approved hotel) don't collide.
reviewSchema.index({ bookingId: 1 }, { unique: true, sparse: true });
reviewSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });

const Review = mongoose.model('Review', reviewSchema);
export default Review;