import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import BookingService from '../services/BookingService.js';
import PricingService from '../services/PricingService.js';
import { Room } from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import ApiError from '../utils/ApiError.js';
import { PAGINATION } from '../utils/constants.js';

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await BookingService.createBooking({ userId: req.user._id, ...req.body });
  return ApiResponse.send(res, ApiResponse.created({ booking }, 'Booking created. Complete payment to confirm.'));
});

export const priceQuote = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.body.roomId);
  if (!room) throw ApiError.notFound('Room not found');
  const pricing = await PricingService.calculate({
    room,
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    rooms: req.body.rooms || 1,
    couponCode: req.body.couponCode,
    userId: req.user?._id,
  });
  return ApiResponse.send(res, ApiResponse.ok({ pricing }, 'Price quote'));
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const result = await BookingService.getMyBookings(req.user._id, { status: req.query.status, page, limit });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Bookings', { total: result.total, page, limit }));
});

export const bookingDetail = asyncHandler(async (req, res) => {
  const booking = await BookingService.getBookingById(req.params.id, { userId: req.user._id, role: req.user.role });
  return ApiResponse.send(res, ApiResponse.ok({ booking }, 'Booking'));
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await BookingService.cancelBooking({
    bookingId: req.params.id,
    userId: req.user._id,
    role: req.user.role,
    reason: req.body.reason || '',
  });
  return ApiResponse.send(res, ApiResponse.ok({ booking }, 'Booking cancelled'));
});

export const payAtHotel = asyncHandler(async (req, res) => {
  const booking = await BookingService.payAtHotel({
    bookingId: req.params.id,
    userId: req.user._id,
    role: req.user.role,
  });
  return ApiResponse.send(res, ApiResponse.ok({ booking }, 'Booking confirmed — pay at the property'));
});

export const hotelBookings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const result = await BookingService.getBookingsForHotel(req.params.hotelId, { status: req.query.status, page, limit });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Bookings', { total: result.total, page, limit }));
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  if (req.user.role === 'owner') {
    const booking = await BookingService.updateStatusByOwner({ bookingId: req.params.id, ownerId: req.user._id, status: req.body.status });
    return ApiResponse.send(res, ApiResponse.ok({ booking }, 'Booking updated'));
  }
  // Admin path
  const booking = await BookingService.getBookingById(req.params.id, { role: req.user.role });
  if (req.body.status === 'cancelled') {
    const updated = await BookingService.cancelBooking({ bookingId: req.params.id, userId: req.user._id, role: req.user.role, reason: req.body.reason || 'Admin cancellation' });
    return ApiResponse.send(res, ApiResponse.ok({ booking: updated }, 'Booking cancelled by admin'));
  }
  throw ApiError.badRequest('Unsupported admin transition', 'BAD_STATE');
});

export const adminBookings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const result = await BookingService.getBookingsForAdmin({ status: req.query.status, paymentStatus: req.query.paymentStatus, search: req.query.search, page, limit });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Bookings', { total: result.total, page, limit }));
});