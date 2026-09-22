import { titleCase } from './format';

/** Booking statuses for which no money is ever collected from the guest. */
const NOT_BILLED = ['cancelled', 'no_show'];

/**
 * Payment badge descriptor `{ status, label }` for a booking.
 *
 * "Pay at hotel" bookings keep `paymentStatus: 'pending'` until the front desk
 * collects the money, and cancelled stays are never charged at all — rendering
 * the raw status would tag both as a misleading "Pending".
 */
export function paymentBadge(booking) {
  const b = booking || {};
  const method = b.payment?.method || '';
  const status = b.paymentStatus || 'pending';

  // Nothing was ever collected for a cancelled / no-show stay — say so instead
  // of showing a "Pending" payment tag that looks like money still owed.
  if (status === 'pending' && NOT_BILLED.includes(b.bookingStatus)) {
    return { status: 'neutral', label: 'Not charged' };
  }
  if (method === 'pay_at_hotel') {
    if (status === 'pending') return { status: 'info', label: 'Pay at Hotel' };
    if (status === 'paid') return { status: 'paid', label: 'Collected at hotel' };
  }
  return { status, label: titleCase(status) };
}