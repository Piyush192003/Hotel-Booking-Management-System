import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Pencil, Trash2 } from 'lucide-react';
import { apiDelete, apiGet, getApiErrorMessage } from '../../services/apiClient';
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewForm from '../../components/reviews/ReviewForm';
import { EmptyState } from '../../components/ui/States';
import { Spinner } from '../../components/ui/Loading';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function MyReviews() {
  const { user } = useSelector((s) => s.auth);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const reload = () => {
    apiGet('/reviews/my')
      .then(({ data }) => setReviews(Array.isArray(data) ? data : data?.reviews || []))
      .catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/reviews/my')
      .then(({ data }) => {
        if (!alive) return;
        setReviews(Array.isArray(data) ? data : data?.reviews || []);
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load reviews'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setActionError('');
    try {
      await apiDelete(`/reviews/${deleting._id}`);
      setDeleting(null);
      reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not delete review'));
    } finally {
      setDeletingBusy(false);
    }
  };

  const displayName = (r) => r.userId?.name || user?.name || 'You';

  if (status === 'loading') return <Spinner label="Loading reviews" />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">{reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
      {actionError && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div>}
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="After your stay, share your experience with other travellers." />
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r._id}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <Link to={`/hotels/${r.hotelId?._id || r.hotelId}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                  {r.hotelId?.name || 'Property'}
                </Link>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(r); setActionError(''); }}>
                    <span className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</span>
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => { setDeleting(r); setActionError(''); }}>
                    <span className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete</span>
                  </Button>
                </div>
              </div>
                            <ReviewCard review={r} showReply onUpdated={(updated) => setReviews((list) => list.map((r) => (r._id === updated?._id ? { ...r, ...updated } : r)))} />
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit review" size="lg">
        {editing && (
          <ReviewForm
            existing={editing}
            onSubmitted={(updated) => {
              setReviews((list) => list.map((r) => (r._id === updated?._id ? { ...r, ...updated } : r)));
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete review"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} loading={deletingBusy}>Delete review</Button>
          </>
        )}
      >
        <p className="text-sm text-ink-600">
          Delete your review of <strong>{deleting?.hotelId?.name || 'this property'}</strong>? The hotel rating will be recalculated. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
