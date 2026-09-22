import { Router } from 'express';
import * as admin from '../controllers/adminController.js';
import * as hotelCtrl from '../controllers/hotelController.js';
import * as bookingCtrl from '../controllers/bookingController.js';
import * as reviewCtrl from '../controllers/reviewController.js';
import { authenticateUser, authorizeRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { adminListValidator, blockUserValidator, changeRoleValidator } from '../validators/userValidator.js';
import { reviewHotelValidator } from '../validators/hotelValidator.js';
import { moderateReviewValidator } from '../validators/reviewValidator.js';
import { createCouponValidator, updateCouponValidator, couponParamValidator } from '../validators/couponValidator.js';
import * as couponCtrl from '../controllers/couponController.js';

const router = Router();
router.use(authenticateUser, authorizeRole('admin'));

// Dashboard / analytics
router.get('/dashboard', admin.adminDashboard);
router.get('/trends', admin.adminTrends);
router.get('/audit-logs', admin.adminAuditLogs);

// Users
router.get('/users', admin.listUsers);
router.patch('/users/:id/block', validate(blockUserValidator), admin.toggleBlockUser);
router.patch('/users/:id/role', validate(changeRoleValidator), admin.changeUserRole);
router.get('/users/:id/bookings', admin.listAdminUsersBookings);
router.get('/users/:id/reviews', admin.listAdminUserReviews);

// Hotels
router.get('/hotels', async (req, res, next) => {
  const Hotel = (await import('../models/Hotel.js')).Hotel;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.$or = [{ name: new RegExp(req.query.search, 'i') }, { city: new RegExp(req.query.search, 'i') }];
  const [docs, total] = await Promise.all([
    Hotel.find(query).populate('ownerId', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Hotel.countDocuments(query),
  ]);
  return res.json({ success: true, message: 'Hotels', data: docs, meta: { total, page, limit } });
});
router.get('/hotels/:id', hotelCtrl.getOwnedHotel);
router.patch('/hotels/:id/status', validate(reviewHotelValidator), hotelCtrl.hotelStatus);

// Bookings
router.get('/bookings', bookingCtrl.adminBookings);
router.get('/bookings/:id', bookingCtrl.bookingDetail);
router.patch('/bookings/:id/status', bookingCtrl.updateBookingStatus);
router.post('/bookings/:id/cancel', bookingCtrl.cancelBooking);

// Payments & refunds
router.get('/payments', admin.listPayments);
router.get('/refunds', admin.listRefunds);

// Reviews
router.get('/reviews', reviewCtrl.adminReviews);
router.patch('/reviews/:id/moderate', validate(moderateReviewValidator), reviewCtrl.moderateReview);

// Coupons
router.get('/coupons', couponCtrl.adminListCoupons);
router.post('/coupons', validate(createCouponValidator), couponCtrl.createCoupon);
router.patch('/coupons/:id', validate([...couponParamValidator, ...updateCouponValidator]), couponCtrl.updateCoupon);
router.delete('/coupons/:id', validate(couponParamValidator), couponCtrl.deleteCoupon);

export default router;