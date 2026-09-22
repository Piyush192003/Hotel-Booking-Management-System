import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, nightsBetween } from '../../utils/format';
import { paymentBadge } from '../../utils/bookingStatus';

/** Compact booking row used in dashboards and lists. */
export default function BookingCard({ booking, showHotel = true, onCancel }) {
  const b = booking;
  const hotelName = b.hotelId?.name || b.hotelName || 'Hotel';
  const roomName = b.roomId?.name || b.roomName || '';
  const canCancel = onCancel && ['pending', 'confirmed'].includes(b.bookingStatus);
  const payBadge = paymentBadge(b);

  return (
    <div className="card-base flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      {b.hotelId?.images?.[0] && (
        <img src={b.hotelId.images[0]} alt="" className="h-20 w-full rounded-lg object-cover sm:w-28" loading="lazy" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {showHotel && <p className="truncate font-display text-sm font-bold text-ink-900">{hotelName}</p>}
          <Badge status={b.bookingStatus} />
          <Badge status={payBadge.status}>{payBadge.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-600">
          {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {nightsBetween(b.checkIn, b.checkOut) || b.nights} night{nightsBetween(b.checkIn, b.checkOut) || b.nights === 1 ? '' : 's'}
          {roomName ? ` · ${roomName}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">Booking {b.bookingNumber}</p>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <p className="font-display text-base font-bold text-ink-900">{formatCurrency(b.pricing?.total)}</p>
        <div className="flex gap-2">
          <Link to={`/dashboard/bookings/${b._id}`} className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
            View
          </Link>
          {canCancel && (
            <button type="button" onClick={() => onCancel(b)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
