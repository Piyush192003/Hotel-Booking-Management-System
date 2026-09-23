import { Router } from 'express';
import * as settings from '../controllers/settingsController.js';
import { authenticateUser, authorizeRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  settingsPatchValidator,
  ownerBusinessValidator,
  deleteAccountValidator,
  platformPatchValidator,
} from '../validators/settingsValidator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Every settings route requires a signed-in user — role checks are per route.
router.use(authenticateUser);

router.get('/', settings.getSettings);
router.patch('/', validate(settingsPatchValidator), settings.updateSettings);
router.patch('/owner/business', authorizeRole(ROLES.OWNER), validate(ownerBusinessValidator), settings.updateSettings);

router.get('/security', settings.getSecurity);
router.post('/logout-all', settings.logoutAllDevices);
router.get('/export', settings.exportData);
router.post('/delete-account', validate(deleteAccountValidator), settings.deleteAccount);
router.post('/deactivate-owner', authorizeRole(ROLES.OWNER), settings.deactivateOwner);

// Admin-only platform configuration.
router.get('/platform', authorizeRole(ROLES.ADMIN), settings.getPlatformSettings);
router.patch('/platform', authorizeRole(ROLES.ADMIN), validate(platformPatchValidator), settings.updatePlatformSettings);

export default router;
