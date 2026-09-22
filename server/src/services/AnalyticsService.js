import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { Hotel, Room } from '../models/Hotel.js';
import AuditLog from '../models/AuditLog.js';
import Coupon from '../models/Coupon.js';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/constants.js';
import { toLocalMidnight } from '../utils/dateUtils.js';

const $ = (idOrString) =>
  mongoose.Types.ObjectId.isValid(idOrString) ? new mongoose.Types.ObjectId(idOrString) : null;

/**
 * AnalyticsService — owner & platform aggregates built from the
 * authoritative Booking collection (revenue counts paid bookings only).
 */
class AnalyticsService {
  /** Owner dashboard metrics. */
  async ownerMetrics({ ownerId, hotelIds }) {
    const hotelIdArr = hotelIds?.length
      ? hotelIds.map((id) => $(String(id))).filter(Boolean)
      : (await Hotel.find({ ownerId }).select('_id').lean()).map((h) => $(String(h._id)));

    const match = { hotelId: { $in: hotelIdArr } };
    const today = toLocalMidnight(new Date());
    const tomorrow = new Date(today.getTime() + 86400000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totals, todays, pending, monthAgg, upcoming, occupancyAgg, topRooms] = await Promise.all([
      Booking.aggregate([
        { $match: { ...match, bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID } },
        { $group: { _id: null, revenue: { $sum: '$pricing.total' }, bookings: { $sum: 1 }, nights: { $sum: '$nights' } } },
      ]),
      Booking.countDocuments({ ...match, bookingStatus: BOOKING_STATUS.CONFIRMED, checkIn: { $gte: today, $lt: tomorrow } }),
      Booking.countDocuments({ ...match, bookingStatus: BOOKING_STATUS.PENDING }),
      Booking.aggregate([
        { $match: { ...match, bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, revenue: { $sum: '$pricing.total' }, count: { $sum: 1 } } },
      ]),
      Booking.countDocuments({ ...match, bookingStatus: BOOKING_STATUS.CONFIRMED, checkIn: { $gte: today } }),
      Booking.aggregate([
        { $match: { ...match, bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW, BOOKING_STATUS.PENDING] } } },
        { $group: { _id: null, roomNights: { $sum: { $multiply: ['$nights', '$rooms'] } } } },
      ]),
      Booking.aggregate([
        { $match: { ...match, bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID } },
        { $group: { _id: '$roomId', revenue: { $sum: '$pricing.total' }, bookings: { $sum: 1 } } },
        { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const totalRoomUnits = await Room.aggregate([
      { $match: { hotelId: { $in: hotelIdArr }, status: 'active' } },
      { $group: { _id: null, units: { $sum: '$totalUnits' } } },
    ]);
    const capacityRoomNights = (totalRoomUnits[0]?.units || 0) * 30;
    const bookedRoomNights = occupancyAgg[0]?.roomNights || 0;
    const occupancy = capacityRoomNights > 0 ? Math.min((bookedRoomNights / capacityRoomNights) * 100, 100) : 0;

    return {
      totals: {
        revenue: Math.round((totals[0]?.revenue || 0) * 100) / 100,
        bookings: totals[0]?.bookings || 0,
        roomNights: totals[0]?.nights || 0,
      },
      todaysBookings: todays,
      pendingBookings: pending,
      monthRevenue: Math.round((monthAgg[0]?.revenue || 0) * 100) / 100,
      monthBookings: monthAgg[0]?.count || 0,
      upcomingBookings: upcoming,
      occupancy: Math.round(occupancy * 10) / 10,
      topRooms: topRooms.map((r) => ({ roomId: r._id, name: r.room?.[0]?.name || 'Room', revenue: r.revenue, bookings: r.bookings })),
      availableRooms: totalRoomUnits[0]?.units || 0,
    };
  }

  /** Revenue + booking trend buckets (daily) for owner charts. */
  async ownerTrends({ ownerId, hotelIds, days = 30 }) {
    const hotelIdArr = hotelIds?.length
      ? hotelIds.map((id) => $(String(id))).filter(Boolean)
      : (await Hotel.find({ ownerId }).select('_id').lean()).map((h) => $(String(h._id)));
    const match = { hotelId: { $in: hotelIdArr }, bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID };
    const since = new Date(toLocalMidnight(new Date()).getTime() - (days - 1) * 86400000);

    const rows = await Booking.aggregate([
      { $match: { ...match, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const byKey = new Map(rows.map((r) => [`${r._id.year}-${r._id.month}-${r._id.day}`, r]));
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(since.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const row = byKey.get(key);
      out.push({ date: d.toISOString().slice(0, 10), revenue: Math.round((row?.revenue || 0) * 100) / 100, bookings: row?.bookings || 0 });
    }
    return out;
  }
  async adminDashboard() {
    const today = toLocalMidnight(new Date());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [users, owners, hotels, totalBookings, pendingHotels, revenueAgg, monthAgg, topHotels, refundsAgg, coupons, recentAuditLogs] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      Hotel.countDocuments({ status: 'approved' }),
      Booking.countDocuments(),
      Hotel.countDocuments({ status: 'pending' }),
      Booking.aggregate([
        { $match: { bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID } },
        { $group: { _id: null, revenue: { $sum: '$pricing.total' }, bookings: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, revenue: { $sum: '$pricing.total' }, bookings: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID } },
        { $group: { _id: '$hotelId', revenue: { $sum: '$pricing.total' }, bookings: { $sum: 1 } } },
        { $lookup: { from: 'hotels', localField: '_id', foreignField: '_id', as: 'hotel' } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Booking.aggregate([
        { $match: { bookingStatus: BOOKING_STATUS.CANCELLED, 'cancellation.refundAmount': { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$cancellation.refundAmount' }, count: { $sum: 1 } } },
      ]),
      Coupon.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const popularDestinations = await Hotel.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$city', hotels: { $sum: 1 } } },
      { $sort: { hotels: -1 } },
      { $limit: 8 },
    ]);
    const recentBookings = await Booking.find()
      .populate('hotelId', 'name')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return {
      totals: {
        users, owners, hotels, bookings: totalBookings, couponCount: coupons, pendingHotels,
        revenue: Math.round((revenueAgg[0]?.revenue || 0) * 100) / 100,
        monthRevenue: Math.round((monthAgg[0]?.revenue || 0) * 100) / 100,
        monthBookings: monthAgg[0]?.bookings || 0,
        refunds: { total: Math.round((refundsAgg[0]?.total || 0) * 100) / 100, count: refundsAgg[0]?.count || 0 },
      },
      topHotels: topHotels.map((h) => ({ hotelId: h._id, name: h.hotel?.[0]?.name || 'Hotel', revenue: h.revenue, bookings: h.bookings })),
      popularDestinations,
      recentAuditLogs,
      recentBookings,
    };
  }
  async platformTrends({ days = 30 } = {}) {
    const since = new Date(toLocalMidnight(new Date()).getTime() - (days - 1) * 86400000);
    const rows = await Booking.aggregate([
      { $match: { bookingStatus: BOOKING_STATUS.CONFIRMED, paymentStatus: PAYMENT_STATUS.PAID, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    const byKey = new Map(rows.map((r) => [`${r._id.year}-${r._id.month}-${r._id.day}`, r]));
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(since.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      out.push({
        date: d.toISOString().slice(0, 10),
        revenue: Math.round((byKey.get(key)?.revenue || 0) * 100) / 100,
        bookings: byKey.get(key)?.bookings || 0,
      });
    }
    return out;
  }
}

export default new AnalyticsService();