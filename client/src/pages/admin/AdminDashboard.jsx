import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';
import { formatCompactCurrency } from '../../utils/format';
import { Spinner } from '../../components/ui/Loading';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/dashboard')
      .then(({ data }) => {
        if (!alive) return;
        setStats(data || {});
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load admin dashboard'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') return <Spinner label="Loading admin dashboard" />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  const totals = stats?.totals || {};
  const cards = [
    { label: 'Total users', value: totals.users ?? 0, to: '/admin/users' },
    { label: 'Live hotels', value: totals.hotels ?? 0, to: '/admin/hotels' },
    { label: 'Total bookings', value: totals.bookings ?? 0, to: '/admin/bookings' },
    { label: 'Gross revenue', value: formatCompactCurrency(totals.revenue), to: '/admin/payments' },
  ];

  const queues = [
    { label: 'Hotels pending approval', count: totals.pendingHotels ?? 0, to: '/admin/hotels', danger: true },
    { label: 'Refunds issued', count: totals.refunds?.count ?? 0, to: '/admin/payments', danger: false },
    { label: 'Registered owners', count: totals.owners ?? 0, to: '/admin/users', danger: false },
  ];

  return (
    <div className="space-y-8">
      <h2 className="font-display text-xl font-bold text-ink-900">Platform overview</h2>

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
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${q.danger && q.count > 0 ? 'bg-red-100 text-red-700' : 'bg-ink-100 text-ink-600'}`}>{q.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/users" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">👥 User management</p>
          <p className="mt-1 text-sm text-ink-500">Block or unblock users, change roles.</p>
        </Link>
        <Link to="/admin/coupons" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">🏷️ Coupons</p>
          <p className="mt-1 text-sm text-ink-500">Create and manage discount codes.</p>
        </Link>
        <Link to="/admin/reports" className="card-base p-6 transition hover:shadow-float">
          <p className="font-display text-base font-bold text-ink-900">📊 Reports</p>
          <p className="mt-1 text-sm text-ink-500">Platform-wide analytics and exports.</p>
        </Link>
      </div>
    </div>
  );
}
