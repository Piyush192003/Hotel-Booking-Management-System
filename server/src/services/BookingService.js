import { Room, Hotel } from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import ApiError from '../utils/ApiError.js';
import PricingService from './PricingService.js';
import AvailabilityService from './AvailabilityService.js';
import CouponService from './CouponService.js';
import CancellationService from './CancellationService.js';
import PaymentService from './PaymentService.js';
import NotificationService, { audienceForGuest, audienceForOwner } from './NotificationService.js';
import EmailService from './EmailService.js';
import { generateBookingNumber } from '../utils/generate.js';
import { config, isRazorpayConfigured } from '../config/env.js';
import emailTemplates from '../templates/emails.js';
import { BOOKING_STATUS, PAYMENT_STATUS, PAYMENT_PROVIDERS, ROLES } from '../utils/constants.js';
import { parseISODate, isBefore, diffInDays, formatISODate } from '../utils/dateUtils.js';

class BookingService {
  async createBooking({ userId, roomId, checkIn, checkOut, guests, rooms, guestDetails, specialRequests, couponCode }) {
    const ci = parseISODate(checkIn);
    const co = parseISODate(checkOut);
    if (!ci || !co) throw ApiError.badRequest('Invalid dates', 'INVALID_DATES');
    if (!isBefore(ci, co)) throw ApiError.badRequest('Check-in must be before check-out', 'INVALID_DATES');

    const room = await Room.findById(roomId);
    if (!room || room.status !== 'active') throw ApiError.notFound('Room not found');

    const hotel = await Hotel.findById(room.hotelId);
    if (!hotel || hotel.status !== 'approved') throw ApiError.notFound('Hotel not found');

    const adults = Number(guests?.adults || 1);
    const children = Number(guests?.children || 0);
    if (adults < 1) throw ApiError.badRequest('At least one adult guest is required', 'VALIDATION_ERROR');
    if (adults > room.capacity?.adults) {
      throw ApiError.badRequest(`This room accommodates up to ${room.capacity.adults} adults`, 'CAPACITY_EXCEEDED');
    }
    if (adults + children > (room.capacity?.adults || 0) + (room.capacity?.children || 0)) {
      throw ApiError.badRequest('Guest count exceeds room capacity', 'CAPACITY_EXCEEDED');
    }

    const qtyRooms = Math.min(Math.max(Number(rooms || 1), 1), 10);
    const pricing = await PricingService.calculate({ room, checkIn: ci, checkOut: co, rooms: qtyRooms, couponCode, userId });

    const available = await AvailabilityService.isAvailable({ room, checkIn: ci, checkOut: co, rooms: qtyRooms });
    if (!available) throw ApiError.unavailable('The room is no longer available for these dates', 'ROOMS_UNAVAILABLE');

    const nights = diffInDays(ci, co);
    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      userId,
      hotelId: hotel._id,
      roomId: room._id,
      checkIn: ci,
      checkOut: co,
      nights,
      guests: { adults, children },
      rooms: qtyRooms,
      guestDetails,
      specialRequests: specialRequests || '',
      pricing: {
        currency: pricing.currency,
        nights,
        basePricePerNight: room.pricePerNight,
        roomSubtotal: pricing.roomSubtotal,
        taxes: pricing.taxes,
        serviceFee: pricing.serviceFee,
        couponDiscount: pricing.couponDiscount,
        total: pricing.total,
        adjustments: { weekendMarkup: pricing.weekendMarkup || 0, seasonalMarkup: 0 },
      },
      coupon: pricing.coupon
        ? { code: pricing.coupon.code, discountType: pricing.coupon.discountType, discountValue: pricing.coupon.discountValue, discountAmount: pricing.coupon.discountAmount }
        : undefined,
      payment: { provider: isRazorpayConfigured ? PAYMENT_PROVIDERS.RAZORPAY : PAYMENT_PROVIDERS.MOCK },
      paymentStatus: PAYMENT_STATUS.PENDING,
      bookingStatus: BOOKING_STATUS.PENDING,
    });

    const payUrl = `${config.frontendUrl}/checkout/${booking._id}`;
    await NotificationService.createMany({
      userIds: [userId],
      type: 'system',
            audience: audienceForGuest(),
      title: 'Booking created — complete payment',
      message: `Booking ${booking.bookingNumber} at ${hotel.name} is awaiting payment.`,
      link: `/checkout/${booking._id}`,
    });
    await EmailService.send({
      to: guestDetails.email,
      subject: `Complete your booking at ${hotel.name}`,
      html: emailTemplates.bookingPending({ name: guestDetails.fullName || 'there', bookingNumber: booking.bookingNumber, hotelName: hotel.name, payUrl }),
    }).catch(() => {});

    return booking;
  }
async getMyBookings(userId, { status, page = 1, limit = 10 }) {
    const query = { userId };
    if (status && status !== 'all') query.bookingStatus = status;
    const [docs, total] = await Promise.all([
      Booking.find(query)
        .populate('hotelId', 'name city images slug')
        .populate('roomId', 'name roomType bedType images')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);
    return { docs, total, page, limit };
  }

  async getBookingById(id, { userId = null, role = null } = {}) {
    const booking = await Booking.findById(id)
      .populate('hotelId')
      .populate('roomId', 'name roomType bedType images pricePerNight')
      .populate('userId', 'name email');
    if (!booking) throw ApiError.notFound('Booking not found');
    if (userId) {
      const bookingUserId = booking.userId?._id ? String(booking.userId._id) : String(booking.userId);
      const isOwner = bookingUserId === String(userId);
      const isHotelOwner =
        role === ROLES.OWNER &&
        booking.hotelId?.ownerId &&
        String(booking.hotelId.ownerId) === String(userId);
      if (!isOwner && !isHotelOwner && role !== ROLES.ADMIN) {
        throw ApiError.forbidden('You do not have access to this booking');
      }
    }
    return booking;
  }

  async getBookingsForHotel(hotelId, { status, page = 1, limit = 20 }) {
    const query = { hotelId };
    if (status && status !== 'all') query.bookingStatus = status;
    const [docs, total] = await Promise.all([
      Booking.find(query)
        .populate('userId', 'name email phone')
        .populate('roomId', 'name roomType')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);
    return { docs, total, page, limit };
  }

  async getBookingsForAdmin({ status, paymentStatus, page = 1, limit = 20, search }) {
    const query = {};
    if (status && status !== 'all') query.bookingStatus = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { bookingNumber: new RegExp(search, 'i') },
        { 'guestDetails.email': new RegExp(search, 'i') },
        { 'guestDetails.fullName': new RegExp(search, 'i') },
      ];
    }
    const [docs, total] = await Promise.all([
      Booking.find(query)
        .populate('hotelId', 'name city')
        .populate('roomId', 'name')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);
    return { docs, total, page, limit };
  }
/**
   * Finalises a paid booking (idempotent). Acquires inventory — the
   * authoritative anti-double-booking step — then transitions to confirmed.
   */
  async confirmBooking(bookingId) {
    const booking = await Booking.findById(bookingId).populate('hotelId').populate('roomId');
    if (!booking) throw ApiError.notFound('Booking not found');
    if (booking.bookingStatus === BOOKING_STATUS.CONFIRMED) return booking;
    if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
      throw ApiError.conflict(`Booking cannot be confirmed from "${booking.bookingStatus}"`, 'BAD_STATE');
    }

    try {
      await AvailabilityService.acquireInventory({
        roomId: booking.roomId._id || booking.roomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        rooms: booking.rooms,
      });
    } catch (err) {
      // Inventory lost to a concurrent booking — flag for automated refund.
      booking.paymentStatus = PAYMENT_STATUS.FAILED;
      booking.bookingStatus = BOOKING_STATUS.CANCELLED;
      booking.cancellation = {
        cancelledAt: new Date(),
        reason: 'Inventory became unavailable before payment was captured. Payment auto-refunded.',
        cancelledBy: 'system',
        refundAmount: booking.pricing?.total || 0,
        feeAmount: 0,
      };
      await booking.save();
      await NotificationService.createMany({
        userIds: [booking.userId],
        type: 'booking_cancelled',
                audience: audienceForGuest(),
        title: 'Booking cancelled — refund initiated',
        message: `Booking ${booking.bookingNumber} was cancelled because the room sold out. Your payment will be refunded.`,
      });
      throw ApiError.unavailable('Sorry, the room just sold out. Your payment will be refunded.', 'ROOMS_UNAVAILABLE');
    }

    booking.bookingStatus = BOOKING_STATUS.CONFIRMED;
    booking.paymentStatus = PAYMENT_STATUS.PAID;
    booking.payment.paidAt = new Date();
    booking.checkInCode = this._checkInCode(booking.bookingNumber);
    if (booking.coupon?.code) {
      const couponDoc = await CouponService.findByCode(booking.coupon.code);
      if (couponDoc) await CouponService.registerUsage(couponDoc._id, booking.userId);
    }
    await booking.save();

    const hotel = booking.hotelId;
    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'booking_confirmed',
            audience: audienceForGuest(),
      title: 'Booking confirmed 🎉',
      message: `Your stay at ${hotel.name} (${booking.bookingNumber}) is confirmed. Check-in ${formatISODate(booking.checkIn)}.`,
      link: `/bookings/${booking._id}`,
    });
    await NotificationService.createMany({
      userIds: [hotel.ownerId],
      type: 'booking_confirmed',
            audience: audienceForOwner(),
      title: 'New booking confirmed',
      message: `New confirmed booking ${booking.bookingNumber} for ${hotel.name}.`,
      link: '/owner/bookings',
    });
    await EmailService.send({
      to: booking.guestDetails.email,
      subject: `Booking confirmed — ${hotel.name}`,
      html: emailTemplates.bookingConfirmed({
        name: booking.guestDetails.fullName || 'there',
        bookingNumber: booking.bookingNumber,
        hotelName: hotel.name,
        checkIn: formatISODate(booking.checkIn),
        checkOut: formatISODate(booking.checkOut),
        total: `₹${booking.pricing.total.toLocaleString('en-IN')}`,
        viewUrl: `${config.frontendUrl}/bookings/${booking._id}`,
      }),
    }).catch(() => {});
    await EmailService.send({
      to: booking.guestDetails.email,
      subject: `Payment received for ${hotel.name}`,
      html: emailTemplates.paymentConfirmed({
        name: booking.guestDetails.fullName || 'there',
        bookingNumber: booking.bookingNumber,
        amount: `₹${booking.pricing.total.toLocaleString('en-IN')}`,
      }),
    }).catch(() => {});

    return booking;
  }

  /**
   * Confirms a booking with a "pay at property" payment method. Inventory is
   * secured exactly like a paid booking, but no online payment is captured —
   * the guest pays at check-in. Idempotent per booking.
   */
  async payAtHotel({ bookingId, userId, role = ROLES.CUSTOMER }) {
    const booking = await Booking.findById(bookingId).populate('hotelId').populate('roomId');
    if (!booking) throw ApiError.notFound('Booking not found');

    const bookingUserId = booking.userId?._id ? String(booking.userId._id) : String(booking.userId);
    if (bookingUserId !== String(userId) && role !== ROLES.ADMIN) {
      throw ApiError.forbidden('You do not own this booking');
    }
    if (booking.bookingStatus === BOOKING_STATUS.CONFIRMED && booking.payment?.method === 'pay_at_hotel') {
      return booking;
    }
    if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
      throw ApiError.conflict(`Booking cannot be confirmed from "${booking.bookingStatus}"`, 'BAD_STATE');
    }

    try {
      await AvailabilityService.acquireInventory({
        roomId: booking.roomId._id || booking.roomId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        rooms: booking.rooms,
      });
    } catch (err) {
      booking.bookingStatus = BOOKING_STATUS.CANCELLED;
      booking.cancellation = {
        cancelledAt: new Date(),
        reason: 'Inventory became unavailable before confirmation.',
        cancelledBy: 'system',
        refundAmount: 0,
        feeAmount: 0,
      };
      await booking.save();
      throw ApiError.unavailable('Sorry, the room just sold out. Please try different dates.', 'ROOMS_UNAVAILABLE');
    }

    booking.bookingStatus = BOOKING_STATUS.CONFIRMED;
    booking.payment.provider = PAYMENT_PROVIDERS.MOCK;
    booking.payment.method = 'pay_at_hotel';
    booking.payment.paidAt = undefined;
    booking.checkInCode = this._checkInCode(booking.bookingNumber);
    await booking.save();

    const hotel = booking.hotelId;
    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'booking_confirmed',
            audience: audienceForGuest(),
      title: 'Booking confirmed — pay at the property 🎉',
      message: `Your stay at ${hotel.name} (${booking.bookingNumber}) is confirmed. Please pay ₹${booking.pricing.total.toLocaleString('en-IN')} at check-in.`,
      link: `/bookings/${booking._id}`,
    });
    await NotificationService.createMany({
      userIds: [hotel.ownerId],
      type: 'booking_confirmed',
            audience: audienceForOwner(),
      title: 'New pay-at-property booking',
      message: `New confirmed booking ${booking.bookingNumber} for ${hotel.name} (pay at property).`,
      link: '/owner/bookings',
    });
    await EmailService.send({
      to: booking.guestDetails.email,
      subject: `Booking confirmed — pay at ${hotel.name}`,
      html: emailTemplates.bookingConfirmed({
        name: booking.guestDetails.fullName || 'there',
        bookingNumber: booking.bookingNumber,
        hotelName: hotel.name,
        checkIn: formatISODate(booking.checkIn),
        checkOut: formatISODate(booking.checkOut),
        total: `₹${booking.pricing.total.toLocaleString('en-IN')} (payable at property)`,
        viewUrl: `${config.frontendUrl}/bookings/${booking._id}`,
      }),
    }).catch(() => {});

    return booking;
  }
/**
   * Cancels a booking (customer, owner, admin or system). Refund is computed
   * from the hotel cancellation policy and issued when payment was captured.
   */
  async cancelBooking({ bookingId, userId, role, reason = '', slotIds = [] }) {
    const booking = await Booking.findById(bookingId).populate('hotelId').populate('roomId');
    if (!booking) throw ApiError.notFound('Booking not found');

    if (role === ROLES.CUSTOMER && String(booking.userId) !== String(userId)) {
      throw ApiError.forbidden('You cannot cancel another user’s booking');
    }
    if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.bookingStatus)) {
      throw ApiError.conflict(`Booking is already "${booking.bookingStatus}"`, 'CANCELLATION_NOT_ALLOWED');
    }

    const policy = booking.hotelId?.policies?.cancellation || {};
    const { feeAmount, refundableAmount } = CancellationService.calculateForBooking(booking, policy);

    let refundId = '';
    // Pay-at-property money never passes through the gateway, so there is
    // nothing to refund online — the property settles it at the desk.
    const isPayAtHotel = booking.payment?.method === 'pay_at_hotel';
    if (!isPayAtHotel && booking.paymentStatus === PAYMENT_STATUS.PAID && refundableAmount > 0) {
      const refundResult = await PaymentService.refund({
        booking,
        amount: refundableAmount,
        reason: reason || 'Customer cancellation',
      });
      refundId = refundResult?.providerRefundId || '';
      booking.paymentStatus = refundableAmount >= booking.pricing.total
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.PARTIALLY_REFUNDED;
    } else if (!isPayAtHotel && booking.paymentStatus === PAYMENT_STATUS.PAID && refundableAmount === 0) {
      booking.paymentStatus = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    }

    booking.bookingStatus = BOOKING_STATUS.CANCELLED;
    booking.cancellation = {
      cancelledAt: new Date(),
      reason,
      cancelledBy: role === ROLES.ADMIN ? 'admin' : role === ROLES.OWNER ? 'owner' : 'customer',
      refundAmount: refundableAmount,
      feeAmount,
      refundId,
    };
    await booking.save();

    // Release inventory (idempotent)
    await AvailabilityService.releaseInventory({
      roomId: booking.roomId._id || booking.roomId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      rooms: booking.rooms,
      slotIds,
    }).catch(() => {});

    const hotel = booking.hotelId;
    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'booking_cancelled',
            audience: audienceForGuest(),
      title: 'Booking cancelled',
      message: `Booking ${booking.bookingNumber} at ${hotel.name} was cancelled.${refundableAmount > 0 ? ` Refund of ₹${refundableAmount.toLocaleString('en-IN')} will be processed.` : ''}`,
      link: `/bookings/${booking._id}`,
    });
    await EmailService.send({
      to: booking.guestDetails.email,
      subject: `Booking cancelled — ${hotel.name}`,
      html: emailTemplates.bookingCancelled({
        name: booking.guestDetails.fullName || 'there',
        bookingNumber: booking.bookingNumber,
        hotelName: hotel.name,
        refundAmount: `₹${refundableAmount.toLocaleString('en-IN')}`,
      }),
    }).catch(() => {});

    return booking;
  }

  /** Owner status transitions for confirmed bookings (completed / no-show). */
  async updateStatusByOwner({ bookingId, ownerId, status }) {
    const booking = await Booking.findById(bookingId).populate('hotelId');
    if (!booking) throw ApiError.notFound('Booking not found');
    if (String(booking.hotelId.ownerId) !== String(ownerId)) {
      throw ApiError.forbidden('You do not manage this hotel');
    }
    if (status === BOOKING_STATUS.COMPLETED) {
      if (booking.bookingStatus !== BOOKING_STATUS.CONFIRMED) {
        throw ApiError.conflict('Only confirmed bookings can be marked completed', 'BAD_STATE');
      }
      booking.bookingStatus = BOOKING_STATUS.COMPLETED;
      booking.completedAt = new Date();
      this._settlePayAtHotel(booking);
    } else if (status === BOOKING_STATUS.NO_SHOW) {
      if (![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING].includes(booking.bookingStatus)) {
        throw ApiError.conflict('Booking cannot be marked no-show', 'BAD_STATE');
      }
      booking.bookingStatus = BOOKING_STATUS.NO_SHOW;
      await NotificationService.createMany({
        userIds: [booking.userId],
        type: 'system',
                audience: audienceForGuest(),
        title: 'Marked as no-show',
        message: `Booking ${booking.bookingNumber} was marked as no-show.`,
      });
    } else {
      throw ApiError.badRequest('Invalid status for this action', 'BAD_STATE');
    }
    await booking.save();
    return booking;
  }

  /**
   * Pay-at-property bookings stay PAYMENT_STATUS.PENDING until the guest pays
   * at the front desk. Once the stay is over (owner marks it completed or the
   * cron job completes a past stay) that money has been collected, so settle it
   * — otherwise booking lists show the contradictory "Completed + Pending".
   */
  _settlePayAtHotel(booking) {
    if (booking?.payment?.method !== 'pay_at_hotel') return false;
    if (booking.paymentStatus !== PAYMENT_STATUS.PENDING) return false;
    booking.paymentStatus = PAYMENT_STATUS.PAID;
    booking.payment.paidAt = new Date();
    return true;
  }

  _checkInCode(bookingNumber) {
    const suffix = String(bookingNumber).slice(-4).toUpperCase();
    return `WL-${suffix}`;
  }
}

export default new BookingService();