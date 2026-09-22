import { describe, it, expect } from 'vitest';
import { paymentBadge } from './bookingStatus.js';

describe('paymentBadge', () => {
  it('labels an unpaid pay-at-hotel stay as "Pay at Hotel" (never "Pending")', () => {
    const badge = paymentBadge({
      bookingStatus: 'confirmed',
      paymentStatus: 'pending',
      payment: { method: 'pay_at_hotel' },
    });
    expect(badge).toEqual({ status: 'info', label: 'Pay at Hotel' });
  });

  it('shows a settled pay-at-hotel stay as collected at the hotel', () => {
    const badge = paymentBadge({
      bookingStatus: 'completed',
      paymentStatus: 'paid',
      payment: { method: 'pay_at_hotel' },
    });
    expect(badge).toEqual({ status: 'paid', label: 'Collected at hotel' });
  });

  it('never shows "Pending" for cancelled or no-show stays', () => {
    expect(paymentBadge({ bookingStatus: 'cancelled', paymentStatus: 'pending' }))
      .toEqual({ status: 'neutral', label: 'Not charged' });
    expect(paymentBadge({ bookingStatus: 'no_show', paymentStatus: 'pending' }))
      .toEqual({ status: 'neutral', label: 'Not charged' });
    // a cancelled pay-at-hotel booking must not advertise "Pay at Hotel"
    expect(paymentBadge({
      bookingStatus: 'cancelled',
      paymentStatus: 'pending',
      payment: { method: 'pay_at_hotel' },
    })).toEqual({ status: 'neutral', label: 'Not charged' });
  });

  it('falls back to the raw payment status for online payments', () => {
    expect(paymentBadge({ bookingStatus: 'pending', paymentStatus: 'pending' }))
      .toEqual({ status: 'pending', label: 'Pending' });
    expect(paymentBadge({ bookingStatus: 'confirmed', paymentStatus: 'paid', payment: { method: 'upi' } }))
      .toEqual({ status: 'paid', label: 'Paid' });
    expect(paymentBadge({ bookingStatus: 'confirmed', paymentStatus: 'partially_refunded' }))
      .toEqual({ status: 'partially_refunded', label: 'Partially Refunded' });
  });

  it('always returns a renderable label', () => {
    expect(paymentBadge(null)).toEqual({ status: 'pending', label: 'Pending' });
    expect(paymentBadge({})).toEqual({ status: 'pending', label: 'Pending' });
  });
});