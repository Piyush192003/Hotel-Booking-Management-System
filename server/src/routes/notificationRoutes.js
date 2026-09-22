import { Router } from 'express';
import * as notification from '../controllers/notificationController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authenticateUser);
router.get('/', notification.listNotifications);
router.patch('/:id/read', notification.markRead);
router.patch('/read-all', notification.markAllRead);
router.get('/unread-count', notification.unreadCount);

export default router;