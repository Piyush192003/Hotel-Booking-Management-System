import { useEffect, useState } from 'react';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';
import { formatDateTime, titleCase } from '../../utils/format';
import Pagination from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/audit-logs', { page, limit: 20 })
      .then(({ data, meta: m }) => {
        if (!alive) return;
        setLogs(Array.isArray(data) ? data : data?.logs || []);
        setMeta(m || { page: 1, pages: 1, total: 0 });
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load audit logs'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [page]);

  if (status === 'loading' && logs.length === 0) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {logs.length === 0 ? (
        <EmptyState title="No audit logs" description="Administrative actions will be recorded here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {logs.map((l) => (
                <tr key={l._id} className="align-top hover:bg-ink-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3 text-ink-900">{l.actorId?.name || l.actorName || 'System'}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">{titleCase(l.action)}</span></td>
                  <td className="px-4 py-3 text-ink-600">{l.targetType ? `${titleCase(l.targetType)} ${l.targetId?.slice(-6) || ''}` : '—'}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-ink-500">{l.details || '—'}</td>
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
