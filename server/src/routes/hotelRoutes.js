import { Router } from 'express';
import * as hotelCtrl from '../controllers/hotelController.js';
import * as searchCtrl from '../controllers/searchController.js';
import { authenticateUser, authorizeRole, authorizeResourceOwner } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createHotelValidator, updateHotelValidator } from '../validators/hotelValidator.js';
import { createRoomValidator } from '../validators/roomValidator.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';
import { Hotel } from '../models/Hotel.js';
import UploadService from '../services/UploadService.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

const router = Router();
const hotelOwner = (req) => Hotel.findById(req.params.id || req.params.hotelId).then((h) => h?.ownerId);

const uploadImagesHelper = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      req.uploadedUrls = [];
      return next();
    }
    const uploads = await UploadService.uploadMany(req.files, 'wanderlust/hotels');
    req.uploadedUrls = uploads.map((u) => u.url);
    return next();
  } catch (err) {
    return next(err);
  }
};

// ---------- Public ----------
router.get('/hotels', searchCtrl.searchHotels);
router.get('/hotels/collections', searchCtrl.hotelCollections);
router.get('/hotels/:identifier', searchCtrl.getPublicHotel);
router.get('/hotels/:hotelId/rooms', async (req, res, next) => {
  const { listForHotel } = await import('../services/RoomService.js').then((m) => m.default);
  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found', code: 'NOT_FOUND' });
  const isOwnerOrAdmin = req.user && (String(hotel.ownerId) === String(req.user._id) || req.user.role === 'admin');
  const rooms = await listForHotel(hotel._id, { includeInactive: Boolean(isOwnerOrAdmin && req.query.includeInactive === 'true') });
  return res.json({ success: true, message: 'Rooms', data: { rooms, hotelId: hotel._id } });
});

// ---------- Authenticated ----------
router.use(authenticateUser);

// Image upload helper (shared by hotel/room image endpoints)
router.post('/upload/images', uploadImage.array('images', 10), uploadImagesHelper, async (req, res) => {
  if (!req.uploadedUrls || req.uploadedUrls.length === 0) {
    throw ApiError.badRequest('No files were uploaded', 'UPLOAD_ERROR');
  }
  return ApiResponse.send(res, ApiResponse.created({ urls: req.uploadedUrls }, 'Images uploaded'));
});

// ---------- Owner hotel management ----------
router.post('/hotels', authorizeRole('owner'), validate(createHotelValidator), hotelCtrl.createHotel);
router.get('/owner/hotels', authorizeRole('owner'), hotelCtrl.listOwnedHotels);
router.get('/owner/hotels/:id', authorizeRole('owner'), authorizeResourceOwner(hotelOwner), hotelCtrl.getOwnedHotel);
router.put('/hotels/:id', authorizeRole('owner'), authorizeResourceOwner(hotelOwner), validate(updateHotelValidator), hotelCtrl.updateHotel);
router.delete('/hotels/:id', authorizeRole('owner'), authorizeResourceOwner(hotelOwner), hotelCtrl.deleteHotel);
router.post('/hotels/:id/submit', authorizeRole('owner'), authorizeResourceOwner(hotelOwner), hotelCtrl.submitForApproval);
router.patch('/hotels/:id/images', authorizeRole('owner'), authorizeResourceOwner(hotelOwner), uploadImage.array('images', 10), uploadImagesHelper, hotelCtrl.addHotelImages);

// ---------- Rooms under a hotel ----------
router.post('/hotels/:hotelId/rooms', authorizeRole('owner', 'admin'), uploadImage.array('images', 10), uploadImagesHelper, validate(createRoomValidator), hotelCtrl.createRoom);

export default router;