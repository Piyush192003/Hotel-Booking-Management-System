import { Router } from 'express';
import * as owner from '../controllers/ownerController.js';
import { authenticateUser, authorizeRole } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticateUser, authorizeRole('owner'));
router.get('/dashboard', owner.ownerDashboard);
router.get('/trends', owner.ownerTrends);
router.get('/bookings', owner.ownerBookings);
router.get('/reviews', owner.ownerReviews);
router.get('/properties/:id', owner.ownerHotel);
router.get('/revenue', owner.ownerRevenueChart);

export default router;