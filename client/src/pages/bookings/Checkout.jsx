import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { priceQuote, createBooking, resetBookingFlow } from '../../features/bookings/bookingsSlice';
import { apiGet } from '../../services/apiClient';
import { formatCurrency, formatDate, nightsBetween, titleCase } from '../../utils/format';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/States';

const STEPS = ['Guest details', 'Payment', 'Confirmation'];

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { quote, quoteStatus, quoteError, createStatus, createError, current } = useSelector((s) => s.bookings);

  const hotelId = params.get('hotelId');
  const roomId = params.get('roomId');
  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');

  const [adults, setAdults] = useState(Number(params.get('adults')) || 2);
  const [children, setChildren] = useState(Number(params.get('children')) || 0);
  const [rooms, setRooms] = useState(Number(params.get('rooms')) || 1);
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [hotel, setHotel] = useState(null);
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [specialRequests, setSpecialRequests] = useState('');

  const nights = nightsBetween(checkIn, checkOut);

  // Hotel + room context for the summary sidebar (best-effort)
  useEffect(() => {
    let alive = true;
    if (!hotelId) return undefined;
    apiGet(`/search/hotels/${hotelId}`)
      .then(({ data }) => { if (alive) setHotel(data?.hotel || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [hotelId]);

  const room = hotel?.rooms?.find((r) => String(r._id) === String(roomId)) || null;
  const maxAdults = room?.capacity?.adults || 6;
  const maxChildren = room?.capacity?.children ?? 4;

  useEffect(() => {
    if (room && adults > maxAdults) setAdults(maxAdults);
    if (room && children > maxChildren) setChildren(maxChildren);
  }, [room, adults, children, maxAdults, maxChildren]);

  useEffect(() => {
    if (hotelId && roomId && checkIn && checkOut) {
      dispatch(priceQuote({ roomId, checkIn, checkOut, rooms: Number(rooms), couponCode: couponCode || undefined }));
    }
    return () => { dispatch(resetBookingFlow()); };
  }, [dispatch, hotelId, roomId, checkIn, checkOut, rooms, couponCode]);

  useEffect(() => {
    if (createStatus === 'succeeded' && current) {
      navigate(`/bookings/pay/${current._id}`, { replace: true });
    }
  }, [createStatus, current, navigate]);

  if (!hotelId || !roomId || !checkIn || !checkOut) {
    return (
      <div className="container-page py-12">
        <ErrorState
          title="Missing booking details"
          message="Please pick your dates and a room from a hotel page to proceed."
          onRetry={() => navigate('/hotels')}
        />
      </div>
    );
  }

  const applyCoupon = () => {
    const code = couponInput.trim();
    if (code.length < 3 || code.length > 30) {
      setCouponMsg('Coupon code must be 3–30 characters');
      return;
    }
    setCouponMsg('');
    setCouponCode(code.toUpperCase());
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponInput('');
    setCouponMsg('');
  };

  const couponApplied = quoteStatus === 'succeeded' && couponCode && (quote?.couponDiscount || 0) > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createBooking({
      roomId,
      checkIn,
      checkOut,
      guests: { adults: Number(adults), children: Number(children) },
      rooms: Number(rooms),
      guestDetails: { fullName: guestName.trim(), email: guestEmail.trim(), phone: guestPhone.trim() },
      specialRequests,
      couponCode: couponCode || undefined,
    }));
  };

  const quoteNights = quote?.nights || nights;

  return (
    <div className="section-alt min-h-[70vh] py-8 sm:py-12">
      <div className="container-page">
        <div className="mx-auto max-w-5xl">
          <ol className="mb-6 flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2 sm:gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${i === 0 ? 'bg-brand-600 text-white' : 'border border-ink-200 bg-white text-ink-400'}`}>{i + 1}</span>
                <span className={i === 0 ? 'text-ink-900' : 'text-ink-400'}>{label}</span>
                {i < STEPS.length - 1 && <span className="text-ink-300" aria-hidden="true">—</span>}
              </li>
            ))}
          </ol>

          <h1 className="font-display text-2xl font-bold text-ink-900">Review your stay</h1>
          <p className="mt-1 text-sm text-ink-500">Guest details, price summary, then secure payment.</p>

          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
              <div className="card-base p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">Guest details</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label="Full name" autoComplete="name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required minLength={2} />
                  <Input label="Mobile number" autoComplete="tel" inputMode="tel" pattern="[0-9+\-\s]{6,20}" title="Enter a valid phone number" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required />
                  <div className="sm:col-span-2">
                    <Input label="Email" type="email" autoComplete="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
                    <p className="mt-1.5 text-xs text-ink-400">Confirmation &amp; invoice will be sent to this email.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="requests" className="label-base">Special requests (optional)</label>
                    <textarea id="requests" className="input-base resize-y" rows={3} maxLength={1000} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Early check-in, airport pickup, extra pillows…" />
                  </div>
                </div>
              </div>

              <div className="card-base p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">Stay details</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-sand-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Check-in</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">{formatDate(checkIn)}</p>
                  </div>
                  <div className="rounded-xl bg-sand-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Check-out</p>
                    <p className="mt-1 text-sm font-bold text-ink-900">{formatDate(checkOut)}</p>
                  </div>
                  <div>
                    <label htmlFor="adults" className="label-base">Adults</label>
                    <select id="adults" className="input-base" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                      {Array.from({ length: maxAdults }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="children" className="label-base">Children</label>
                    <select id="children" className="input-base" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                      {Array.from({ length: maxChildren + 1 }, (_, i) => i).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rooms" className="label-base">Rooms</label>
                    <select id="rooms" className="input-base" value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs text-ink-500">{quoteNights} night{quoteNights === 1 ? '' : 's'} · {Number(adults) + Number(children)} guest{Number(adults) + Number(children) === 1 ? '' : 's'}</p>
                  </div>
                </div>
                {room && <p className="mt-3 text-xs text-ink-400">Room capacity: up to {room.capacity?.adults} adults{room.capacity?.children ? ` + ${room.capacity.children} children` : ''} per room.</p>}
              </div>

              <div className="card-base p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">Coupon</h2>
                {couponCode ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-emerald-800">{couponCode}</p>
                      <p className="text-xs text-emerald-700">
                        {couponApplied ? `Applied — you saved ${formatCurrency(quote.couponDiscount)}` : 'Checking applicability…'}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={removeCoupon}>Remove</Button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <input
                      aria-label="Coupon code"
                      className="input-base flex-1 uppercase"
                      placeholder="e.g. WELCOME10"
                      maxLength={30}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={applyCoupon}>Apply</Button>
                  </div>
                )}
                {couponMsg && <p className="mt-2 text-xs text-red-600">{couponMsg}</p>}
                {couponCode && quoteStatus === 'failed' && <p className="mt-2 text-xs text-red-600">{quoteError}</p>}
              </div>
            </form>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="card-base overflow-hidden">
                {hotel?.images?.[0] && <img src={hotel.images[0]} alt={hotel.name} className="h-32 w-full object-cover" loading="lazy" />}
                <div className="space-y-2.5 p-5 text-sm">
                  <p className="font-display text-base font-bold text-ink-900">{hotel?.name || 'Your stay'}</p>
                  <p className="text-ink-500">{[hotel?.city, hotel?.state].filter(Boolean).map(titleCase).join(', ') || '—'}</p>
                  {room && <p className="text-xs text-ink-500">Room: <span className="font-medium text-ink-800">{room.name}</span></p>}
                  <Link to={`/hotels/${hotelId}`} className="inline-block text-xs font-medium text-brand-600 hover:text-brand-700">← Change room / dates</Link>
                </div>

                <div className="border-t border-ink-100 p-5">
                  <h2 className="font-display text-base font-bold text-ink-900">Price details</h2>
                  {quoteStatus === 'loading' && <div className="mt-4"><Spinner label="Calculating" /></div>}
                  {quoteStatus === 'failed' && !couponCode && <p className="mt-4 text-sm text-red-600">{quoteError}</p>}
                  {quoteStatus === 'succeeded' && quote && (
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-ink-500">
                          {formatCurrency(quote.basePricePerNight)} × {quoteNights} night{quoteNights === 1 ? '' : 's'}
                          {quote.rooms > 1 ? ` × ${quote.rooms} rooms` : ''}
                        </span>
                        <span className="text-ink-700">{formatCurrency(quote.roomSubtotal)}</span>
                      </div>
                      {quote.weekendMarkup > 0 && (
                        <p className="text-xs text-ink-400">Includes weekend / seasonal rate adjustments.</p>
                      )}
                      {quote.serviceFee > 0 && (
                        <div className="flex justify-between"><span className="text-ink-500">Service &amp; booking fee</span><span className="text-ink-700">{formatCurrency(quote.serviceFee)}</span></div>
                      )}
                      {quote.taxes > 0 && (
                        <div className="flex justify-between"><span className="text-ink-500">Taxes (GST)</span><span className="text-ink-700">{formatCurrency(quote.taxes)}</span></div>
                      )}
                      {(quote.couponDiscount || 0) > 0 && (
                        <div className="flex justify-between text-emerald-600"><span>Coupon {quote.coupon?.code}</span><span>−{formatCurrency(quote.couponDiscount)}</span></div>
                      )}
                      <div className="flex justify-between border-t border-ink-100 pt-2">
                        <span className="font-bold text-ink-900">Total payable</span>
                        <span className="font-display text-lg font-bold text-ink-900">{formatCurrency(quote.total)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    form="checkout-form"
                    type="submit"
                    className="btn-primary mt-6 w-full"
                    disabled={createStatus === 'loading' || quoteStatus !== 'succeeded'}
                  >
                    {createStatus === 'loading' ? 'Creating booking…' : `Continue to payment${quote ? ` · ${formatCurrency(quote.total)}` : ''}`}
                  </button>
                  {createError && <p role="alert" className="mt-2 text-xs text-red-600">{createError}</p>}
                  <p className="mt-3 text-center text-xs text-ink-500">Next: secure payment — UPI, card, net-banking, wallet or pay at hotel.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}