import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBooking, cancelBooking } from '../../features/bookings/bookingsSlice';
import { formatCurrency, formatDate, nightsBetween } from '../../utils/format';
import { paymentBadge } from '../../utils/bookingStatus';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ReviewForm from '../../components/reviews/ReviewForm';
import { Spinner } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/States';

export default function BookingDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { detail, detailStatus, cancelStatus } = useSelector((s) => s.bookings);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    dispatch(fetchBooking(id));
  }, [dispatch, id]);

  const confirmCancel = async () => {
    setCancelError('');
    try {
      await dispatch(cancelBooking({ id, reason: reason.trim() || undefined })).unwrap();
      setShowCancel(false);
      setReason('');
    } catch (err) {
      setCancelError(err || 'Cancellation failed. Please try again.');
    }
  };

  if (detailStatus === 'loading') return <Spinner label="Loading booking" />;
  if (detailStatus === 'failed') return <ErrorState title="Booking not found" message="This booking may have been removed." />;
  if (!detail) return null;

  const b = detail;
  const canCancel = ['pending', 'confirmed'].includes(b.bookingStatus);
  const payBadge = paymentBadge(b);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">Booking {b.bookingNumber}</h2>
          <div className="mt-2 flex gap-2"><Badge status={b.bookingStatus} /><Badge status={payBadge.status}>{payBadge.label}</Badge></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => setShowCancel(true)} loading={cancelStatus === 'loading'}>
              Cancel booking
            </Button>
          )}
          {b.bookingStatus === 'pending' && !['paid'].includes(b.paymentStatus) && b.payment?.method !== 'pay_at_hotel' && (
            <Link to={`/bookings/pay/${b._id}`}>
              <Button size="sm">Complete payment · {formatCurrency(b.pricing?.total)}</Button>
            </Link>
          )}
          {b.bookingStatus === 'confirmed' && (
            <Link to={`/bookings/confirmation/${b._id}`}>
              <Button variant="secondary" size="sm">View confirmation</Button>
            </Link>
          )}
          {['confirmed', 'completed'].includes(b.bookingStatus) && !reviewed
            && b.checkOut && new Date(b.checkOut).getTime() <= new Date().setHours(0, 0, 0, 0) && (
            <Button variant="secondary" size="sm" onClick={() => setShowReview(true)}>Rate your stay</Button>
          )}
          {reviewed && (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Reviewed ✓</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-base p-6">
            <h3 className="font-display text-base font-bold text-ink-900">{b.hotelId?.name || 'Hotel'}</h3>
            <p className="mt-1 text-sm text-ink-500">{b.roomId?.name || 'Room'}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs font-semibold uppercase text-ink-400">Check-in</p><p className="mt-1 text-sm font-medium text-ink-900">{formatDate(b.checkIn)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-ink-400">Check-out</p><p className="mt-1 text-sm font-medium text-ink-900">{formatDate(b.checkOut)}</p></div>
              <div><p className="text-xs font-semibold uppercase text-ink-400">Nights</p><p className="mt-1 text-sm font-medium text-ink-900">{nightsBetween(b.checkIn, b.checkOut)}</p></div>
            </div>
            {b.specialRequests && (
              <div className="mt-4 rounded-lg bg-ink-50 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400">Special requests</p>
                <p className="mt-1 text-sm text-ink-700">{b.specialRequests}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card-base p-6">
            <h3 className="font-display text-base font-bold text-ink-900">Payment summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Subtotal ({b.pricing?.nights || nightsBetween(b.checkIn, b.checkOut)} nights)</span><span>{formatCurrency(b.pricing?.roomSubtotal)}</span></div>
              {b.pricing?.serviceFee > 0 && <div className="flex justify-between"><span className="text-ink-500">Service & booking fee</span><span>{formatCurrency(b.pricing.serviceFee)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-500">Taxes (GST)</span><span>{formatCurrency(b.pricing?.taxes)}</span></div>
              {(b.pricing?.couponDiscount || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon discount</span><span>−{formatCurrency(b.pricing.couponDiscount)}</span></div>}
              <div className="flex justify-between border-t border-ink-100 pt-2 font-bold text-ink-900"><span>Total</span><span>{formatCurrency(b.pricing?.total)}</span></div>
            </div>
            {b.payment?.method && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2 text-xs">
                <span className="text-ink-500">Payment method</span>
                <span className="font-medium text-ink-800">{b.payment.method === 'pay_at_hotel' ? 'Pay at Hotel' : b.payment.method.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
          <Link to="/dashboard/bookings" className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700">← Back to all bookings</Link>
        </aside>
      </div>

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel booking"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}>Keep booking</Button>
            <Button variant="danger" size="sm" onClick={confirmCancel} loading={cancelStatus === 'loading'}>Confirm</Button>
          </>
        )}
      >
        <p className="text-sm text-ink-600">Cancellation policies apply.</p>
        {cancelError && <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{cancelError}</div>}
        <label htmlFor="cancel-reason" className="label-base mt-4">Reason (optional)</label>
        <textarea id="cancel-reason" rows={2} className="input-base" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <Modal open={showReview} onClose={() => setShowReview(false)} title="Rate your stay" size="lg">
        <ReviewForm
          hotelId={b.hotelId?._id || b.hotelId}
          stays={[b]}
          onSubmitted={() => { setShowReview(false); setReviewed(true); }}
          onCancel={() => setShowReview(false)}
        />
      </Modal>
    </div>
  );
}
