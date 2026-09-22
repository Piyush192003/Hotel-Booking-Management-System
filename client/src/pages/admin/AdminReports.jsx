import { useEffect, useState } from 'react';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';
import { formatCompactCurrency } from '../../utils/format';
import { Spinner } from '../../components/ui/Loading';

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/dashboard')
      .then(({ data: d }) => {
        if (!alive) return;
        setData(d || {});
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load reports'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') return <Spinner label="Loading reports" />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  const totals = data?.totals || {};
  const bookings = totals.bookings || 0;
  const revenue = totals.revenue || 0;

  const rows = [
    { label: 'Total users', value: totals.users ?? 0 },
    { label: 'Owners', value: totals.owners ?? 0 },
    { label: 'Hotels live', value: totals.hotels ?? 0 },
    { label: 'Hotels pending', value: totals.pendingHotels ?? 0 },
    { label: 'Total bookings', value: bookings },
    { label: 'Cancelled bookings', value: totals.refunds?.count ?? 0 },
    { label: 'Gross revenue', value: formatCompactCurrency(revenue) },
    { label: 'Avg booking value', value: bookings > 0 ? formatCompactCurrency(Math.round(revenue / bookings)) : '—' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink-900">Platform reports</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        >
          Export / Print
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="card-base p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{r.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900">{r.value}</p>
          </div>
        ))}
      </div>

      <div className="card-base p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Top cities by listings</h3>
        {data?.popularDestinations?.length ? (
          <ul className="mt-4 space-y-2">
            {data.popularDestinations.map((c) => (
              <li key={c._id} className="flex items-center justify-between rounded-lg border border-ink-100 px-4 py-2.5 text-sm">
                <span className="font-medium text-ink-900">{c._id}</span>
                <span className="text-ink-500">{c.hotels} listing{c.hotels === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-500">No city data yet.</p>
        )}
      </div>
    </div>
  );
}
