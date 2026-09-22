import { Router } from 'express';
import * as bookingCtrl from '../controllers/bookingController.js';
import { authenticateUser, authorizeRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createBookingValidator, cancelBookingValidator, updateBookingStatusValidator, checkAvailabilityValidator } from '../validators/bookingValidator.js';
import { Hotel } from '../models/Hotel.js';

const router = Router();

router.use(authenticateUser);

router.post('/', validate(createBookingValidator), bookingCtrl.createBooking);
router.post('/price-quote', bookingCtrl.priceQuote);
router.get('/my', bookingCtrl.listMyBookings);
router.get('/:id', bookingCtrl.bookingDetail);
router.post('/:id/pay-at-hotel', bookingCtrl.payAtHotel);
router.patch('/:id/cancel', validate(cancelBookingValidator), bookingCtrl.cancelBooking);

// Owner-route for hotel bookings (ownership validated per hotel)
router.use('/hotel/:hotelId', authorizeRole('owner', 'admin'));
router.get('/hotel/:hotelId', async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found', code: 'NOT_FOUND' });
  if (String(hotel.ownerId) !== String(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not manage this hotel', code: 'FORBIDDEN' });
  }
  return bookingCtrl.hotelBookings(req, res, next);
});

// Owner can update booking status (completed / no_show)
router.patch('/:id/status', authorizeRole('owner', 'admin'), validate(updateBookingStatusValidator), bookingCtrl.updateBookingStatus);

export default router;