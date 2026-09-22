import { useEffect, useState } from 'react';
import { apiGet, apiPatch, getApiErrorMessage } from '../../services/apiClient';
import { formatDateTime } from '../../utils/format';
import RatingStars from '../../components/ui/RatingStars';
import Pagination from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import ReviewCard from '../../components/reviews/ReviewCard';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/admin/reviews', { page, limit: 10 })
      .then(({ data, meta: m }) => {
        if (!alive) return;
        setReviews(Array.isArray(data) ? data : data?.reviews || []);
        setMeta(m || { page: 1, pages: 1, total: 0 });
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load reviews'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [page]);

  const moderate = async (id, action) => {
    try {
      const nextStatus = action === 'hide' ? 'hidden' : 'active';
      await apiPatch(`/admin/reviews/${id}/moderate`, { status: nextStatus });
      setReviews((rs) => rs.map((r) => (r._id === id ? { ...r, status: nextStatus } : r)));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Action failed'));
    }
  };

  if (status === 'loading' && reviews.length === 0) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {reviews.length === 0 ? (
        <EmptyState title="No reviews found" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id}>
              <ReviewCard review={r} showReply onUpdated={(updated) => setReviews((rs) => rs.map((rv) => (rv._id === updated?._id ? { ...rv, ...updated } : rv)))} />
              <div className="mt-2 flex items-center gap-2">
                <RatingStars value={r.rating} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === 'hidden' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status === 'hidden' ? 'hidden' : 'visible'}</span>
                {r.status !== 'hidden' ? (
                  <button type="button" onClick={() => moderate(r._id, 'hide')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Hide review</button>
                ) : (
                  <button type="button" onClick={() => moderate(r._id, 'restore')} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Restore</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} />
    </div>
  );
}
