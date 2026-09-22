import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import Payment from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import NotificationService, { audienceForGuest } from './NotificationService.js';
import { config, isRazorpayConfigured } from '../config/env.js';
import { PAYMENT_PROVIDERS, PAYMENT_STATUS, CURRENCY } from '../utils/constants.js';

/**
 * PaymentService — provider-agnostic payment gateway.
 *
 * PRODUCTION:  Razorpay (orders, signature verification, webhooks, refunds).
 * DEVELOPMENT: a clearly-labelled MOCK provider used when no Razorpay keys
 *              exist in .env. Mock never pretends to be real — every mock
 *              order/payment id carries the `mock_` prefix. Stripe can be
 *              added later behind the same interface.
 */
class PaymentService {
  _client() {
    if (!isRazorpayConfigured) throw ApiError.internal('Razorpay is not configured', 'PAYMENT_PROVIDER_MISCONFIGURED');
    if (!this._razorpay) {
      this._razorpay = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    }
    return this._razorpay;
  }

  get provider() {
    return isRazorpayConfigured ? PAYMENT_PROVIDERS.RAZORPAY : PAYMENT_PROVIDERS.MOCK;
  }

  get isMock() {
    return !isRazorpayConfigured;
  }

  /** Create a payment order for a booking. Idempotent per booking. */
  async createOrder({ booking, user }) {
    if (booking.bookingStatus !== 'pending') {
      throw ApiError.conflict('Booking cannot accept a payment order in its current state', 'BAD_STATE');
    }
    if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
      throw ApiError.conflict('This booking is already paid', 'ALREADY_PAID');
    }

    const existing = await Payment.findOne({ bookingId: booking._id, orderId: { $ne: '' } }).lean();
    if (existing && existing.status !== PAYMENT_STATUS.FAILED) {
      return {
        orderId: existing.orderId,
        amount: existing.amount,
        currency: existing.currency,
        provider: existing.provider,
        isMock: existing.provider === PAYMENT_PROVIDERS.MOCK,
        keyId: isRazorpayConfigured ? config.razorpay.keyId : null,
        prefill: { email: user?.email, name: user?.name },
      };
    }

    const amount = Math.round(booking.pricing.total * 100); // paise
    const notes = { bookingNumber: booking.bookingNumber, userId: String(booking.userId) };

    let order;
    if (isRazorpayConfigured) {
      order = await this._client().orders.create({ amount, currency: CURRENCY, receipt: booking.bookingNumber, notes, partial_payment: false });
    } else {
      order = { id: `mock_${crypto.randomUUID()}`, amount, currency: CURRENCY, status: 'created' };
    }

    await Payment.create({
      bookingId: booking._id,
      provider: this.provider,
      amount: booking.pricing.total,
      currency: CURRENCY,
      orderId: order.id,
      status: PAYMENT_STATUS.PENDING,
      meta: { notes, mock: this.isMock },
    });

    booking.payment.orderId = order.id;
    booking.payment.provider = this.provider;
    await booking.save();

    return {
      orderId: order.id,
      amount: booking.pricing.total,
      currency: CURRENCY,
      provider: this.provider,
      isMock: this.isMock,
      keyId: isRazorpayConfigured ? config.razorpay.keyId : null,
      prefill: { email: user?.email, name: user?.name },
    };
  }
  /**
   * Verifies a client-side completed payment.
   * Real flow validates the Razorpay HMAC signature and amount; the mock
   * flow (development only) accepts a `mock_payment` signature.
   */
  async verifyPayment({ booking, paymentId, orderId, signature, amount }) {
    const paymentDoc = await Payment.findOne({ bookingId: booking._id, orderId });
    if (!paymentDoc) throw ApiError.badRequest('No matching payment order', 'PAYMENT_ORDER_NOT_FOUND');
    if (paymentDoc.status === PAYMENT_STATUS.PAID) return { alreadyConfirmed: true };

    if (this.isMock) {
      if (signature !== 'mock_payment' || !String(paymentId).startsWith('mock_')) {
        throw ApiError.badRequest('Invalid mock payment details', 'PAYMENT_VERIFICATION_FAILED');
      }
      if (paymentDoc.amount !== booking.pricing.total) {
        throw ApiError.badRequest('Payment amount mismatch', 'PAYMENT_AMOUNT_MISMATCH');
      }
    } else {
      if (amount !== undefined && Math.round(amount) !== Math.round(booking.pricing.total * 100)) {
        throw ApiError.badRequest('Payment amount mismatch', 'PAYMENT_AMOUNT_MISMATCH');
      }
      const expected = `${orderId}|${paymentId}`;
      const actual = crypto.createHmac('sha256', config.razorpay.keySecret).update(expected).digest('hex');
      if (!signature || actual !== signature) {
        throw ApiError.badRequest('Payment signature verification failed', 'PAYMENT_VERIFICATION_FAILED');
      }
    }

    paymentDoc.paymentId = paymentId;
    paymentDoc.signature = signature;
    paymentDoc.status = PAYMENT_STATUS.PAID;
    await paymentDoc.save();

    booking.payment.paymentId = paymentId;
    booking.payment.method = this.isMock ? 'mock' : 'razorpay';
    await booking.save();

    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'payment_successful',
            audience: audienceForGuest(),
      title: 'Payment successful',
      message: `Payment of ₹${booking.pricing.total.toLocaleString('en-IN')} received for booking ${booking.bookingNumber}.`,
      link: `/bookings/${booking._id}`,
    });

    return { verified: true, provider: this.provider };
  }
  /**
   * Processes a webhook event (authoritative payment source).
   */
  async handleWebhookEvent({ event, payload, signature, isMockWebhook }) {
    if (this.isMock && !isMockWebhook) {
      return { ignored: true, reason: 'mock-mode' }; // no real webhooks in mock mode
    }
    if (!this.isMock) {
      const body = JSON.stringify(payload);
      const expected = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(body).digest('hex');
      if (!config.razorpay.webhookSecret || expected !== signature) {
        throw ApiError.unauthorized('Invalid webhook signature');
      }
    }

    if (event === 'payment.captured' || event === 'payment.failed') {
      const paymentId = payload?.payment?.entity?.id;
      const orderId = payload?.payment?.entity?.order_id;
      if (!orderId) return { ignored: true, reason: 'missing order_id' };
      const paymentDoc = await Payment.findOne({ orderId }).lean();
      if (!paymentDoc) return { ignored: true, reason: 'order not found' };

      if (event === 'payment.captured') {
        await Payment.updateOne({ orderId }, { $set: { status: PAYMENT_STATUS.PAID, paymentId, webhookReceivedAt: new Date() } });
        return { event, orderId, paymentId, action: 'mark_paid' };
      }
      await Payment.updateOne({ orderId }, { $set: { status: PAYMENT_STATUS.FAILED, paymentId, webhookReceivedAt: new Date() } });
      return { event, orderId, paymentId, action: 'mark_failed' };
    }
    return { event, ignored: true };
  }

  /** Issues a refund (mock always succeeds; Razorpay creates a real refund). */
  async refund({ booking, amount, reason = '' }) {
    const refundAmount = Math.min(Math.round(amount * 100), Math.round((booking.pricing?.total || 0) * 100));
    let providerRefundId = '';
    let status = 'processed';

    if (this.isMock) {
      providerRefundId = `mock_refund_${crypto.randomUUID().slice(0, 12)}`;
    } else {
      const paymentDoc = await Payment.findOne({ bookingId: booking._id }).lean();
      const paymentId = booking.payment?.paymentId || paymentDoc?.paymentId;
      if (!paymentId) throw ApiError.paymentRequired('No captured payment to refund', 'NO_PAYMENT');
      const result = await this._client().refunds.create({ payment_id: paymentId, amount: refundAmount, notes: { reason } });
      providerRefundId = result.id;
      status = result.status || 'processed';
    }

    await Payment.updateOne(
      { bookingId: booking._id },
      { $push: { refunds: { provider: this.provider, providerRefundId, amount: refundAmount / 100, currency: CURRENCY, reason, status, processedAt: new Date() } } },
    );

    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'refund_processed',
            audience: audienceForGuest(),
      title: 'Refund processed',
      message: `Refund of ₹${(refundAmount / 100).toLocaleString('en-IN')} was processed for booking ${booking.bookingNumber}.`,
      link: `/bookings/${booking._id}`,
    });

    return { providerRefundId, amount: refundAmount / 100, status };
  }
}

export default new PaymentService();