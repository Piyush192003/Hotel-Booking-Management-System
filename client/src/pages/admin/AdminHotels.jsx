import { useEffect, useState } from 'react';
import { apiGet, apiPatch, getApiErrorMessage } from '../../services/apiClient';
import { formatCurrency, titleCase } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

const TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export default function AdminHotels() {
  const [hotels, setHotels] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/hotels', { status: statusFilter || undefined, page, limit: 10 })
      .then(({ data, meta: m }) => {
        if (!alive) return;
        setHotels(Array.isArray(data) ? data : data?.hotels || []);
        setMeta(m || { page: 1, pages: 1, total: 0 });
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load hotels'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [statusFilter, page]);

  const setHotelStatus = async (id, nextStatus) => {
    try {
      await apiPatch(`/admin/hotels/${id}/status`, { status: nextStatus });
      setHotels((hs) => hs.map((h) => (h._id === id ? { ...h, status: nextStatus } : h)));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Action failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.value} type="button" onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${statusFilter === t.value ? 'bg-brand-600 text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === 'loading' && hotels.length === 0 ? <TableSkeleton rows={5} /> : hotels.length === 0 ? (
        <EmptyState title="No hotels found" description="No properties match this filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">From</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {hotels.map((h) => (
                <tr key={h._id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3 font-medium text-ink-900">{h.name}</td>
                  <td className="px-4 py-3 text-ink-600">{titleCase(h.city)}</td>
                  <td className="px-4 py-3 text-ink-600">{h.ownerId?.name || h.ownerName || '—'}</td>
                  <td className="px-4 py-3"><Badge status={h.status} /></td>
                  <td className="px-4 py-3 text-right text-ink-900">{formatCurrency(h.startingPrice || h.minPrice)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {h.status !== 'approved' && (
                        <button type="button" onClick={() => setHotelStatus(h._id, 'approved')} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Approve</button>
                      )}
                      {h.status !== 'rejected' && (
                        <button type="button" onClick={() => setHotelStatus(h._id, 'rejected')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Reject</button>
                      )}
                      {h.status === 'approved' && (
                        <button type="button" onClick={() => setHotelStatus(h._id, 'suspended')} className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50">Suspend</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} />
    </div>
  );
}
