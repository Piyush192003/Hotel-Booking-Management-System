import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import HotelService from '../services/HotelService.js';
import RoomService from '../services/RoomService.js';
import BookingService from '../services/BookingService.js';
import AnalyticsService from '../services/AnalyticsService.js';
import ReviewService from '../services/ReviewService.js';
import AuditLogService from '../services/AuditLogService.js';

export const ownerDashboard = asyncHandler(async (req, res) => {
  const hotels = await HotelService.listByOwner(req.user._id, {});
  const hotelIds = hotels.map((h) => h._id);
  const metrics = await AnalyticsService.ownerMetrics({ ownerId: req.user._id, hotelIds });
  return ApiResponse.send(res, ApiResponse.ok({ metrics, hotels }, 'Owner dashboard'));
});

export const ownerTrends = asyncHandler(async (req, res) => {
  const trends = await AnalyticsService.ownerTrends({ ownerId: req.user._id, days: Number(req.query.days) || 30 });
  return ApiResponse.send(res, ApiResponse.ok(trends, 'Owner trends'));
});

export const ownerBookings = asyncHandler(async (req, res) => {
  const hotels = await HotelService.listByOwner(req.user._id);
  const hotelIds = hotels.map((h) => h._id);
  const all = [];
  for (const id of hotelIds) {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 50);
    const result = await BookingService.getBookingsForHotel(id, { status: req.query.status || 'all', page, limit });
    all.push(...result.docs);
  }
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = all.length;
  return ApiResponse.send(res, ApiResponse.ok(all, 'Owner bookings', { total, page: Number(req.query.page) || 1 }));
});

export const ownerReviews = asyncHandler(async (req, res) => {
  const hotels = await HotelService.listByOwner(req.user._id);
  const hotelIds = hotels.map((h) => h._id);
  if (hotelIds.length === 0) {
    return ApiResponse.send(res, ApiResponse.ok([], 'Owner reviews', { total: 0, page: 1, limit: 20 }));
  }
  const result = await ReviewService.listForOwnerHotels(hotelIds, {
    page: Number(req.query.page) || 1,
    limit: 20,
  });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Owner reviews', { total: result.total, page: result.page, limit: result.limit }));
});

export const ownerHotel = asyncHandler(async (req, res) => {
  const hotel = await HotelService.getHotelById(req.params.id, { publicOnly: false });
  const rooms = await RoomService.listForHotel(req.params.id, { includeInactive: true });
  return ApiResponse.send(res, ApiResponse.ok({ hotel, rooms }, 'Property'));
});

export const ownerRevenueChart = asyncHandler(async (req, res) => {
  const trends = await AnalyticsService.ownerTrends({ ownerId: req.user._id, days: Number(req.query.days) || 30 });
  return ApiResponse.send(res, ApiResponse.ok(trends, 'Revenue chart'));
});