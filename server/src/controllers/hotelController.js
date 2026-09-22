import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import HotelService from '../services/HotelService.js';
import RoomService from '../services/RoomService.js';
import ReviewService from '../services/ReviewService.js';
import AuditLogService from '../services/AuditLogService.js';
import WishlistService from '../services/WishlistService.js';
import NotificationService from '../services/NotificationService.js';
import EmailService from '../services/EmailService.js';
import emailTemplates from '../templates/emails.js';
import { HOTEL_STATUS } from '../utils/constants.js';
import { ROLES } from '../utils/constants.js';

const ROLES_IMPORT = ROLES;

export const createHotel = asyncHandler(async (req, res) => {
  const hotel = await HotelService.createHotel(req.user._id, req.body);
  return ApiResponse.send(res, ApiResponse.created({ hotel }, 'Property created. It will appear publicly once approved.'));
});

export const updateHotel = asyncHandler(async (req, res) => {
  const hotel = await HotelService.updateHotel(req.params.id, req.body);
  return ApiResponse.send(res, ApiResponse.ok({ hotel }, 'Hotel updated successfully'));
});

export const getOwnedHotel = asyncHandler(async (req, res) => {
  const { publicOnly = false } = req.query;
  const hotel = await HotelService.getHotelById(req.params.id, { publicOnly: publicOnly === 'true' });
  return ApiResponse.send(res, ApiResponse.ok({ hotel }, 'Hotel'));
});

export const getHotel = asyncHandler(async (req, res) => {
  const hotel = await HotelService.getHotelById(req.params.id, { publicOnly: true });
  return ApiResponse.send(res, ApiResponse.ok({ hotel }, 'Hotel'));
});

export const listOwnedHotels = asyncHandler(async (req, res) => {
  const hotels = await HotelService.listByOwner(req.user._id, { status: req.query.status });
  return ApiResponse.send(res, ApiResponse.ok({ hotels }, 'Your properties'));
});

export const deleteHotel = asyncHandler(async (req, res) => {
  await HotelService.deleteHotel(req.params.id);
  return ApiResponse.send(res, ApiResponse.ok(null, 'Hotel deleted'));
});

export const listHotelRooms = asyncHandler(async (req, res) => {
  const rooms = await RoomService.listForHotel(req.params.hotelId, { includeInactive: true });
  return ApiResponse.send(res, ApiResponse.ok({ rooms, hotelId: req.params.hotelId }, 'Rooms'));
});

export const submitForApproval = asyncHandler(async (req, res) => {
  const hotel = await HotelService.getHotelById(req.params.id, { publicOnly: false });
  hotel.status = HOTEL_STATUS.PENDING;
  hotel.submittedAt = new Date();
  await hotel.save();
  return ApiResponse.send(res, ApiResponse.ok({ hotel }, 'Property submitted for approval'));
});

export const addHotelImages = asyncHandler(async (req, res) => {
  const hotel = await HotelService.getHotelById(req.params.id, { publicOnly: false });
  if (req.uploadedUrls && req.uploadedUrls.length) {
    hotel.images = [...hotel.images, ...req.uploadedUrls].slice(0, 12);
    await hotel.save();
  }
  return ApiResponse.send(res, ApiResponse.ok({ hotel }, 'Images updated'));
});

export const createRoom = asyncHandler(async (req, res) => {
  const hotel = await HotelService.getHotelById(req.params.hotelId, { publicOnly: false });
  // ownership enforced by route middleware
  const room = await RoomService.createRoom(hotel._id, { ...req.body, images: req.uploadedUrls || req.body.images });
  return ApiResponse.send(res, ApiResponse.created({ room }, 'Room created'));
});

export const updateRoom = asyncHandler(async (req, res) => {
  const room = await RoomService.updateRoom(req.params.id, { ...req.body, images: req.uploadedUrls || undefined });
  return ApiResponse.send(res, ApiResponse.ok({ room }, 'Room updated'));
});

export const deleteRoom = asyncHandler(async (req, res) => {
  await RoomService.deleteRoom(req.params.id);
  return ApiResponse.send(res, ApiResponse.ok(null, 'Room deactivated'));
});

export const hotelReviews = asyncHandler(async (req, res) => {
  const result = await ReviewService.listForHotel(req.params.hotelId, {
    page: req.query.page,
    limit: req.query.limit,
  });
  return ApiResponse.send(res, ApiResponse.ok(result.docs, 'Reviews', { total: result.total, page: result.page, limit: result.limit }));
});

export const hotelStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  const hotel = await HotelService.setStatus(id, status, { rejectionReason, actorId: req.user._id, ip: req.ip });
  await AuditLogService.record({ userId: req.user._id, email: req.user.email, action: `property_${status}`, resource: 'hotel', resourceId: id, metadata: { rejectionReason }, ip: req.ip });
  await NotificationService.createMany({
    userIds: [hotel.ownerId],
    type: status === HOTEL_STATUS.APPROVED ? 'property_approved' : 'property_rejected',
    title: `Property ${status === HOTEL_STATUS.APPROVED ? 'approved' : status === HOTEL_STATUS.REJECTED ? 'rejected' : status}`,
    message: `Your property "${hotel.name}" was ${status === HOTEL_STATUS.APPROVED ? 'approved' : status === HOTEL_STATUS.REJECTED ? `rejected. ${rejectionReason || ''}` : status}.`,
    link: '/owner/properties',
  });
  const owner = await mongoose_user(hotel.ownerId);
  if (owner) {
    await EmailService.send({ to: owner.email, subject: `Wanderlust: "${hotel.name}" ${status}`, html: emailTemplates.propertyStatus({ name: owner.name, hotelName: hotel.name, status, reason: rejectionReason }) }).catch(() => {});
  }
  return ApiResponse.send(res, ApiResponse.ok({ hotel }, `Hotel ${status}`));
});

async function mongoose_user(id) {
  const User = (await import('../models/User.js')).default;
  return User.findById(id).lean();
}

export { ROLES_IMPORT };