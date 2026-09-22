import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../../features/notifications/notificationsSlice';
import { formatDateTime } from '../../utils/format';
import { EmptyState } from '../../components/ui/States';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Loading';
import { cn } from '../../utils/cn';

export default function Notifications() {
  const dispatch = useDispatch();
  const { items, status, unreadCount } = useSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchNotifications({ page: 1, limit: 20 }));
  }, [dispatch]);

  if (status === 'loading' && items.length === 0) return <Spinner label="Loading notifications" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => dispatch(markAllNotificationsRead())}>Mark all read</Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No notifications" description="Booking updates and alerts will appear here." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => !n.isRead && dispatch(markNotificationRead(n._id))}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition',
                  n.isRead ? 'border-ink-100 bg-white' : 'border-brand-200 bg-brand-50/50 hover:bg-brand-50',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{n.title || titleCase(n.type)}</p>
                    <p className="mt-0.5 text-sm text-ink-600">{n.message}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-ink-400">{formatDateTime(n.createdAt)}</p>
                    {!n.isRead && <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function titleCase(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
