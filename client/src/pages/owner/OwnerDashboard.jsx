import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../services/apiClient';
import { formatCurrency } from '../../utils/format';
import { Spinner } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/States';

export default function OwnerDashboard() {
  const [stats, setStats] = useState(null);
  const [hotelCount, setHotelCount] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/owner/dashboard')
      .then(({ data }) => {
        if (!alive) return;
        setStats(data?.metrics || {});
        setHotelCount((data?.hotels || []).length);
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || 'Could not load dashboard');
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') return <Spinner label="Loading dashboard" />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  const cards = [
    { label: 'Properties', value: hotelCount, to: '/owner/properties' },
    { label: 'Bookings this month', value: stats?.monthBookings ?? 0, to: '/owner/bookings' },
    { label: 'Revenue this month', value: formatCurrency(stats?.monthRevenue), to: '/owner/revenue' },
    { label: 'Occupancy', value: `${stats?.occupancy ?? 0}%`, to: '/owner/revenue' },
  ];

  const queues = [
    { label: 'Pending bookings to review', count: stats?.pendingBookings ?? 0, to: '/owner/bookings' },
    { label: "Today's check-ins", count: stats?.todaysBookings ?? 0, to: '/owner/bookings' },
    { label: 'Upcoming stays', count: stats?.upcomingBookings ?? 0, to: '/owner/bookings' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink-900">Owner overview</h2>
        <Link to="/owner/properties/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">+ Add property</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card-base p-5 transition hover:shadow-float">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="card-base p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Needs attention</h3>
        <div className="mt-4 space-y-2">
          {queues.map((q) => (
            <Link key={q.label} to={q.to} className="flex items-center justify-between rounded-xl border border-ink-100 p-4 hover:bg-ink-50">
              <span className="text-sm text-ink-700">{q.label}</span>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${q.count > 0 ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>{q.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/owner/bookings" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">📅 Manage bookings</p>
          <p className="mt-1 text-sm text-ink-500">Review incoming reservations and update status.</p>
        </Link>
        <Link to="/owner/reviews" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">⭐ Respond to reviews</p>
          <p className="mt-1 text-sm text-ink-500">Reply to guest feedback and build your reputation.</p>
        </Link>
      </div>

      {hotelCount === 0 && (
        <EmptyState
          title="No properties yet"
          description="List your first property to start receiving bookings."
          action={<Link to="/owner/properties/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Add property</Link>}
        />
      )}
    </div>
  );
}
