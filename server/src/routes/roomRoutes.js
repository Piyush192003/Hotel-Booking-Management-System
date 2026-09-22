import { Router } from 'express';
import * as roomCtrl from '../controllers/searchController.js';
import * as hotelCtrl from '../controllers/hotelController.js';
import { authenticateUser, authorizeRole, authorizeResourceOwner } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updateRoomValidator } from '../validators/roomValidator.js';
import { checkAvailabilityValidator } from '../validators/bookingValidator.js';
import { Room, Hotel } from '../models/Hotel.js';
import ApiResponse from '../utils/ApiResponse.js';
import UploadService from '../services/UploadService.js';
import RoomService from '../services/RoomService.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';

const router = Router();
const uploadImageArray = uploadImage.array('images', 10);

const roomHotelOwner = async (req) => {
  const room = await Room.findById(req.params.id);
  if (!room) return undefined;
  const hotel = await Hotel.findById(room.hotelId);
  return hotel?.ownerId;
};

// Public
router.get('/availability/:roomId', validate(checkAvailabilityValidator), roomCtrl.roomAvailability);

// Owner-only room management
router.use(authenticateUser, authorizeRole('owner', 'admin'));

router.put('/:id', validate(updateRoomValidator), authorizeResourceOwner(roomHotelOwner), async (req, res, next) => {
  try {
    if (req.body.removeImages) {
      const room = await Room.findById(req.params.id);
      if (room) {
        room.images = (room.images || []).filter((url) => !req.body.removeImages.includes(url));
        await room.save();
      }
    }
    const room = await RoomService.updateRoom(req.params.id, req.body);
    return ApiResponse.send(res, ApiResponse.ok({ room }, 'Room updated'));
  } catch (err) {
    return next(err);
  }
});
router.delete('/:id', authorizeResourceOwner(roomHotelOwner), hotelCtrl.deleteRoom);
router.post('/upload', uploadImageArray, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded', code: 'UPLOAD_ERROR' });
    }
    const uploads = await UploadService.uploadMany(req.files, 'wanderlust/rooms');
    return res.json({ success: true, message: 'Uploaded', data: { urls: uploads.map((u) => u.url) } });
  } catch (err) {
    return next(err);
  }
});

export default router;