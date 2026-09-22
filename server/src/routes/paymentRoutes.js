import { Router } from 'express';
import * as paymentCtrl from '../controllers/paymentController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Webhook (no auth — signature verified inside handler; mock webhooks need a
// marker header which is only honored in mock mode)
router.post('/webhook', paymentCtrl.webhook);

// Authenticated payment flows
router.use(authenticateUser);
router.post('/create-order', paymentCtrl.createOrder);
router.post('/verify', paymentCtrl.verifyPayment);
router.post('/:id/refund', paymentCtrl.refund);

export default router;