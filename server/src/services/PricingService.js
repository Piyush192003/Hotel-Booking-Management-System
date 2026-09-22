import { diffInDays, dateRange, isWeekend, toLocalMidnight, isBefore } from '../utils/dateUtils.js';
import ApiError from '../utils/ApiError.js';
import Coupon from '../models/Coupon.js';
import CouponService from './CouponService.js';
import { TAX_RATE, SERVICE_FEE_RATE, CURRENCY } from '../utils/constants.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Server-authoritative pricing.
 *
 * The client NEVER sends a total. Every booking price is recomputed here
 * from the room's stored rates, seasonal/weekend adjustments, taxes,
 * service fees and a server-validated coupon.
 */
class PricingService {
  /**
   * Computes the nightly room rate for a given check-in date.
   * Order: seasonal rate > base price, plus weekend markup when the date
   * falls on Fri/Sat/Sun.
   */
  nightlyRate(room, date) {
    const d = toLocalMidnight(date);
    const seasonal = (room.seasonalRates || []).find((s) => {
      const start = toLocalMidnight(s.startDate).getTime();
      const end = toLocalMidnight(s.endDate).getTime();
      const day = d.getTime();
      return day >= start && day < end;
    });
    let base = seasonal ? seasonal.pricePerNight : room.pricePerNight;
    const markup = room.weekendMarkupPercent || 0;
    const applied = isWeekend(d) && markup > 0 ? base * (1 + markup / 100) : base;
    return { rate: round2(applied), base, weekendMarkup: round2(applied - base), seasonal: Boolean(seasonal) };
  }

  /**
   * Full price breakdown for a stay.
   * @param {object} opts { room, checkIn, checkOut, rooms, coupon, userId }
   */
  async calculate({ room, checkIn, checkOut, rooms = 1, couponCode, userId }) {
    const ci = toLocalMidnight(checkIn);
    const co = toLocalMidnight(checkOut);
    if (!isBefore(ci, co)) throw ApiError.badRequest('Check-in must be before check-out', 'INVALID_DATES');

    const nights = diffInDays(ci, co);
    if (nights < 1) throw ApiError.badRequest('At least one night is required', 'INVALID_DATES');

    const days = dateRange(ci, co);
    let roomSubtotal = 0;
    let weekendMarkup = 0;
    let seasonalDays = 0;

    const dailyRates = [];
    for (const day of days) {
      const { rate, base, weekendMarkup: wm } = this.nightlyRate(room, day);
      dailyRates.push({ date: day, rate, sleepsOn: day });
      roomSubtotal += wm === 0 ? rate : base;
      weekendMarkup += wm;
      if (this.nightlyRate(room, day).seasonal) seasonalDays += 1;
    }
    roomSubtotal = round2(roomSubtotal * rooms);
    weekendMarkup = round2(weekendMarkup * rooms);

    const taxes = round2(roomSubtotal * TAX_RATE);
    const serviceFee = round2(roomSubtotal * SERVICE_FEE_RATE);
    const preDiscount = round2(roomSubtotal + taxes + serviceFee);

    const breakdown = {
      currency: CURRENCY,
      nights,
      rooms,
      basePricePerNight: room.pricePerNight,
      dailyRates,
      roomSubtotal,
      weekendMarkup,
      seasonalDays,
      taxes,
      serviceFee,
      preDiscount,
      coupon: null,
      couponDiscount: 0,
      total: preDiscount,
    };

    if (couponCode) {
      const coupon = await CouponService.validateForBooking({ code: couponCode, amount: preDiscount, userId });
      const discount = coupon.discountAmount;
      breakdown.coupon = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount,
      };
      breakdown.couponDiscount = round2(discount);
      breakdown.total = round2(preDiscount - discount);
    }

    breakdown.total = Math.max(breakdown.total, 0);
    return breakdown;
  }
}

export default new PricingService();