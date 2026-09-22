import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import PaymentService from '../services/PaymentService.js';
import BookingService from '../services/BookingService.js';
import Booking from '../models/Booking.js';
import ApiError from '../utils/ApiError.js';

async function loadOwnedBookingOrFail(req) {
  const booking = await Booking.findById(req.body.bookingId || req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  const isOwner = String(booking.userId) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden('You do not own this booking');
  return booking;
}

export const createOrder = asyncHandler(async (req, res) => {
  const booking = await loadOwnedBookingOrFail(req);
  const order = await PaymentService.createOrder({ booking, user: req.user });
  return ApiResponse.send(res, ApiResponse.created(order, 'Payment order created'));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const booking = await loadOwnedBookingOrFail(req);
  const verification = await PaymentService.verifyPayment({
    booking,
    paymentId: req.body.razorpay_payment_id || req.body.paymentId,
    orderId: req.body.razorpay_order_id || req.body.orderId,
    signature: req.body.razorpay_signature || req.body.signature,
    amount: req.body.amount,
  });
  if (verification.alreadyConfirmed) {
    const confirmed = await BookingService.confirmBooking(booking._id);
    return ApiResponse.send(res, ApiResponse.ok({ booking: confirmed }, 'Payment already confirmed'));
  }
  const confirmed = await BookingService.confirmBooking(booking._id);
  return ApiResponse.send(res, ApiResponse.created({ booking: confirmed }, 'Payment verified — booking confirmed'));
});

export const webhook = asyncHandler(async (req, res) => {
  const isMockWebhook = req.headers['x-mock-webhook'] === 'true';
  const event = req.body?.event || req.body?.payload?.event;
  const result = await PaymentService.handleWebhookEvent({
    event,
    payload: req.body,
    signature: req.headers['x-razorpay-signature'],
    isMockWebhook,
  });
  if (result.action === 'mark_paid') {
    const paymentInfo = result;
    const booking = await Booking.findOne({ 'payment.orderId': result.orderId });
    if (booking) {
      booking.payment.paymentId = result.paymentId || booking.payment.paymentId;
      await booking.save();
      await BookingService.confirmBooking(booking._id).catch((err) => {
        // Already handled/refunded via confirmBooking failure path or booking state
        console.error('[webhook] confirm failed:', err.message);
      });
    }
    return ApiResponse.send(res, ApiResponse.ok(result, 'Webhook processed'));
  }
  return ApiResponse.send(res, ApiResponse.ok(result, 'Webhook processed'));
});

export const refund = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  const isOwner = String(booking.userId) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  const isHotelOwner = req.user.role === 'owner' && booking.hotelId && String(booking.hotelId.ownerId) === String(req.user._id);
  if (!isOwner && !isAdmin && !isHotelOwner) throw ApiError.forbidden('You cannot refund this booking');
  const result = await PaymentService.refund({
    booking,
    amount: req.body.amount || booking.pricing.total,
    reason: req.body.reason || 'Manual refund',
  });
  booking.paymentStatus = 'refunded';
  await booking.save();
  return ApiResponse.send(res, ApiResponse.ok({ refund: result, booking }, 'Refund processed'));
});