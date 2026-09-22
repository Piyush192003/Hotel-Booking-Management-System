import ApiError from '../utils/ApiError.js';
import { toLocalMidnight } from '../utils/dateUtils.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Cancellation & refund rules — always computed server-side from the hotel's
 * stored policy. Bookings are never deleted; they are marked cancelled and
 * kept for audit/history.
 */
class CancellationService {
  /**
   * @returns { feeAmount, refundableAmount, freeWindow, hoursUntilCheckIn }
   */
  calculateForBooking(booking, hotelPolicy = {}) {
    if (![ 'confirmed', 'pending' ].includes(booking.bookingStatus)) {
      throw ApiError.conflict('This booking cannot be cancelled any more', 'CANCELLATION_NOT_ALLOWED');
    }
    const freeCancellationHours = Number(hotelPolicy?.freeCancellationHours ?? 48);
    const cancellationFeePercent = Number(hotelPolicy?.cancellationFeePercent ?? 25);
    const checkIn = toLocalMidnight(booking.checkIn);
    const now = new Date();

    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / 3600000;
    const freeWindow = hoursUntilCheckIn >= freeCancellationHours;

    const total = booking.pricing?.total || 0;
    let feeAmount = 0;
    if (!freeWindow) {
      feeAmount = round2((total * cancellationFeePercent) / 100);
    }
    const refundableAmount = round2(Math.max(total - feeAmount, 0));
    return { feeAmount, refundableAmount, freeWindow, hoursUntilCheckIn, freeCancellationHours, cancellationFeePercent };
  }
}

export default new CancellationService();