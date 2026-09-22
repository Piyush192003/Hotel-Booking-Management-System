import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import AnalyticsService from '../services/AnalyticsService.js';
import AuditLogService from '../services/AuditLogService.js';
import User from '../models/User.js';
import { Hotel } from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import NotificationService from '../services/NotificationService.js';

export const adminDashboard = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.adminDashboard();
  return ApiResponse.send(res, ApiResponse.ok(data, 'Admin dashboard'));
});

export const adminTrends = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.platformTrends({ days: Number(req.query.days) || 30 });
  return ApiResponse.send(res, ApiResponse.ok(data, 'Platform trends'));
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const query = {};
  if (req.query.role) query.role = req.query.role;
  if (req.query.status === 'blocked') query.isBlocked = true;
  if (req.query.status === 'active') query.isBlocked = false;
  if (req.query.search) query.$or = [{ name: new RegExp(req.query.search, 'i') }, { email: new RegExp(req.query.search, 'i') }];
  const [docs, total] = await Promise.all([
    User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(query),
  ]);
  return ApiResponse.send(res, ApiResponse.ok(docs, 'Users', { total, page, limit }));
});

export const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.forbidden('Admins cannot be blocked');
  user.isBlocked = Boolean(req.body.blocked);
  await user.save({ timestamps: false });
  await AuditLogService.record({
    userId: req.user._id, email: req.user.email,
    action: user.isBlocked ? 'user_blocked' : 'user_unblocked',
    resource: 'user', resourceId: user._id, metadata: { reason: req.body.reason || '' }, ip: req.ip,
  });
  if (user.isBlocked) {
    await NotificationService.createMany({ userIds: [user._id], type: 'system', title: 'Account blocked', message: 'Your account has been blocked. Contact support for details.' });
  }
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON() }, user.isBlocked ? 'User blocked' : 'User unblocked'));
});

export const changeUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  user.role = req.body.role;
  await user.save({ timestamps: false });
  await AuditLogService.record({ userId: req.user._id, email: req.user.email, action: 'user_role_changed', resource: 'user', resourceId: user._id, metadata: { role: req.body.role }, ip: req.ip });
  return ApiResponse.send(res, ApiResponse.ok({ user: user.toSafeJSON() }, 'Role updated'));
});

export const listAdminUsersBookings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const [docs, total] = await Promise.all([
    Booking.find({ userId: req.params.id }).populate('hotelId', 'name').populate('roomId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments({ userId: req.params.id }),
  ]);
  return ApiResponse.send(res, ApiResponse.ok(docs, 'User bookings', { total, page, limit }));
});

export const listAdminUserReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const [docs, total] = await Promise.all([
    Review.find({ userId: req.params.id }).populate('hotelId', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments({ userId: req.params.id }),
  ]);
  return ApiResponse.send(res, ApiResponse.ok(docs, 'User reviews', { total, page, limit }));
});

export const listPayments = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const [docs, total] = await Promise.all([
    Payment.find(query).populate('bookingId', 'bookingNumber').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Payment.countDocuments(query),
  ]);
  return ApiResponse.send(res, ApiResponse.ok(docs, 'Payments', { total, page, limit }));
});

export const listRefunds = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const [docs, total] = await Promise.all([
    Payment.find({ refunds: { $exists: true, $not: { $size: 0 } } }).populate('bookingId', 'bookingNumber').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Payment.countDocuments({ refunds: { $exists: true, $not: { $size: 0 } } }),
  ]);
  return ApiResponse.send(res, ApiResponse.ok(docs, 'Refunds', { total, page, limit }));
});

export const adminAuditLogs = asyncHandler(async (req, res) => {
  const result = await AuditLogService.list({ ...req.query });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Audit logs', { total: result.total, page: result.page, limit: result.limit }));
});