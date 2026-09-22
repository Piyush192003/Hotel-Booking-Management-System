import { useEffect, useState } from 'react';
import { apiGet, apiPatch, getApiErrorMessage } from '../../services/apiClient';
import { formatDateTime, titleCase } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [toToggle, setToToggle] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/users', { page, limit: 10 })
      .then(({ data, meta: m }) => {
        if (!alive) return;
        setUsers(Array.isArray(data) ? data : data?.users || []);
        setMeta(m || { page: 1, pages: 1, total: 0 });
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load users'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [page]);

  const confirmToggle = async () => {
    if (!toToggle) return;
    try {
      await apiPatch(`/admin/users/${toToggle._id}/block`, { blocked: !toToggle.isBlocked });
      setUsers((us) => us.map((u) => (u._id === toToggle._id ? { ...u, isBlocked: !u.isBlocked } : u)));
      setToToggle(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Action failed'));
    }
  };

  if (status === 'loading' && users.length === 0) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3 font-medium text-ink-900">{u.name}</td>
                  <td className="px-4 py-3 text-ink-600">{u.email}</td>
                  <td className="px-4 py-3"><Badge status="neutral">{titleCase(u.role)}</Badge></td>
                  <td className="px-4 py-3"><Badge status={u.isBlocked ? 'blocked' : 'active'} /></td>
                  <td className="px-4 py-3 text-xs text-ink-400">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant={u.isBlocked ? 'secondary' : 'danger'} onClick={() => setToToggle(u)}>
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} />

      <Modal
        open={Boolean(toToggle)}
        onClose={() => setToToggle(null)}
        title={toToggle?.isBlocked ? 'Unblock user' : 'Block user'}
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setToToggle(null)}>Cancel</Button>
            <Button variant={toToggle?.isBlocked ? 'primary' : 'danger'} size="sm" onClick={confirmToggle}>
              {toToggle?.isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-ink-600">
          {toToggle?.isBlocked
            ? `Allow ${toToggle?.name} to sign in and place bookings again.`
            : `${toToggle?.name} will be signed out and prevented from booking.`}
        </p>
      </Modal>
    </div>
  );
}
