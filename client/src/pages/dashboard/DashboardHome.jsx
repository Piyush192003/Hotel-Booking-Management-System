import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings } from '../../features/bookings/bookingsSlice';
import { fetchWishlist } from '../../features/wishlist/wishlistSlice';
import { fetchUnreadCount } from '../../features/notifications/notificationsSlice';
import { formatCurrency, formatDate } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';

export default function DashboardHome() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: bookings, listStatus } = useSelector((s) => s.bookings);
  const { ids: wishlistIds } = useSelector((s) => s.wishlist);
  const { unreadCount } = useSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchMyBookings({ page: 1, limit: 5 }));
    dispatch(fetchWishlist());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const upcoming = bookings.filter((b) => b.bookingStatus === 'confirmed' || b.bookingStatus === 'pending');
  const totalSpent = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.pricing?.total || 0), 0);

  const stats = [
    { label: 'Upcoming stays', value: upcoming.length, to: '/dashboard/bookings' },
    { label: 'Saved properties', value: wishlistIds.length, to: '/dashboard/wishlist' },
    { label: 'Unread alerts', value: unreadCount, to: '/dashboard/notifications' },
    { label: 'Total spent', value: formatCurrency(totalSpent), to: '/dashboard/bookings' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900">Welcome back, {user?.name?.split(' ')[0] || 'traveller'} 👋</h2>
        <p className="mt-1 text-sm text-ink-500">Here's a snapshot of your activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card-base p-5 transition hover:shadow-float">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="card-base p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-ink-900">Recent bookings</h3>
          <Link to="/dashboard/bookings" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all →</Link>
        </div>
        <div className="mt-4 space-y-3">
          {listStatus === 'loading' && <p className="text-sm text-ink-500">Loading…</p>}
          {listStatus !== 'loading' && bookings.length === 0 && (
            <EmptyState
              title="No bookings yet"
              description="When you book a stay, it will show up here."
              action={<Link to="/hotels" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Browse hotels</Link>}
            />
          )}
          {bookings.map((b) => (
            <Link key={b._id} to={`/dashboard/bookings/${b._id}`} className="flex items-center justify-between rounded-xl border border-ink-100 p-4 hover:bg-ink-50">
              <div>
                <p className="text-sm font-bold text-ink-900">{b.hotelId?.name || b.hotelName || 'Hotel'}</p>
                <p className="text-xs text-ink-500">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={b.bookingStatus} />
                <span className="text-sm font-semibold text-ink-900">{formatCurrency(b.pricing?.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/hotels" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">🔍 Find your next stay</p>
          <p className="mt-1 text-sm text-ink-500">Search thousands of hotels across India.</p>
        </Link>
        <Link to="/dashboard/settings" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">⚙️ Settings & preferences</p>
          <p className="mt-1 text-sm text-ink-500">Profile, password, currency and notifications.</p>
        </Link>
      </div>
    </div>
  );
}
