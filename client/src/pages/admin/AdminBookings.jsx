import { useEffect, useState } from 'react';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';
import { formatCurrency, formatDate } from '../../utils/format';
import { paymentBadge } from '../../utils/bookingStatus';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/bookings', { page, limit: 15 })
      .then(({ data, meta: m }) => {
        if (!alive) return;
        setBookings(Array.isArray(data) ? data : data?.bookings || []);
        setMeta(m || { page: 1, pages: 1, total: 0 });
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load bookings'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [page]);

  if (status === 'loading' && bookings.length === 0) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {bookings.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {bookings.map((b) => {
                const payBadge = paymentBadge(b);
                return (
                  <tr key={b._id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-ink-600">{b.bookingNumber}</td>
                    <td className="px-4 py-3 text-ink-900">{b.guestName || b.userId?.name || '—'}</td>
                    <td className="px-4 py-3 text-ink-600">{b.hotelId?.name || b.hotelName || '—'}</td>
                    <td className="px-4 py-3 text-ink-600">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                    <td className="px-4 py-3"><Badge status={b.bookingStatus} /></td>
                    <td className="px-4 py-3"><Badge status={payBadge.status}>{payBadge.label}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(b.pricing?.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} />
    </div>
  );
}
