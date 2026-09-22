import { useEffect, useState } from 'react';
import { Pencil, MessageCircle, Trash2 } from 'lucide-react';
import RatingStars from '../ui/RatingStars';
import { formatDateTime } from '../../utils/format';
import { apiDelete, apiPost, apiPut, getApiErrorMessage } from '../../services/apiClient';
import { useSelector } from 'react-redux';
import Button from '../ui/Button';

/** Normalise a user/comment-user reference to a plain string for comparisons. */
function idOf(ref) {
  if (!ref) return '';
  if (typeof ref === 'string') return String(ref).trim();
  if (ref._id != null) return String(ref._id).trim();
  if (ref.id != null) return String(ref.id).trim();
  return String(ref).trim();
}

export default function ReviewCard({ review, showReply = true, onUpdated, onDeleteReview }) {
  const { user } = useSelector((s) => s.auth);
  const author = review.userId?.name || review.user?.name || 'Verified guest';
  const [showComments, setShowComments] = useState(true); // expanded by default so comments (and their delete buttons) are always visible
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');
  const [localComments, setLocalComments] = useState(review.comments || []);

  // Keep local state in sync whenever the parent re-fetches the hotel/review list.
  useEffect(() => {
    setLocalComments(review.comments || []);
  }, [review.comments]);

  const comments = localComments;

  const canModifyComment = (commentUserId) => {
    if (!user) return false;
    const uid = idOf(commentUserId);
    if (uid && (uid === idOf(user._id) || uid === idOf(user.id))) return true;
    return user.role === 'admin';
  };

  // The current user participated in this thread — surface it immediately.
  const commentsOpen = showComments;

  const addComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await apiPost(`/reviews/${review._id}/comments`, { text: commentText.trim() });
      setLocalComments(data.review?.comments || []);
      setCommentText('');
      setShowComments(true);
      onUpdated?.(data.review);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not add comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateComment = async (commentId, newText) => {
    const text = String(newText || '').trim();
    if (!text) return;
    setSubmitting(true);
    setError('');
    try {
      // Optimistic update so the UI responds immediately.
      setLocalComments(localComments.map((c) => (c._id === commentId ? { ...c, text } : c)));
      const { data } = await apiPut(`/reviews/${review._id}/comments/${commentId}`, { text });
      setLocalComments(data.review?.comments || []);
      setEditingComment(null);
      setEditText('');
      onUpdated?.(data.review);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await apiDelete(`/reviews/${review._id}/comments/${commentId}`);
      setLocalComments(data.review?.comments || []);
      onUpdated?.(data.review);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const canDeleteReview = !!onDeleteReview && !!user && (
    idOf(review.userId) === idOf(user._id) || idOf(review.userId) === idOf(user.id) || user.role === 'admin'
  );

  const handleDeleteReview = async () => {
    if (!window.confirm('Delete this review?')) return;
    setSubmitting(true);
    setError('');
    try {
      await apiDelete(`/reviews/${review._id}`);
      onDeleteReview?.(review);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete review'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="card-base p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700" aria-hidden="true">
            {author.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{author}</p>
            <p className="text-xs text-ink-400">{formatDateTime(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <RatingStars value={review.rating} />
          {canDeleteReview && (
            <button
              type="button"
              onClick={handleDeleteReview}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 transition hover:border-red-400 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" /> Delete my review
            </button>
          )}
        </div>
      </div>
      {review.title && <h4 className="mt-3 font-display text-sm font-bold text-ink-900">{review.title}</h4>}
      <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{review.comment}</p>
      {showReply && review.ownerReply?.text && (
        <div className="mt-4 rounded-lg bg-ink-50 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Response from the property</p>
          <p className="mt-1 text-sm text-ink-700">{review.ownerReply.text}</p>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
          aria-expanded={commentsOpen}
        >
          <MessageCircle className="h-4 w-4" />
          {comments.length} comment{comments.length === 1 ? '' : 's'}
        </button>
        {commentsOpen && (
          <div className="mt-3 space-y-3">
            {error && <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</div>}
            {comments.length > 0 && (
              <div className="space-y-2.5">
                {comments.map((c) => {
                  const commentAuthor = c.userId?.name || c.userName || 'User';
                  const isEditing = editingComment === c._id;
                  const editable = canModifyComment(c.userId);
                  return (
                    <div key={c._id} className="rounded-lg bg-sand-50/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700" aria-hidden="true">{commentAuthor.charAt(0).toUpperCase()}</span>
                          <span className="text-xs font-semibold text-ink-800">{commentAuthor}</span>
                          {editable && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">You</span>}
                          <span className="text-[10px] text-ink-400">{formatDateTime(c.createdAt)}</span>
                        </div>
{editable && (
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <Button size="sm" variant="secondary" onClick={() => { setEditingComment(null); setEditText(''); }}>Cancel</Button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setEditingComment(c._id); setEditText(c.text); }}
                                className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteComment(c._id)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 transition hover:border-red-400 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="mt-2">
                          <textarea className="input-base text-sm" rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={1000} autoFocus />
                          <div className="mt-1.5 flex gap-2">
                            <Button type="button" size="sm" onClick={() => updateComment(c._id, editText)} disabled={!String(editText || '').trim()} loading={submitting}>Save changes</Button>
                            <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingComment(null); setEditText(''); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{c.text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {user ? (
              <form onSubmit={addComment} className="flex gap-2">
                <input type="text" className="input-base flex-1 text-sm" placeholder="Add a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} maxLength={1000} disabled={submitting} />
                <Button type="submit" size="sm" loading={submitting} disabled={!commentText.trim()}>Post</Button>
              </form>
            ) : (
              <p className="text-xs text-ink-400">Log in to add a comment.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}