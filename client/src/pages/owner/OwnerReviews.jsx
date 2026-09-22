import { useEffect, useState } from 'react';
import { apiGet, apiPost, getApiErrorMessage } from '../../services/apiClient';
import { formatDateTime } from '../../utils/format';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import ReviewCard from '../../components/reviews/ReviewCard';

export default function OwnerReviews() {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/owner/reviews')
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

  const submitReply = async () => {
    if (!replying || !replyText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await apiPost(`/reviews/${replying._id}/reply`, { text: replyText.trim() });
      setReviews((rs) => rs.map((r) => (r._id === replying._id ? { ...r, ...(data.review || {}) } : r)));
      setReplying(null);
      setReplyText('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Reply failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') return <TableSkeleton rows={4} />;
  if (status === 'failed' && reviews.length === 0) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="Guest reviews for your properties will appear here." />
      ) : (
        reviews.map((r) => (
          <div key={r._id}>
            <ReviewCard review={r} showReply onUpdated={(updated) => setReviews((rs) => rs.map((rv) => (rv._id === updated?._id ? { ...rv, ...updated } : rv)))} />
            {!r.ownerReply?.text && (
              <div className="mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setReplying(r); setReplyText(''); }}
                >
                  Reply to this review
                </Button>
              </div>
            )}
          </div>
        ))
      )}

      <Modal
        open={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="Reply to review"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setReplying(null)}>Cancel</Button>
            <Button size="sm" onClick={submitReply} loading={submitting}>Post reply</Button>
          </>
        )}
      >
        <label htmlFor="reply-text" className="label-base">Your response</label>
        <textarea id="reply-text" rows={4} className="input-base mt-1" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Thank the guest or address their feedback…" />
      </Modal>
    </div>
  );
}
