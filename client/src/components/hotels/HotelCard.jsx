import { Link } from 'react-router-dom';
import RatingStars from '../ui/RatingStars';
import { formatCurrency, titleCase } from '../../utils/format';

function fallbackImage(event) {
  // Graceful offline/placeholder fallback when remote images fail.
  event.currentTarget.src = '/favicon.svg';
  event.currentTarget.onerror = null;
}

export default function HotelCard({ hotel, className = '' }) {
  const cover = hotel.images?.[0];
  const city = hotel.city ? titleCase(hotel.city) : '';
  const type = hotel.propertyType ? titleCase(hotel.propertyType) : 'Stay';
  const identifier = hotel.slug || hotel._id;

  return (
    <Link
      to={`/hotels/${identifier}`}
      className={`card-base group flex flex-col overflow-hidden transition hover:shadow-float focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
      aria-label={`View ${hotel.name}`}
    >
      <div className="relative h-48 w-full overflow-hidden bg-ink-100">
        {cover ? (
          <img
            src={cover}
            alt={`${hotel.name} in ${city}`}
            loading="lazy"
            onError={fallbackImage}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300" aria-hidden="true">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" /></svg>
          </div>
        )}
        {hotel.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-gradient px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-brand-glow">Featured</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-base font-bold text-ink-900">{hotel.name}</h3>
          <RatingStars value={hotel.rating || 0} showValue />
        </div>
        <p className="text-sm text-ink-500">
          {type}{city ? ` · ${city}` : ''}{hotel.state ? `, ${titleCase(hotel.state)}` : ''}
        </p>
        {hotel.tagline && <p className="line-clamp-1 text-sm text-ink-600">{hotel.tagline}</p>}
        <div className="mt-auto flex items-end justify-between pt-2">
          <p className="text-sm text-ink-500">
            {hotel.reviewCount > 0 ? `${hotel.reviewCount} review${hotel.reviewCount === 1 ? '' : 's'}` : 'New'}
          </p>
          <p className="text-right">
            <span className="font-display text-lg font-bold text-ink-900">{formatCurrency(hotel.startingPrice || hotel.minPrice)}</span>
            <span className="block text-xs text-ink-500">per night</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
