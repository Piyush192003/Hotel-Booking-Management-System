import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import { Hotel } from '../models/Hotel.js';
import ApiError from '../utils/ApiError.js';
import { BOOKING_STATUS, REVIEW_STATUS, HOTEL_STATUS, REVIEW_MAX_PER_BOOKING } from '../utils/constants.js';

class ReviewService {
  /** Only guests with an eligible (confirmed/completed) stay may review. */
  async assertEligible({ userId, hotelId, bookingId }) {
    const booking = await Booking.findOne({ _id: bookingId, userId, hotelId });
    if (!booking) throw ApiError.forbidden('Booking not found for this review', 'NOT_ELIGIBLE');
    const eligible = [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED].includes(booking.bookingStatus);
    if (!eligible) {
      throw ApiError.forbidden('You can only review stays that are confirmed or completed', 'NOT_ELIGIBLE');
    }
    if (booking.checkOut && new Date(booking.checkOut).getTime() > new Date().setHours(0, 0, 0, 0)) {
      throw ApiError.forbidden('Your stay has not finished yet', 'NOT_ELIGIBLE');
    }
    const existing = await Review.findOne({ bookingId });
    if (existing) throw ApiError.conflict('You already reviewed this stay', 'REVIEW_EXISTS');
    return booking;
  }

  async create({ userId, hotelId, bookingId, rating, cleanliness, location, service, value, title, comment }) {
    let booking = null;
    if (bookingId) {
      // Verified-stay path: the booking must belong to the user and be finished.
      booking = await this.assertEligible({ userId, hotelId, bookingId });
    } else {
      // Open path: any signed-in user may rate an approved hotel once.
      const hotel = await Hotel.findOne({ _id: hotelId, status: HOTEL_STATUS.APPROVED }).lean();
      if (!hotel) throw ApiError.notFound('Hotel not available for reviews');
      const existing = await Review.findOne({ userId, hotelId, bookingId: null });
      if (existing) throw ApiError.conflict('You already reviewed this hotel', 'REVIEW_EXISTS');
    }
    const review = await Review.create({
      userId,
      hotelId,
      bookingId: bookingId || undefined,
      bookingNumber: booking?.bookingNumber || '',
      rating,
      cleanliness: cleanliness ?? rating,
      location: location ?? rating,
      service: service ?? rating,
      value: value ?? rating,
      title,
      comment,
      status: REVIEW_STATUS.ACTIVE,
    });
    await this.recalcHotelRating(hotelId);
    return review;
  }

  async listForHotel(hotelId, { page = 1, limit = 10 }) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Math.max(1, Number(limit) || 10), 50);
    const [docs, total] = await Promise.all([
            Review.find({ hotelId, status: REVIEW_STATUS.ACTIVE })
        .populate('userId', 'name avatar')
        .populate('comments.userId', '_id name avatar')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ hotelId, status: REVIEW_STATUS.ACTIVE }),
    ]);
    return { docs, total, page: pageNum, limit: limitNum };
  }

  async listForUser(userId, { page = 1, limit = 10 }) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Math.max(1, Number(limit) || 10), 50);
    const query = { userId };
    const [docs, total] = await Promise.all([
                  Review.find(query).populate('userId', 'name email avatar').populate('hotelId', 'name city images').populate('comments.userId', '_id name avatar').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Review.countDocuments(query),
    ]);
    return { docs, total, page: pageNum, limit: limitNum };
  }

  async listForOwnerHotels(hotelIds, { page = 1, limit = 20 }) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Math.max(1, Number(limit) || 20), 50);
    const objectIds = hotelIds.map((id) => new mongoose.Types.ObjectId(id));
    const query = { hotelId: { $in: objectIds } };
    const [docs, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'name email avatar')
        .populate('hotelId', 'name')
                .populate('comments.userId', '_id name avatar')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);
    return { docs, total, page: pageNum, limit: limitNum };
  }

  async listForAdmin({ status, page = 1, limit = 20, search }) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Math.max(1, Number(limit) || 20), 50);
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (search) {
      const userIds = await mongoose.model('User').find({ name: new RegExp(search, 'i') }).select('_id').limit(20).lean();
      query.$or = [{ comment: new RegExp(search, 'i') }, { userId: { $in: userIds.map((u) => u._id) } }];
    }
    const [docs, total] = await Promise.all([
            Review.find(query).populate('userId', 'name email').populate('hotelId', 'name').populate('comments.userId', '_id name avatar').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Review.countDocuments(query),
    ]);
    return { docs, total, page: pageNum, limit: limitNum };
  }

  async update(userId, reviewId, patch) {
    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) throw ApiError.notFound('Review not found');
    const allowed = ['rating', 'cleanliness', 'location', 'service', 'value', 'title', 'comment'];
    for (const key of allowed) {
      if (patch[key] !== undefined) review[key] = patch[key];
    }
    await review.save();
    await this.recalcHotelRating(review.hotelId);
    return review;
  }

  async delete(userId, reviewId, { admin = false } = {}) {
    const review = admin ? await Review.findById(reviewId) : await Review.findOne({ _id: reviewId, userId });
    if (!review) throw ApiError.notFound('Review not found');
    await review.deleteOne();
    await this.recalcHotelRating(review.hotelId);
  }

  async replyByOwner({ reviewId, hotelOwnerId, text }) {
    const review = await Review.findById(reviewId).populate('hotelId', 'ownerId');
    if (!review) throw ApiError.notFound('Review not found');
    if (String(review.hotelId.ownerId) !== String(hotelOwnerId)) {
      throw ApiError.forbidden('You do not own this hotel');
    }
    review.ownerReply = { text, repliedAt: new Date() };
    await review.save();
    return review;
  }

  async moderate(reviewId, status) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');
    review.status = status;
    await review.save();
    if (status === REVIEW_STATUS.HIDDEN) await this.recalcHotelRating(review.hotelId);
    return review;
  }

  async _populateReview(review) {
    return review.populate([
      { path: 'userId', select: 'name avatar' },
      { path: 'comments.userId', select: '_id name avatar' },
    ]);
  }

  async addComment({ reviewId, userId, text }) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');
    if (review.status !== REVIEW_STATUS.ACTIVE) throw ApiError.forbidden('Cannot comment on a hidden review');
    review.comments.push({ userId, text });
    await review.save();
    return this._populateReview(review);
  }

  async updateComment({ reviewId, commentId, userId, text }) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');
    const comment = review.comments.id(commentId);
    if (!comment) throw ApiError.notFound('Comment not found');
    if (String(comment.userId) !== String(userId)) {
      throw ApiError.forbidden('You can only edit your own comments');
    }
    comment.text = text;
    await review.save();
    return this._populateReview(review);
  }

  async deleteComment({ reviewId, commentId, userId, isAdmin = false }) {
    const review = await Review.findById(reviewId);
    if (!review) throw ApiError.notFound('Review not found');
    const comment = review.comments.id(commentId);
    if (!comment) throw ApiError.notFound('Comment not found');
    if (String(comment.userId) !== String(userId) && !isAdmin) {
      throw ApiError.forbidden('You can only delete your own comments');
    }
    comment.deleteOne();
    await review.save();
    return this._populateReview(review);
  }

  /** Recompute a hotel's aggregate rating + count from active reviews. */
  async recalcHotelRating(hotelId) {
    const result = await Review.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId), status: REVIEW_STATUS.ACTIVE } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const agg = result[0];
    await Hotel.findByIdAndUpdate(hotelId, {
      $set: { rating: agg ? Math.round(agg.avg * 10) / 10 : 0, reviewCount: agg ? agg.count : 0 },
    });
  }
}

export default new ReviewService();