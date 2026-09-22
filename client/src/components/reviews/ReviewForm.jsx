import { useState } from 'react';
import { Star } from 'lucide-react';
import { apiPost, apiPut, getApiErrorMessage, getApiErrorDetails } from '../../services/apiClient';
import { Input, Textarea } from '../ui/Field';
import Button from '../ui/Button';
import { formatDate } from '../../utils/format';
import { cn } from '../../utils/cn';

const RATING_LABELS = { 1: 'Terrible', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent' };

/**
 * Star-rating + comment form for a stay. Create mode needs an eligible stay
 * (stays) — edit mode (existing) saves changes to the review in place.
 */
export default function ReviewForm({ hotelId, stays = [], existing = null, onSubmitted, onCancel }) {
  const isEdit = Boolean(existing);
  const [bookingId, setBookingId] = useState(stays[0]?._id || '');
  const [rating, setRating] = useState(existing?.rating || 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title || '');
  const [comment, setComment] = useState(existing?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  /** Mirrors the server's createReview/updateReview validator rules. */
  const validate = () => {
    const errs = {};
    if (!rating || rating < 1) errs.rating = 'Please select a star rating';
    if (title.trim().length > 160) errs.title = 'Title must be at most 160 characters';
    if (comment.trim().length < 10) errs.comment = 'Review must be at least 10 characters';
    else if (comment.trim().length > 3000) errs.comment = 'Review must be at most 3000 characters';
    if (!isEdit && stays.length > 0 && !bookingId) errs.bookingId = 'Choose the stay you want to review';
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const payload = { rating, comment: comment.trim() };
      if (title.trim()) payload.title = title.trim();
      if (bookingId) payload.bookingId = bookingId;
      const { data } = isEdit
        ? await apiPut(`/reviews/${existing._id}`, payload)
        : await apiPost('/reviews', { ...payload, hotelId });
      onSubmitted?.(data?.review || data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not submit review'));
      setFieldErrors(getApiErrorDetails(err) || {});
    } finally {
      setSaving(false);
    }
  };

  const active = hover || rating;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <p className="font-semibold">{error}</p>
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              {Object.entries(fieldErrors).map(([field, msg]) => <li key={field}>{msg}</li>)}
            </ul>
          )}
        </div>
      )}

      {!isEdit && stays.length > 1 && (
        <div>
          <label htmlFor="review-stay" className="label-base">Which stay?</label>
          <select id="review-stay" className="input-base" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
            {stays.map((s) => (
              <option key={s._id} value={s._id}>
                {s.bookingNumber} · {formatDate(s.checkIn)} → {formatDate(s.checkOut)}
              </option>
            ))}
          </select>
          {fieldErrors.bookingId && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.bookingId}</p>}
        </div>
      )}

      <div>
        <p className="label-base">Your rating</p>
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? 's' : ''}`}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star className={cn('h-8 w-8 transition-colors', i <= active ? 'fill-amber-400 text-amber-400' : 'text-ink-200 hover:text-amber-200')} />
            </button>
          ))}
          {active > 0 && <span className="ml-2 text-sm font-semibold text-ink-700">{RATING_LABELS[active]}</span>}
        </div>
        {fieldErrors.rating && <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.rating}</p>}
      </div>

      <Input
        label="Title (optional)"
        error={fieldErrors.title}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Sum up your stay in a few words"
        maxLength={160}
      />

      <div>
        <Textarea
          label="Your review"
          required
          error={fieldErrors.comment}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you love? What could be better?"
          rows={4}
        />
        <p className={cn('mt-1 text-xs', comment.trim().length < 10 ? 'text-ink-400' : 'text-ink-500')}>
          {comment.trim().length}/3000 characters (minimum 10)
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={saving}>{isEdit ? 'Save changes' : 'Submit review'}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
