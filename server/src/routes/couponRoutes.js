import { Router } from 'express';
import * as coupon from '../controllers/couponController.js';
import { optionalAuthenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { validateCouponValidator } from '../validators/couponValidator.js';

const router = Router();

// Public coupon validation (used by checkout)
router.post('/validate', optionalAuthenticate, validate(validateCouponValidator), coupon.validateCoupon);

export default router;