import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { uploadAvatar as avatarUploadController } from '../controllers/uploadController.js';
import { authenticateUser, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator, verifyEmailValidator, resendVerificationValidator, changePasswordValidator, updateProfileValidator } from '../validators/authValidator.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/register', authLimiter, validate(registerValidator), auth.register);
router.post('/login', authLimiter, validate(loginValidator), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', optionalAuthenticate, auth.logout);
router.get('/me', authenticateUser, auth.getMe);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordValidator), auth.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidator), auth.resetPassword);
router.post('/verify-email', validate(verifyEmailValidator), auth.verifyEmail);
router.post('/resend-verification', forgotPasswordLimiter, validate(resendVerificationValidator), auth.resendVerification);
router.post('/change-password', authenticateUser, validate(changePasswordValidator), auth.changePassword);
router.patch('/profile', authenticateUser, validate(updateProfileValidator), auth.updateProfile);
router.post('/avatar', authenticateUser, uploadAvatar, avatarUploadController);

export default router;