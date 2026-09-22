import { Router } from 'express';
import authRoutes from './authRoutes.js';
import searchRoutes from './searchRoutes.js';
import hotelRoutes from './hotelRoutes.js';
import roomRoutes from './roomRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import couponRoutes from './couponRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import ownerRoutes from './ownerRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Wanderlust API is healthy', data: { uptime: process.uptime(), env: process.env.NODE_ENV || 'development' } });
});

router.use('/auth', authRoutes);
router.use('/search', searchRoutes);
router.use(hotelRoutes); // /hotels (public + owner), /owner/hotels, /upload/images
router.use('/rooms', roomRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/coupons', couponRoutes);
router.use('/notifications', notificationRoutes);
router.use('/owner', ownerRoutes);
router.use('/admin', adminRoutes);

export default router;