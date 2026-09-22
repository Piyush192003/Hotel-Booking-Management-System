import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import CouponService from '../services/CouponService.js';
import Coupon from '../models/Coupon.js';
import AuditLogService from '../services/AuditLogService.js';
import ApiError from '../utils/ApiError.js';

export const validateCoupon = asyncHandler(async (req, res) => {
  const coupon = await CouponService.validateForBooking({
    code: req.body.code,
    amount: req.body.amount,
    userId: req.user?._id,
  });
  return ApiResponse.send(res, ApiResponse.ok(coupon, 'Coupon is valid'));
});

export const adminListCoupons = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const result = await CouponService.listForAdmin({ search: req.query.search, page, limit: 20 });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Coupons', { total: result.total, page }));
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase(), createdBy: req.user._id });
  await AuditLogService.record({ userId: req.user._id, email: req.user.email, action: 'coupon_created', resource: 'coupon', resourceId: coupon._id, metadata: { code: coupon.code }, ip: req.ip });
  return ApiResponse.send(res, ApiResponse.created(coupon, 'Coupon created'));
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  const allowed = ['description', 'discountType', 'discountValue', 'minimumBookingAmount', 'maximumDiscount', 'startDate', 'endDate', 'usageLimit', 'perUserLimit', 'active'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) coupon[key] = req.body[key];
  }
  await coupon.save();
  await AuditLogService.record({ userId: req.user._id, email: req.user.email, action: 'coupon_updated', resource: 'coupon', resourceId: coupon._id, metadata: { code: coupon.code }, ip: req.ip });
  return ApiResponse.send(res, ApiResponse.ok(coupon, 'Coupon updated'));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  await coupon.deleteOne();
  await AuditLogService.record({ userId: req.user._id, email: req.user.email, action: 'coupon_deleted', resource: 'coupon', resourceId: coupon._id, metadata: { code: coupon.code }, ip: req.ip });
  return ApiResponse.send(res, ApiResponse.ok(null, 'Coupon deleted'));
});