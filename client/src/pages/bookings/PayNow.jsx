import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBooking } from '../../features/bookings/bookingsSlice';
import { formatCurrency, formatDate, nightsBetween, titleCase } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/States';
import PaymentSection from '../../components/bookings/PaymentSection';

export default function PayNow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { detail, detailStatus } = useSelector((s) => s.bookings);

  useEffect(() => {
    dispatch(fetchBooking(id));
  }, [dispatch, id]);

  if (detailStatus === 'loading') return <Spinner label="Loading booking" />;
  if (detailStatus === 'failed') {
    return (
      <div className="container-content py-12">
        <ErrorState title="Booking not found" message="This booking may have been removed." />
      </div>
    );
  }
  if (!detail) return null;

  const b = detail;
  const hotel = b.hotelId || {};
  const room = b.roomId || {};
  const nights = Number(b.nights) || nightsBetween(b.checkIn, b.checkOut);
  const isPayAtHotel = b.payment?.method === 'pay_at_hotel';

  if (b.bookingStatus === 'confirmed' && (b.paymentStatus === 'paid' || isPayAtHotel)) {
    navigate(`/bookings/confirmation/${b._id}`, { replace: true });
    return null;
  }
  if (!['pending'].includes(b.bookingStatus)) {
    navigate(`/dashboard/bookings/${b._id}`, { replace: true });
    return null;
  }

  const onPaid = (confirmed) => navigate(`/bookings/confirmation/${confirmed._id}`, { replace: true });

  return (
    <div className="section-alt min-h-[70vh] py-8 sm:py-12">
      <div className="container-content">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-sand-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Resume checkout</p>
            <h1 className="mt-1 font-display text-xl font-bold text-ink-900">Complete your payment</h1>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <div className="card-base p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 6v6h4.5M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink-900">Booking {b.bookingNumber}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge status={b.bookingStatus} />
                      <Badge status={b.paymentStatus} />
                    </div>
                  </div>
                </div>
                <PaymentSection key={b._id} booking={b} onSuccess={onPaid} />
              </div>

              <div className="no-print flex items-center justify-between gap-3">
                <Link to={`/dashboard/bookings/${b._id}`} className="text-sm font-medium text-ink-500 hover:text-ink-800">← Back to booking</Link>
                <Link to="/hotels" className="text-sm font-medium text-brand-600 hover:text-brand-700">Explore more hotels →</Link>
              </div>
            </div>

            <aside className="space-y-4 lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
              <div className="card-base overflow-hidden">
                {hotel.images?.[0] && <img src={hotel.images[0]} alt={hotel.name} className="h-36 w-full object-cover" />}
                <div className="space-y-2.5 p-5 text-sm">
                  <p className="font-display text-base font-bold text-ink-900">{hotel.name}</p>
                  <p className="text-ink-500">{[hotel.city, hotel.state].filter(Boolean).map(titleCase).join(', ')}</p>
                  <div className="space-y-1.5 border-t border-ink-100 pt-3">
                    <div className="flex justify-between"><span className="text-ink-500">Check-in</span><span className="font-medium text-ink-900">{formatDate(b.checkIn)}</span></div>
                    <div className="flex justify-between"><span className="text-ink-500">Check-out</span><span className="font-medium text-ink-900">{formatDate(b.checkOut)}</span></div>
                    <div className="flex justify-between"><span className="text-ink-500">Room</span><span className="font-medium text-ink-900">{room.name}</span></div>
                    <div className="flex justify-between"><span className="text-ink-500">Duration</span><span className="font-medium text-ink-900">{nights} night{nights === 1 ? '' : 's'} · {b.guests?.adults} guest(s)</span></div>
                  </div>
                  <div className="flex justify-between border-t border-ink-100 pt-3">
                    <span className="font-bold text-ink-900">Amount due</span>
                    <span className="font-display text-lg font-bold text-brand-700">{formatCurrency(b.pricing?.total)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-sand-200 bg-sand-50/70 p-4 text-xs text-ink-500">
                <p className="font-semibold text-ink-700">💡 Tip</p>
                <p className="mt-1">Payments left incomplete are reserved for 24 hours. After that the booking may be cancelled automatically.</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}