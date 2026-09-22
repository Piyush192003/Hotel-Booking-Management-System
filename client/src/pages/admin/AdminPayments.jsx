import { useEffect, useState } from 'react';
import { apiGet, apiPatch, getApiErrorMessage } from '../../services/apiClient';
import { formatCurrency, formatDateTime } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/payments', { page, limit: 15 })
      .then(({ data, meta: m }) => {
        if (!alive) return;
        setPayments(Array.isArray(data) ? data : data?.payments || []);
        setMeta(m || { page: 1, pages: 1, total: 0 });
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load payments'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [page]);

  const refund = async (paymentId) => {
    try {
      await apiPatch(`/admin/payments/${paymentId}/refund`, {});
      setPayments((ps) => ps.map((p) => (p._id === paymentId ? { ...p, paymentStatus: 'refunded' } : p)));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Refund failed'));
    }
  };

  if (status === 'loading' && payments.length === 0) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {payments.length === 0 ? (
        <EmptyState title="No payments found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{p.transactionId || p._id.slice(-8)}</td>
                  <td className="px-4 py-3 text-ink-900">{p.userId?.name || p.guestName || '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{p.method || 'card'}</td>
                  <td className="px-4 py-3"><Badge status={p.paymentStatus} /></td>
                  <td className="px-4 py-3 text-xs text-ink-400">{formatDateTime(p.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {p.paymentStatus === 'paid' && (
                      <button type="button" onClick={() => refund(p._id)} className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50">Refund</button>
                    )}
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
