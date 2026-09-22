import cron from 'node-cron';
import Booking from '../models/Booking.js';
import NotificationService from '../services/NotificationService.js';
import EmailService from '../services/EmailService.js';
import User from '../models/User.js';
import emailTemplates from '../templates/emails.js';
import { config } from '../config/env.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { toLocalMidnight, addDays, formatISODate } from '../utils/dateUtils.js';

/**
 * Scheduled jobs (node-cron):
 *  1. Complete past confirmed stays (historical records remain).
 *  2. Send check-in reminders (T-24h and T-3h).
 *  3. Send review requests (T+after check-out).
 */
async function completePastStays() {
  const today = toLocalMidnight(new Date());
  const result = await Booking.updateMany(
    { bookingStatus: BOOKING_STATUS.CONFIRMED, checkOut: { $lte: today } },
    { $set: { bookingStatus: BOOKING_STATUS.COMPLETED, completedAt: new Date() } },
  );
  if (result.modifiedCount > 0) console.log(`[jobs] completed ${result.modifiedCount} past stays`);

  // Pay-at-property stays are settled at the front desk, so once the stay is
  // over the money has been collected — stop reporting them as "pending".
  const settled = await Booking.updateMany(
    {
      bookingStatus: BOOKING_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.PENDING,
      'payment.method': 'pay_at_hotel',
    },
    { $set: { paymentStatus: PAYMENT_STATUS.PAID, 'payment.paidAt': new Date() } },
  );
  if (settled.modifiedCount > 0) console.log(`[jobs] settled ${settled.modifiedCount} pay-at-hotel payments`);
}

async function sendCheckInReminders() {
  const targetChecks = [addDays(new Date(), 1), new Date()];
  const reminders = await Booking.find({
    bookingStatus: BOOKING_STATUS.CONFIRMED,
    checkIn: { $in: targetChecks.map((d) => toLocalMidnight(d)) },
    'notificationFlags.checkInReminderSent': { $ne: true },
  }).populate('hotelId', 'name address city');

  for (const booking of reminders) {
    const user = await User.findById(booking.userId).lean();
    const hotel = booking.hotelId;
    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'check_in_reminder',
      audience: NotificationService.forGuest(),
      title: 'Check-in reminder',
      message: `You check in at ${hotel.name} on ${formatISODate(booking.checkIn)}.`,
      link: `/bookings/${booking._id}`,
    });
    await EmailService.send({
      to: booking.guestDetails.email,
      subject: `Check-in reminder — ${hotel.name}`,
      html: emailTemplates.checkInReminder({
        name: booking.guestDetails.fullName || 'there',
        bookingNumber: booking.bookingNumber,
        hotelName: hotel.name,
        address: `${hotel.address}, ${hotel.city}`,
        checkIn: formatISODate(booking.checkIn),
      }),
    }).catch(() => {});
    await Booking.updateOne({ _id: booking._id }, { $set: { 'notificationFlags.checkInReminderSent': true } });
  }
  if (reminders.length) console.log(`[jobs] sent ${reminders.length} check-in reminders`);
}

async function sendReviewRequests() {
  const yesterday = addDays(new Date(), -1);
  const bookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.COMPLETED,
    checkOut: toLocalMidnight(yesterday),
    'notificationFlags.reviewRequestSent': { $ne: true },
  }).populate('hotelId', 'name');

  for (const booking of bookings) {
    await NotificationService.createMany({
      userIds: [booking.userId],
      type: 'review_request',
      audience: NotificationService.forGuest(),
      title: 'How was your stay?',
      message: `You stayed at ${booking.hotelId.name}. Share your experience with a review!`,
      link: `/bookings/${booking._id}?review=1`,
    });
    await EmailService.send({
      to: booking.guestDetails.email,
      subject: `How was your stay at ${booking.hotelId.name}?`,
      html: emailTemplates.reviewRequest({
        name: booking.guestDetails.fullName || 'there',
        hotelName: booking.hotelId.name,
        bookingNumber: booking.bookingNumber,
        reviewUrl: `${config.frontendUrl}/bookings/${booking._id}?review=1`,
      }),
    }).catch(() => {});
    await Booking.updateOne({ _id: booking._id }, { $set: { 'notificationFlags.reviewRequestSent': true } });
  }
  if (bookings.length) console.log(`[jobs] sent ${bookings.length} review requests`);
}

export function startJobs() {
  if (process.env.DISABLE_JOBS === 'true') return;
  // Every hour: complete past stays & send reminders / review requests
  cron.schedule('0 * * * *', async () => {
    try {
      await completePastStays();
      await sendCheckInReminders();
      await sendReviewRequests();
    } catch (err) {
      console.error('[jobs] failed:', err.message);
    }
  });
  console.log('[jobs] scheduled tasks started');
}

export { completePastStays, sendCheckInReminders, sendReviewRequests };