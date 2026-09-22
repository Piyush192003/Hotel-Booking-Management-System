import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, ArrowRight, Ban, BedDouble, CalendarDays, Camera, Car, Check, ChevronLeft, ChevronRight,
  Clock, Coffee, Dumbbell, Heart, MapPin, ShieldCheck, Snowflake, Sparkles, Star, Users, Utensils, Waves, Wifi, X,
} from 'lucide-react';
import { fetchHotelDetail, fetchRoomAvailability, clearDetail } from '../../features/hotels/hotelsSlice';
import { addToWishlist, removeFromWishlist, fetchWishlistStatus } from '../../features/wishlist/wishlistSlice';
import { todayISO, addDaysISO, formatCurrency, formatDate, nightsBetween, titleCase } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/States';
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewForm from '../../components/reviews/ReviewForm';
import { apiGet } from '../../services/apiClient';
import { cn } from '../../utils/cn';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=60';
const MAX_GALLERY = 5;

const AMENITY_ICONS = {
  wifi: Wifi,
  parking: Car,
  pool: Waves,
  'swimming pool': Waves,
  restaurant: Utensils,
  breakfast: Coffee,
  bar: Coffee,
  gym: Dumbbell,
  'fitness center': Dumbbell,
  spa: Sparkles,
  ac: Snowflake,
  'air conditioning': Snowflake,
  'room service': Utensils,
};

/** Maps an amenity string to a lucide icon (defaults to Sparkles). */
function amenityIcon(name) {
  const key = String(name || '').toLowerCase();
  for (const [label, Icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(label)) return Icon;
  }
  return Sparkles;
}

/** Full-bleed photo lightbox with keyboard navigation. */
function Lightbox({ images, index, onClose, onNavigate }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNavigate((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/95" role="dialog" aria-modal="true" aria-label="Photo gallery" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25" aria-label="Close gallery">
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + images.length) % images.length); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 sm:left-6"
        aria-label="Previous photo"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <figure className="max-h-[85vh] max-w-5xl px-12 sm:px-16" onClick={(e) => e.stopPropagation()}>
        <img src={images[index]} alt={`Photo ${index + 1} of ${images.length}`} className="max-h-[76vh] w-auto rounded-2xl object-contain shadow-2xl" />
        <figcaption className="mt-3 text-center text-sm font-medium text-white/70">{index + 1} / {images.length}</figcaption>
      </figure>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % images.length); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 sm:right-6"
        aria-label="Next photo"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}

/** Single room card inside the rooms grid. */
function RoomCard({ room, avail, nights, selected, onSelect }) {
  const price = Number(room.pricePerNight || room.basePrice || 0);
  const adults = room.capacity?.adults ?? 2;
  const available = avail ? avail.availability?.available !== false : true;
  const unitsLeft = avail?.availability?.roomsAvailable ?? room.availableUnits;
  const lowStock = available && Number.isFinite(unitsLeft) && unitsLeft > 0 && unitsLeft <= 2;

  return (
    <div className={cn(
      'group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200',
      selected ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-ink-100 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card',
    )}>
      {room.images?.[0] && (
        <div className="relative h-44 w-full overflow-hidden bg-ink-100">
          <img src={room.images[0]} alt={room.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          {lowStock && <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">Only {unitsLeft} left</span>}
          {!available && <span className="absolute left-3 top-3 rounded-full bg-ink-800/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">Sold out</span>}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold text-ink-900">{room.name}</h3>
          <Badge status="neutral">{titleCase(room.roomType || 'room')}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-600" />{adults} guest{adults > 1 ? 's' : ''}</span>
          <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-600" />{titleCase(room.bedType || 'queen')} bed</span>
          {room.size ? <span>· {room.size} sqft</span> : null}
        </div>
        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.slice(0, 4).map((a) => (
              <span key={a} className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-ink-600">{titleCase(a)}</span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink-100 pt-3">
          <div>
            <p className="font-display text-lg font-bold text-ink-900">{formatCurrency(price)}</p>
            <p className="text-xs text-ink-500">per night · <span className="text-ink-400">{formatCurrency(price * nights)} total</span></p>
          </div>
          <Button size="sm" variant={selected ? 'primary' : 'secondary'} disabled={!available} onClick={onSelect}>
            {selected ? <><Check className="h-4 w-4" /> Selected</> : available ? 'Select room' : 'Sold out'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HotelDetail() {
  const { identifier } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { detail, detailStatus, detailError, availability, availabilityStatus } = useSelector((s) => s.hotels);
  const { ids: wishlistIds } = useSelector((s) => s.wishlist);
  const { user } = useSelector((s) => s.auth);

  const [checkIn, setCheckIn] = useState(addDaysISO(todayISO(), 7));
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 9));
  const [guests, setGuests] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [lightbox, setLightbox] = useState(-1);
  const [flashRooms, setFlashRooms] = useState(false);
  const [myStays, setMyStays] = useState([]);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const widgetRef = useRef(null);
  const roomsRef = useRef(null);

  useEffect(() => {
    dispatch(fetchHotelDetail(identifier));
    return () => { dispatch(clearDetail()); };
  }, [dispatch, identifier]);

  // Load the user's saved/not-saved state for this hotel so the Save button
  // shows the correct "Save"/"Saved" label and heart fill on page load.
  useEffect(() => {
    if (user && detail?.hotel?._id) dispatch(fetchWishlistStatus(detail.hotel._id));
  }, [dispatch, user, detail?.hotel?._id]);

  // "Rate your stay" eligibility: the user's finished stays at this hotel —
  // confirmed/completed, checked out, and not already reviewed.
  useEffect(() => {
    if (!user || !detail?.hotel?._id) { setMyStays([]); return undefined; }
    let alive = true;
    Promise.all([
      apiGet('/bookings/my', { page: 1, limit: 50 }),
      apiGet('/reviews/my', { page: 1, limit: 50 }),
    ]).then(([{ data: bookingsData }, { data: reviewsData }]) => {
      if (!alive) return undefined;
      const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.bookings || [];
      const mine = Array.isArray(reviewsData) ? reviewsData : reviewsData?.reviews || [];
      const reviewedBookings = new Set(mine.map((r) => String(r.bookingId?._id || r.bookingId)));
      const today = new Date().setHours(0, 0, 0, 0);
      const hotelId = String(detail.hotel._id);
      setMyStays(bookings.filter((b) => (
        String(b.hotelId?._id || b.hotelId) === hotelId
        && ['confirmed', 'completed'].includes(b.bookingStatus)
        && b.checkOut && new Date(b.checkOut).getTime() <= today
        && !reviewedBookings.has(String(b._id))
      )));
      return undefined;
    }).catch(() => {});
    return () => { alive = false; };
  }, [user, detail?.hotel?._id, reviewRefresh]);

  useEffect(() => {
    if (detail?.hotel?._id) {
      dispatch(fetchRoomAvailability({ hotelId: detail.hotel._id, checkIn, checkOut, adults: guests }));
    }
  }, [dispatch, detail?.hotel?._id, checkIn, checkOut, guests]);

  // Auto-select the first available room once availability resolves, so the
  // "Book now" button is immediately usable instead of a dead "Choose a room".
  useEffect(() => {
    if (selectedRoom !== null || !detail?.rooms?.length) return;
    if (availabilityStatus === 'idle' || availabilityStatus === 'loading') return;
    const list = detail.rooms || [];
    const firstAvailable = list.find((r) => {
      const avail = availability[r._id];
      return avail ? avail.availability?.available !== false : true;
    }) || list[0];
    setSelectedRoom(firstAvailable);
  }, [detail?.rooms, availability, availabilityStatus, selectedRoom]);

  if (detailStatus === 'loading') return <Spinner label="Loading hotel" className="min-h-screen" />;
  if (detailStatus === 'failed') {
    return (
      <div className="container-page py-12">
        <ErrorState title="Could not load hotel" message={detailError} onRetry={() => dispatch(fetchHotelDetail(identifier))} />
      </div>
    );
  }
  if (!detail?.hotel) return null;

  const hotel = detail.hotel;
  const rooms = detail.rooms || [];
  const reviews = detail.reviews || [];
  const images = hotel.images?.length ? hotel.images : [FALLBACK_IMAGE];
  const sideImages = images.slice(1, MAX_GALLERY);
  const isWishlisted = wishlistIds.includes(hotel._id);
  const nights = Math.max(nightsBetween(checkIn, checkOut), 1);
  const minRoomPrice = rooms.length ? Math.min(...rooms.map((r) => Number(r.pricePerNight || r.basePrice || Infinity))) : Infinity;
  const basePrice = hotel.startingPrice || hotel.minPrice || (Number.isFinite(minRoomPrice) ? minRoomPrice : 0);
  const locationLine = [hotel.city, hotel.state, hotel.country].filter(Boolean).map(titleCase).join(', ');
  const freeCancelHours = hotel.policies?.cancellation?.freeCancellationHours;
  const checkInTime = hotel.policies?.checkInTime || '14:00';
  const checkOutTime = hotel.policies?.checkOutTime || '11:00';

  const toggleWishlist = () => {
    if (!user) { navigate('/auth/login', { state: { from: `/hotels/${identifier}` } }); return; }
    if (isWishlisted) dispatch(removeFromWishlist(hotel._id));
    else dispatch(addToWishlist(hotel._id));
  };

  const bookRoom = (roomId) => {
    const q = new URLSearchParams({ hotelId: hotel._id, roomId, checkIn, checkOut, adults: String(guests) });
    navigate(`/bookings/checkout?${q.toString()}`);
  };

  const scrollToBooking = () => widgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const scrollToRooms = () => {
    roomsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFlashRooms(true);
    window.setTimeout(() => setFlashRooms(false), 1800);
  };

  // Always picks a usable room: explicit selection, else first available, else first room.
  const resolveRoom = () => selectedRoom
    || rooms.find((r) => {
      const avail = availability[r._id];
      return avail ? avail.availability?.available !== false : true;
    })
    || rooms[0];

  const handleBookNow = () => {
    const room = resolveRoom();
    if (!room) {
      scrollToRooms();
      return;
    }
    bookRoom(room._id);
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    if (window.matchMedia('(max-width: 1023px)').matches) scrollToBooking();
  };

  return (
    <div className="min-h-screen bg-sand-50">
      {/* ---------- Full-bleed hero gallery ---------- */}
      <section className="relative w-full bg-ink-950">
        <div className={cn('relative w-full', images.length > 1 ? 'grid gap-1 lg:h-[540px] lg:grid-cols-[1.55fr_1fr]' : '')}>
          <button
            type="button"
            onClick={() => setLightbox(0)}
            className="group relative h-[300px] w-full overflow-hidden text-left sm:h-[440px] lg:h-full"
            aria-label="Open photo gallery"
          >
            <img src={images[0]} alt={hotel.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />
          </button>

          {images.length > 1 && (
            <div className="hidden gap-1 lg:grid lg:grid-cols-2 lg:grid-rows-2">
              {Array.from({ length: 4 }).map((_, cell) => {
                const src = sideImages[cell];
                const isLastGridCell = cell === 3 && images.length > MAX_GALLERY;
                if (!src) {
                  return (
                    <div key={cell} className="flex items-center justify-center bg-brand-900/70">
                      <Camera className="h-8 w-8 text-white/25" />
                    </div>
                  );
                }
                return (
                  <button key={cell} type="button" onClick={() => setLightbox(cell + 1)} className="group relative overflow-hidden" aria-label={`Open photo ${cell + 2}`}>
                    <img src={src} alt={`${hotel.name} photo ${cell + 2}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    {isLastGridCell && (
                      <span className="absolute inset-0 flex items-center justify-center bg-ink-950/60 text-sm font-bold text-white">
                        +{images.length - MAX_GALLERY} more
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

<button
          type="button"
          onClick={() => setLightbox(0)}
          className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-ink-800 shadow-lg backdrop-blur transition hover:bg-white"
        >
          <Camera className="h-4 w-4 text-brand-700" /> Show all photos
        </button>

        {/* Hero title overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="container-page pb-6">
            <div className="flex flex-wrap items-end justify-between gap-5 text-white">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">{titleCase(hotel.propertyType || 'stay')}</span>
                  {hotel.featured && <span className="rounded-full bg-amber-400/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-900">Featured</span>}
                </div>
                <h1 className="mt-3 font-display text-3xl font-bold drop-shadow sm:text-4xl lg:text-[2.6rem]">{hotel.name}</h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85"><MapPin className="h-4 w-4" />{locationLine}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm text-ink-900">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{Number(hotel.rating || 0).toFixed(1)}</span>
                    <span className="text-xs text-ink-500">({hotel.reviewCount || 0} reviews)</span>
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">{hotel.starRating || 0}-star property</span>
                </div>
              </div>
              <div className="pointer-events-auto flex flex-wrap items-center gap-3">
                <Button variant="secondary" className="bg-white/95 backdrop-blur hover:bg-white" onClick={toggleWishlist}>
                  <Heart className={cn('h-4 w-4 transition', isWishlisted && 'fill-red-500 text-red-500')} />
                  {isWishlisted ? 'Saved' : 'Save'}
                </Button>
                <Button variant="primary" onClick={scrollToBooking}>
                  <CalendarDays className="h-4 w-4" /> Book now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Sticky quick-summary bar ---------- */}
      <div className="sticky top-16 z-30 border-y border-ink-100 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/hotels" className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-500 transition hover:bg-ink-50 hover:text-brand-700">
              <ArrowLeft className="h-4 w-4" /> Hotels
            </Link>
            <span className="hidden h-6 w-px bg-ink-200 sm:block" />
            <div className="hidden min-w-0 md:block">
              <p className="truncate font-display text-sm font-bold text-ink-900">{hotel.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-ink-700">{Number(hotel.rating || 0).toFixed(1)}</span>
                <span>·</span>
                <span className="truncate">{titleCase(hotel.city || '')}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="text-right leading-tight">
              <p className="text-[11px] text-ink-400">Starting from</p>
              <p className="font-display text-base font-bold text-ink-900">{formatCurrency(basePrice)}<span className="text-xs font-normal text-ink-500">/night</span></p>
            </div>
            <Button size="sm" onClick={scrollToBooking}><CalendarDays className="h-4 w-4" /> Check availability</Button>
          </div>
        </div>
      </div>

      {/* ---------- Main content ---------- */}
      <div className="container-page py-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">

{/* About */}
            <section className="card-base p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge status="info">{titleCase(hotel.propertyType || 'stay')}</Badge>
                {hotel.featured && <Badge status="active"><Star className="mr-1 h-3 w-3 fill-current" />Featured</Badge>}
              </div>
              <h2 className="mt-4 font-display text-xl font-bold text-ink-900">About this {titleCase(hotel.propertyType || 'hotel')}</h2>
              {hotel.tagline && <p className="mt-2 text-sm font-semibold text-brand-700">{hotel.tagline}</p>}
              {hotel.description && <p className="mt-3 text-sm leading-relaxed text-ink-600">{hotel.description}</p>}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-ink-100 bg-sand-50/70 px-4 py-3 text-center">
                  <Star className="mx-auto h-5 w-5 text-amber-400" />
                  <p className="mt-1.5 font-display text-base font-bold text-ink-900">{Number(hotel.rating || 0).toFixed(1)}</p>
                  <p className="text-xs text-ink-500">Guest rating</p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-sand-50/70 px-4 py-3 text-center">
                  <BedDouble className="mx-auto h-5 w-5 text-brand-600" />
                  <p className="mt-1.5 font-display text-base font-bold text-ink-900">{rooms.length}</p>
                  <p className="text-xs text-ink-500">Room types</p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-sand-50/70 px-4 py-3 text-center">
                  <MapPin className="mx-auto h-5 w-5 text-brand-600" />
                  <p className="mt-1.5 truncate font-display text-base font-bold text-ink-900">{titleCase(hotel.city || 'India')}</p>
                  <p className="text-xs text-ink-500">Location</p>
                </div>
              </div>
            </section>

            {/* Amenities */}
            {hotel.amenities?.length > 0 && (
              <section className="card-base p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-ink-900">What this place offers</h2>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{hotel.amenities.length} amenities</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {hotel.amenities.map((a) => {
                    const Icon = amenityIcon(a);
                    return (
                      <div key={a} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-sand-50/60 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium text-ink-800">{titleCase(a)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

{/* Policies */}
            <section className="card-base p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-ink-900">Good to know</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-100 p-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand-700" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-ink-700">Check-in / Check-out</h3>
                  </div>
                  <p className="mt-2.5 text-sm text-ink-600">Check-in from <span className="font-semibold text-ink-900">{checkInTime}</span></p>
                  <p className="mt-1 text-sm text-ink-600">Check-out by <span className="font-semibold text-ink-900">{checkOutTime}</span></p>
                </div>
                <div className="rounded-xl border border-ink-100 p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-brand-700" />
                    <h3 className="text-sm font-bold uppercase tracking-wide text-ink-700">Cancellation</h3>
                  </div>
                  <p className="mt-2.5 text-sm text-ink-600">
                    {freeCancelHours
                      ? <>Free cancellation up to <span className="font-semibold text-ink-900">{freeCancelHours} hours</span> before check-in.</>
                      : 'Check the policies before booking.'}
                  </p>
                </div>
                {hotel.policies?.petPolicy && (
                  <div className="rounded-xl border border-ink-100 p-5">
                    <div className="flex items-center gap-2">
                      <Ban className="h-5 w-5 text-brand-700" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-700">Pets</h3>
                    </div>
                    <p className="mt-2.5 text-sm text-ink-600">{hotel.policies.petPolicy}</p>
                  </div>
                )}
                {hotel.policies?.houseRules?.length > 0 && (
                  <div className="rounded-xl border border-ink-100 p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-brand-700" />
                      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-700">House rules</h3>
                    </div>
                    <ul className="mt-2.5 space-y-1.5">
                      {hotel.policies.houseRules.map((rule) => (
                        <li key={rule} className="flex items-start gap-2 text-sm text-ink-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

{/* Rooms & rates */}
            <section
              ref={roomsRef}
              className={cn(
                'card-base scroll-mt-32 p-6 transition-all duration-300 sm:p-8',
                flashRooms && 'ring-4 ring-brand-300 shadow-brand-glow',
              )}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink-900">Rooms & rates</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} night{nights > 1 ? 's' : ''}
                  </p>
                </div>
                {availabilityStatus === 'loading' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-500">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /> Checking availability…
                  </span>
                )}
              </div>

              {rooms.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-sand-400 bg-sand-50/60 p-6 text-center text-sm text-ink-500">
                  No rooms are currently available for the selected dates.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room._id}
                      room={room}
                      avail={availability[room._id]}
                      nights={nights}
                      selected={selectedRoom?._id === room._id}
                      onSelect={() => selectRoom(room)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Guest reviews */}
            <section className="card-base p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-ink-900">Guest reviews</h2>
                <span className="text-xs text-ink-500">{hotel.reviewCount || reviews.length} review{(hotel.reviewCount || reviews.length) === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl bg-brand-gradient px-6 py-5 text-white">
                <span className="font-display text-4xl font-bold">{Number(hotel.rating || 0).toFixed(1)}</span>
                <div>
                  <div className="flex items-center gap-1 text-amber-300">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={cn('h-4 w-4', i <= Math.round(hotel.rating || 0) ? 'fill-current' : 'text-white/30')} />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-white/80">Based on {hotel.reviewCount || reviews.length} verified guest review{(hotel.reviewCount || reviews.length) === 1 ? '' : 's'}</p>
                </div>
              </div>
              {user && (
                <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
                  <h3 className="font-display text-base font-bold text-ink-900">{myStays.length > 0 ? 'Rate your stay' : 'Write a review'}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {myStays.length > 0
                      ? 'You stayed here — tell other travellers about your experience.'
                      : 'Share your experience of this property with other travellers.'}
                  </p>
                  <div className="mt-4">
                    <ReviewForm
                      hotelId={hotel._id}
                      stays={myStays}
                      onSubmitted={() => {
                        setReviewRefresh((k) => k + 1);
                        dispatch(fetchHotelDetail(identifier));
                      }}
                    />
                  </div>
                </div>
              )}
              {reviews.length === 0 ? (
                <p className="mt-5 text-sm text-ink-500">No reviews yet — be the first to share your experience.</p>
              ) : (
                <div className="mt-5 space-y-4">
                  {reviews.map((r) => (
                    <ReviewCard
                      key={r._id}
                      review={r}
                      onUpdated={() => dispatch(fetchHotelDetail(identifier))}
                      onDeleteReview={() => {
                        setReviewRefresh((k) => k + 1);
                        dispatch(fetchHotelDetail(identifier));
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

{/* ---------- Booking widget ---------- */}
          <aside className="lg:sticky lg:top-36 lg:self-start">
            <div ref={widgetRef} className="card-base scroll-mt-28 overflow-hidden shadow-float">
              <div className="bg-brand-gradient px-5 py-4 text-white">
                <p className="font-display text-2xl font-bold">
                  {formatCurrency(basePrice)}<span className="text-sm font-normal text-white/80"> / night</span>
                </p>
                {freeCancelHours && <p className="mt-0.5 text-xs text-white/80">Free cancellation · No prepayment needed</p>}
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="hd-checkin" className="label-base">Check-in</label>
                    <input
                      id="hd-checkin" type="date" className="input-base"
                      min={todayISO()} value={checkIn}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (e.target.value >= checkOut) setCheckOut(addDaysISO(e.target.value, 1));
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="hd-checkout" className="label-base">Check-out</label>
                    <input
                      id="hd-checkout" type="date" className="input-base"
                      min={addDaysISO(checkIn, 1)} value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="hd-guests" className="label-base">Guests</label>
                  <select id="hd-guests" className="input-base" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-ink-100 bg-sand-50/70 p-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium text-ink-700"><CalendarDays className="h-4 w-4 text-brand-600" />{formatDate(checkIn)}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                    <span className="text-right font-medium text-ink-700">{formatDate(checkOut)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 text-ink-500">
                    <span>{nights} night{nights > 1 ? 's' : ''} · {guests} guest{guests > 1 ? 's' : ''}</span>
                    <span className="font-semibold text-ink-900">{formatCurrency(basePrice * nights)}</span>
                  </div>
                </div>

                {selectedRoom || resolveRoom() ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Selected room</p>
                      <p className="truncate text-sm font-semibold text-ink-900">{(selectedRoom || resolveRoom()).name}</p>
                    </div>
                    <p className="font-display text-sm font-bold text-ink-900">{formatCurrency(((selectedRoom || resolveRoom()).pricePerNight || 0) * nights)}</p>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-sand-400 bg-sand-50/60 px-3.5 py-3 text-center text-xs text-ink-500">
                    Select a room above to see your total
                  </p>
                )}

                <Button size="lg" className="w-full" disabled={rooms.length === 0} onClick={handleBookNow}>
                  {selectedRoom || resolveRoom() ? 'Book now' : 'Choose a room first'}
                </Button>

                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-ink-100 pt-4 text-xs text-ink-500">
                  {freeCancelHours && (
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" />Free cancellation</span>
                  )}
                  <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-600" />No prepayment</span>
                </div>

                <Link to="/hotels" className="block text-center text-sm font-medium text-brand-600 transition hover:text-brand-800">← Back to all hotels</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox >= 0 && (
        <Lightbox images={images} index={lightbox} onClose={() => setLightbox(-1)} onNavigate={setLightbox} />
      )}
    </div>
  );
}