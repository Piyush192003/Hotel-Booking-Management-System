import { useEffect, useState } from 'react';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';
import { formatCurrency, formatCompactCurrency, formatDateShort } from '../../utils/format';
import { Spinner } from '../../components/ui/Loading';

export default function OwnerRevenue() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/owner/revenue', { days: 30 })
      .then(({ data }) => {
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load revenue data'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') return <Spinner label="Loading revenue data" />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  const totalRevenue = rows.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalBookings = rows.reduce((sum, r) => sum + (r.bookings || 0), 0);
  const last7 = rows.slice(-7).reduce((sum, r) => sum + (r.revenue || 0), 0);
  const prev7 = rows.slice(-14, -7).reduce((sum, r) => sum + (r.revenue || 0), 0);
  const delta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 > 0 ? 100 : 0;
  const maxRevenue = Math.max(...rows.map((r) => r.revenue || 0), 1);

  const cards = [
    { label: 'Revenue (30 days)', value: formatCompactCurrency(totalRevenue) },
    { label: 'Bookings (30 days)', value: totalBookings },
    { label: 'Last 7 days', value: formatCompactCurrency(last7) },
    { label: '7-day change', value: `${delta >= 0 ? '+' : ''}${delta}%` },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card-base p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{c.label}</p>
            <p className={`mt-2 font-display text-2xl font-bold ${c.label === '7-day change' ? (delta >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-ink-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card-base p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Daily revenue — last 30 days</h3>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No revenue data yet.</p>
        ) : (
          <div className="mt-6 flex h-48 items-end gap-1">
            {rows.map((r) => (
              <div key={r.date} className="group relative flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t bg-brand-500 transition-all group-hover:bg-brand-600"
                  style={{ height: `${Math.max(2, ((r.revenue || 0) / maxRevenue) * 100)}%` }}
                />
                <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[10px] text-white group-hover:block">
                  {formatDateShort(r.date)}: {formatCurrency(r.revenue)} · {r.bookings} booking{r.bookings === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
