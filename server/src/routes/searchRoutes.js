import { Router } from 'express';
import * as search from '../controllers/searchController.js';
import { authenticateUser, authorizeRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public search & discovery
router.get('/hotels', search.searchHotels);
router.get('/hotels/collections', search.hotelCollections);
router.get('/hotels/:identifier', search.getPublicHotel);
router.get('/rooms/:id/availability', search.roomAvailability);
router.get('/hotels/:hotelId/rooms-availability', search.roomsForBooking);

// Audited logs (admin)
router.use((req, res, next) => {
  if (req.path.startsWith('/audit')) return authenticateUser(req, res, (e) => (e ? next(e) : authorizeRole('admin')(req, res, next)));
  return next();
});
router.get('/audit-logs', search.auditLogs);

export default router;