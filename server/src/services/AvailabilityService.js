import { BookingSlot, Room } from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import ApiError from '../utils/ApiError.js';
import { dateRange, toLocalMidnight, isBefore, parseISODate } from '../utils/dateUtils.js';
import { BOOKING_STATUS } from '../utils/constants.js';

const ACTIVE_BOOKING_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];

/**
 * AvailabilityService — the core inventory engine.
 *
 * Inventory is tracked two ways:
 *  1. Room.availableUnits   (sold-units counter, atomic guarded $inc)
 *  2. BookingSlot per-room  (units sold per calendar day, unique (roomId,date) index)
 *
 * A booking permanently consumes a unit per night in [checkIn, checkOut).
 * Overlap rule: requestedCheckIn < existingCheckOut &&
 *               requestedCheckOut > existingCheckIn.
 * Cancelled/rollback operations release their slots and restore counters.
 */
class AvailabilityService {
  _assertValidDates(checkIn, checkOut, now = new Date()) {
    const ci = parseISODate(checkIn) ?? toLocalMidnight(checkIn);
    const co = parseISODate(checkOut) ?? toLocalMidnight(checkOut);
    if (!isBefore(ci, co)) {
      throw ApiError.badRequest('Check-in must be before check-out', 'INVALID_DATES');
    }
    const today = toLocalMidnight(now);
    if (isBefore(ci, today)) {
      throw ApiError.badRequest('Check-in cannot be in the past', 'PAST_DATES');
    }
    return { ci, co };
  }

  /** Reads the per-night ledger — units already sold for each requested night. */
  async soldUnitsPerNight({ roomId, checkIn, checkOut }) {
    const { ci, co } = this._assertValidDates(checkIn, checkOut);
    const nights = dateRange(ci, co);
    const map = new Map();
    const docs = await BookingSlot.find({
      roomId,
      date: { $gte: nights[0], $lte: nights[nights.length - 1] },
    }).lean();
    for (const doc of docs) {
      map.set(toLocalMidnight(doc.date).getTime(), doc.unitsBooked);
    }
    return { map, nights };
  }

  /** True when the requested number of units fits the room for every night. */
  async isAvailable({ room, checkIn, checkOut, rooms = 1 }) {
    const { map, nights } = await this.soldUnitsPerNight({ roomId: room._id, checkIn, checkOut });
    for (const night of nights) {
      const sold = map.get(toLocalMidnight(night).getTime()) || 0;
      if (sold + rooms > room.totalUnits) return false;
    }
    return true;
  }

  /**
   * ACQUIRES inventory for a booking.
   * Uniquely-indexed per-night BookingSlot documents serialise concurrent
   * bookings: the guarded upsert/$inc plus a post-condition capacity check
   * mean only one contender can win each night at full capacity. Losers are
   * compensated via `releaseLedger` and never leave partial consumption.
   */
  async acquireInventory({ roomId, checkIn, checkOut, rooms = 1, bookingId }) {
    const { ci, co } = this._assertValidDates(checkIn, checkOut);
    const nights = dateRange(ci, co);
    if (nights.length === 0) throw ApiError.badRequest('Invalid date range', 'INVALID_DATES');
    const qty = Number(rooms);
    const acquired = [];

    try {
      for (const night of nights) {
        const nightDate = toLocalMidnight(night);
        const slotUpdate = await BookingSlot.findOneAndUpdate(
          { roomId, date: nightDate },
          { $inc: { unitsBooked: qty } },
          { upsert: true, setDefaultsOnInsert: { roomId, date: nightDate, unitsBooked: 0 }, new: true },
        );
        const room = await Room.findById(roomId).lean();
        if (!room || slotUpdate.unitsBooked > room.totalUnits) {
          throw ApiError.unavailable('Rooms are no longer available for these dates', 'ROOMS_UNAVAILABLE');
        }
        acquired.push(slotUpdate._id);
      }

      const roomUpdate = await Room.findOneAndUpdate(
        { _id: roomId, availableUnits: { $gte: qty } },
        { $inc: { availableUnits: -qty * nights.length }, $set: { status: 'active' } },
        { new: true },
      );
      if (!roomUpdate) {
        throw ApiError.unavailable('Rooms are sold out for these dates', 'ROOMS_UNAVAILABLE');
      }

      return { acquired, nights, roomSnapshot: roomUpdate };
    } catch (err) {
      await this.releaseLedger(acquired, qty);
      throw err;
    }
  }

  /** Compensating ledger decrement for a partial acquisition. */
  async releaseLedger(slotIds, qty = 1) {
    if (!slotIds?.length) return;
    for (const id of slotIds) {
      await BookingSlot.updateOne({ _id: id }, { $inc: { unitsBooked: -qty } }).catch(() => {});
    }
  }

  /** Releases inventory after cancellation (idempotent, guarded decrements). */
  async releaseInventory({ roomId, checkIn, checkOut, rooms = 1, slotIds = [] }) {
    const { ci, co } = this._assertValidDates(checkIn, checkOut);
    const nights = dateRange(ci, co);
    const qty = Number(rooms);
    await this.releaseLedger(slotIds, qty);
    for (const night of nights) {
      const nightDate = toLocalMidnight(night);
      await BookingSlot.updateOne(
        { roomId, date: nightDate, unitsBooked: { $gt: 0 } },
        { $inc: { unitsBooked: -qty } },
      );
      await BookingSlot.findOneAndDelete({ roomId, date: nightDate, unitsBooked: { $lte: 0 } });
    }
    await Room.updateOne({ _id: roomId }, { $inc: { availableUnits: qty * nights.length } });
  }

  /** Whether any non-cancelled booking overlaps this range (reference check). */
  async hasOverlappingBookings({ roomId, checkIn, checkOut, excludeBookingId }) {
    const { ci, co } = this._assertValidDates(checkIn, checkOut);
    const query = {
      roomId,
      bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
      checkIn: { $lt: co },
      checkOut: { $gt: ci },
    };
    if (excludeBookingId) query._id = { $ne: excludeBookingId };
    return Booking.exists(query);
  }

  /** Public availability report for a room across the requested nights. */
  async roomAvailabilityReport(room, checkIn, checkOut, rooms = 1) {
    const { map, nights } = await this.soldUnitsPerNight({ roomId: room._id, checkIn, checkOut });
    const perNight = nights.map((night) => {
      const key = toLocalMidnight(night).getTime();
      const sold = map.get(key) || 0;
      return {
        date: toLocalMidnight(night),
        sold,
        remaining: Math.max(room.totalUnits - sold, 0),
      };
    });
    const available = perNight.length > 0 && perNight.every((p) => p.remaining >= rooms);
    return {
      available,
      roomsAvailable: available ? Math.min(...perNight.map((p) => p.remaining)) : 0,
      perNight,
    };
  }
}
export default new AvailabilityService();