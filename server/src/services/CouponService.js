import Coupon from '../models/Coupon.js';
import ApiError from '../utils/ApiError.js';
import { COUPON_DISCOUNT_TYPE } from '../utils/constants.js';

/**
 * CouponService — validates and applies coupons server-side only.
 * The frontend never supplies a discount amount.
 */
class CouponService {
  round2 = (n) => Math.round(n * 100) / 100;

  async findByCode(code) {
    return Coupon.findOne({ code: String(code || '').trim().toUpperCase() });
  }

  async validateForBooking({ code, amount, userId }) {
    const coupon = await this.findByCode(code);
    if (!coupon) throw ApiError.badRequest('Invalid coupon code', 'COUPON_INVALID');

    const now = new Date();
    if (!coupon.active) throw ApiError.badRequest('This coupon is no longer active', 'COUPON_INACTIVE');
    if (coupon.startDate && coupon.startDate > now) throw ApiError.badRequest('This coupon is not active yet', 'COUPON_INACTIVE');
    if (coupon.endDate && coupon.endDate < now) throw ApiError.badRequest('This coupon has expired', 'COUPON_EXPIRED');

    if (amount < coupon.minimumBookingAmount) {
      throw ApiError.badRequest(
        `This coupon requires a minimum booking amount of ₹${coupon.minimumBookingAmount.toLocaleString('en-IN')}`,
        'COUPON_MINIMUM_NOT_MET',
      );
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw ApiError.badRequest('This coupon has reached its usage limit', 'COUPON_EXHAUSTED');
    }
    if (userId) {
      const entry = (coupon.usersUsed || []).find((u) => String(u.userId) === String(userId));
      if (entry && entry.count >= coupon.perUserLimit) {
        throw ApiError.badRequest('You have already used this coupon', 'COUPON_USER_LIMIT');
      }
    }

    let discountAmount;
    if (coupon.discountType === COUPON_DISCOUNT_TYPE.PERCENT) {
      discountAmount = (amount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }
    if (coupon.maximumDiscount > 0) discountAmount = Math.min(discountAmount, coupon.maximumDiscount);
    discountAmount = Math.min(this.round2(discountAmount), amount);

    return {
      _id: coupon._id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: this.round2(discountAmount),
    };
  }

  /** Increment usage counters after a successful paid booking. */
  async registerUsage(couponId, userId) {
    if (!couponId || !userId) return;
    await Coupon.findByIdAndUpdate(couponId, {
      $inc: { usedCount: 1 },
    });
    await Coupon.updateOne(
      { _id: couponId, 'usersUsed.userId': userId },
      { $inc: { 'usersUsed.$.count': 1 } },
    );
    await Coupon.updateOne(
      { _id: couponId, 'usersUsed.userId': { $ne: userId } },
      { $push: { usersUsed: { userId, count: 1 } } },
    );
  }

  async listForAdmin({ page = 1, limit = 20, search }) {
    const query = {};
    if (search) query.code = new RegExp(search, 'i');
    const [docs, total] = await Promise.all([
      Coupon.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Coupon.countDocuments(query),
    ]);
    return { docs, total, page, limit };
  }
}

export default new CouponService();