import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, cancelBooking } from '../../features/bookings/bookingsSlice';
import BookingCard from '../../components/bookings/BookingCard';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/States';
import Button from '../../components/ui/Button';

const TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function MyBookings() {
  const dispatch = useDispatch();
  const { list, listMeta, listStatus, cancelStatus } = useSelector((s) => s.bookings);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toCancel, setToCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    dispatch(fetchMyBookings({ status: status || undefined, page, limit: 10 }));
  }, [dispatch, status, page]);

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelError('');
    try {
      await dispatch(cancelBooking({ id: toCancel._id, reason: reason.trim() || undefined })).unwrap();
      setToCancel(null);
      setReason('');
    } catch (err) {
      setCancelError(err || 'Cancellation failed. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setStatus(t.value); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === t.value ? 'bg-brand-600 text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {listStatus === 'loading' && <p className="text-sm text-ink-500">Loading bookings…</p>}
      {listStatus !== 'loading' && list.length === 0 && (
        <EmptyState title="No bookings found" description="Bookings will appear here once you make your first reservation." />
      )}
      {list.map((b) => <BookingCard key={b._id} booking={b} onCancel={setToCancel} />)}

      <Pagination page={listMeta.page} pages={listMeta.pages} total={listMeta.total} onChange={setPage} />

      <Modal
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        title="Cancel booking"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setToCancel(null)}>Keep booking</Button>
            <Button variant="danger" size="sm" onClick={confirmCancel} loading={cancelStatus === 'loading'}>Confirm cancellation</Button>
          </>
        )}
      >
        <p className="text-sm text-ink-600">Are you sure you want to cancel this booking? Cancellation policies apply.</p>
        {cancelError && <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{cancelError}</div>}
        <label htmlFor="cancel-reason" className="label-base mt-4">Reason (optional)</label>
        <textarea id="cancel-reason" rows={2} className="input-base" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us why you're cancelling…" />
      </Modal>
    </div>
  );
}
