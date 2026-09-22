import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import HotelService from '../services/HotelService.js';
import RoomService from '../services/RoomService.js';
import ReviewService from '../services/ReviewService.js';
import AuditLogService from '../services/AuditLogService.js';
import NotificationService from '../services/NotificationService.js';
import EmailService from '../services/EmailService.js';
import emailTemplates from '../templates/emails.js';

export const searchHotels = asyncHandler(async (req, res) => {
  const result = await HotelService.searchHotels({ ...req.query, amenities: req.query.amenities ? req.query.amenities.split(',') : [] });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Hotels found', {
    total: result.total, page: result.page, limit: result.limit, pages: result.pages, destination: result.destination,
  }));
});

export const getPublicHotel = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
  const hotel = isObjectId
    ? await HotelService.getHotelById(identifier, { publicOnly: true })
    : await HotelService.getPublicHotelBySlug(identifier);
  const rooms = await RoomService.listForHotel(hotel._id, { includeInactive: false });
  const reviewsResult = await ReviewService.listForHotel(hotel._id, { page: 1, limit: 6 });
  return ApiResponse.send(res, ApiResponse.ok({ hotel, rooms, reviews: reviewsResult.docs, reviewCount: reviewsResult.total }, 'Hotel details'));
});

export const hotelCollections = asyncHandler(async (req, res) => {
  const data = await HotelService.collections();
  return ApiResponse.send(res, ApiResponse.ok(data, 'Collections'));
});

export const roomDetail = asyncHandler(async (req, res) => {
  const room = await RoomService.getById(req.params.id);
  return ApiResponse.send(res, ApiResponse.ok({ room }, 'Room'));
});

export const roomAvailability = asyncHandler(async (req, res) => {
  const report = await RoomService.checkAvailability(req.params.id, req.query.checkIn, req.query.checkOut, req.query.rooms);
  return ApiResponse.send(res, ApiResponse.ok(report, 'Availability'));
});

export const roomsForBooking = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { checkIn, checkOut } = req.query;
  const guests = { adults: Number(req.query.adults || 1), children: Number(req.query.children || 0) };
  const rooms = Number(req.query.rooms || 1);
  const data = await RoomService.listForBooking(hotelId, checkIn, checkOut, guests, rooms);
  return ApiResponse.send(res, ApiResponse.ok(data, 'Rooms with availability'));
});

export const auditLogs = asyncHandler(async (req, res) => {
  const result = await AuditLogService.list({ ...req.query });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Audit logs', { total: result.total, page: result.page, limit: result.limit }));
});