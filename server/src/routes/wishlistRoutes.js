import { Router } from 'express';
import * as wishlist from '../controllers/wishlistController.js';
import { authenticateUser, optionalAuthenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/status/:hotelId', optionalAuthenticate, wishlist.wishlistStatus);
router.use(authenticateUser);
router.get('/', wishlist.getWishlist);
router.post('/:hotelId', wishlist.addToWishlist);
router.delete('/:hotelId', wishlist.removeFromWishlist);

export default router;