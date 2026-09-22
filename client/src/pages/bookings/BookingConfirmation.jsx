import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBooking } from '../../features/bookings/bookingsSlice';
import { formatCurrency, formatDate, nightsBetween, titleCase } from '../../utils/format';
import { paymentBadge } from '../../utils/bookingStatus';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/States';

const PAYMENT_LABELS = {
  upi: 'UPI',
  card: 'Credit / Debit Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
  pay_at_hotel: 'Pay at Hotel',
};

export default function BookingConfirmation() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { detail, detailStatus } = useSelector((s) => s.bookings);

  useEffect(() => {
    dispatch(fetchBooking(id));
  }, [dispatch, id]);

  if (detailStatus === 'loading') return <Spinner label="Loading confirmation" />;
  if (detailStatus === 'failed') {
    return (
      <div className="container-content py-12">
        <ErrorState title="Confirmation not found" message="We could not find this booking." />
      </div>
    );
  }
  if (!detail) return null;

  const b = detail;
  const hotel = b.hotelId || {};
  const room = b.roomId || {};
  const nights = Number(b.nights) || nightsBetween(b.checkIn, b.checkOut);
  const isPayAtHotel = b.payment?.method === 'pay_at_hotel';
  const payBadge = paymentBadge(b);
  const needsPayment = b.bookingStatus === 'pending' && !['paid'].includes(b.paymentStatus) && !isPayAtHotel;
  const methodLabel = PAYMENT_LABELS[b.payment?.method] || (b.paymentStatus === 'paid' ? 'Online' : '—');
  const address = [hotel.address, hotel.city, hotel.state].filter(Boolean).map(titleCase).join(', ');
  const checkInCode = b.checkInCode;

  const priceLine = (label, value, cls = '') => (
    <div className={`flex justify-between text-sm ${cls}`}>
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );

  return (
    <div className="section-alt min-h-[70vh] py-8 sm:py-12">
      <div className="container-content">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Success hero */}
          <div className="invoice-area overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-float">
            <div className="bg-gradient-to-r from-emerald-600 to-brand-600 px-6 py-8 text-center text-white sm:px-10">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20">
                <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9" aria-hidden="true">
                  <path d="M5 13l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{isPayAtHotel ? 'Booking confirmed 🎉' : 'Payment successful — booking confirmed 🎉'}</h1>
              <p className="mt-2 text-sm text-white/85">
                Your stay at <strong className="text-white">{hotel.name}</strong> is confirmed.
                A confirmation email is on its way to <strong className="text-white">{b.guestDetails?.email}</strong>.
              </p>
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
                Booking ID: <span className="font-mono font-bold">{b.bookingNumber}</span>
              </div>
            </div>

            <div className="grid gap-px bg-sand-100 sm:grid-cols-3">
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Booking status</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge status={b.bookingStatus} />
                  <Badge status={payBadge.status}>{payBadge.label}</Badge>
                </div>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Paid</p>
                <p className="mt-1.5 font-display text-lg font-bold text-ink-900">{isPayAtHotel ? 'At property' : formatCurrency(b.pricing?.total)}</p>
                <p className="text-xs text-ink-500">via {methodLabel}{b.payment?.paidAt ? ` · ${formatDate(b.payment.paidAt)}` : ''}</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Check-in code</p>
                {checkInCode ? (
                  <p className="mt-1.5 font-mono text-lg font-bold text-brand-700">{checkInCode}</p>
                ) : (
                  <p className="mt-1.5 text-sm text-ink-500">Provided at check-in</p>
                )}
              </div>
            </div>

            <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-base font-bold text-ink-900">{hotel.name}</h2>
                  <p className="mt-0.5 text-sm text-ink-500">{address || 'India'}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{room.name}{room.bedType ? ` · ${titleCase(room.bedType)}` : ''} · {b.rooms ?? 1} room(s)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-sand-50 p-3">
                    <p className="text-xs font-semibold uppercase text-ink-400">Check-in</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">{formatDate(b.checkIn)}</p>
                    <p className="text-xs text-ink-500">from {hotel.policies?.checkInTime || '14:00'}</p>
                  </div>
                  <div className="rounded-xl bg-sand-50 p-3">
                    <p className="text-xs font-semibold uppercase text-ink-400">Check-out</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">{formatDate(b.checkOut)}</p>
                    <p className="text-xs text-ink-500">until {hotel.policies?.checkOutTime || '11:00'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600">
                  <span><strong className="text-ink-900">{nights}</strong> night{nights === 1 ? '' : 's'}</span>
                  <span><strong className="text-ink-900">{b.guests?.adults || 1}</strong> adult{(b.guests?.adults || 1) === 1 ? '' : 's'}{b.guests?.children ? `, ${b.guests.children} child(ren)` : ''}</span>
                </div>
                {b.specialRequests && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="text-xs font-semibold uppercase text-amber-500">Special requests</p>
                    <p className="mt-1">{b.specialRequests}</p>
                  </div>
                )}
              </div>

              <div>
                <h2 className="font-display text-base font-bold text-ink-900">Payment summary</h2>
                <div className="mt-3 space-y-2.5">
                  {priceLine(`${formatCurrency(b.pricing?.basePricePerNight)} × ${nights} night${nights === 1 ? '' : 's'}`, formatCurrency(b.pricing?.roomSubtotal))}
                  {b.pricing?.serviceFee > 0 && priceLine('Service & booking fee', formatCurrency(b.pricing.serviceFee))}
                  {b.pricing?.taxes > 0 && priceLine('Taxes (GST)', formatCurrency(b.pricing.taxes))}
                  {b.pricing?.couponDiscount > 0 && priceLine('Coupon discount', `−${formatCurrency(b.pricing.couponDiscount)}`, 'text-emerald-600')}
                  <div className="flex justify-between border-t border-ink-100 pt-3">
                    <span className="font-bold text-ink-900">Grand total</span>
                    <span className="font-display text-lg font-bold text-brand-700">{formatCurrency(b.pricing?.total)}</span>
                  </div>
                </div>
                {isPayAtHotel && (
                  <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
                    This amount will be collected at the hotel reception during check-in.
                  </p>
                )}
                <div className="mt-4 rounded-xl border border-ink-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Guest</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">{b.guestDetails?.fullName}</p>
                  <p className="text-sm text-ink-500">{b.guestDetails?.email}</p>
                  {b.guestDetails?.phone && <p className="text-sm text-ink-500">{b.guestDetails.phone}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-3 border-t border-sand-100 bg-sand-50/60 p-5 text-xs text-ink-500 sm:p-6">
              <span className="text-base" aria-hidden="true">ℹ️</span>
              <p>
                <strong className="text-ink-700">Cancellation policy:</strong> Free cancellation within {hotel.policies?.cancellation?.freeCancellationHours || 48} hours of check-in.
                After that, the hotel's cancellation fees apply. All taxes are included in the total.
              </p>
            </div>
          </div>

          {needsPayment && (
            <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-800">Your booking is still awaiting payment.</p>
              <p className="mt-1 text-sm text-amber-700">Complete the payment to confirm your reservation before someone else books this room.</p>
              <Link to={`/bookings/pay/${b._id}`} className="mt-3 inline-block">
                <Button size="sm">Complete payment now · {formatCurrency(b.pricing?.total)}</Button>
              </Link>
            </div>
          )}

          <div className="no-print flex flex-wrap items-center justify-center gap-3">
            <Link to={`/dashboard/bookings/${b._id}`}><Button variant="dark">View my booking</Button></Link>
            <Button variant="secondary" onClick={() => window.print()}>🖨️ Download / print invoice</Button>
            <Link to="/hotels"><Button variant="ghost">Browse more hotels</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}