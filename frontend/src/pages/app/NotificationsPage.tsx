import { useCallback, useState } from 'react';
import { CheckCheck, Bell } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PushPermissionCard } from '../../components/notifications/PushPermissionCard';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications.service';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => listNotifications({ page, limit: PAGE_SIZE, unreadOnly: filter === 'unread' }),
    [page, filter]
  );

  const { data, isLoading, error, reload } = useResource(fetcher, [page, filter]);

  const handleFilterChange = (next: 'all' | 'unread') => {
    setFilter(next);
    setPage(1);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      reload();
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Could not update this notification.', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const modifiedCount = await markAllNotificationsRead();
      if (modifiedCount > 0) {
        showToast('All notifications marked as read.', 'success');
      }
      reload();
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Could not mark all notifications as read.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      showToast('Notification deleted.', 'success');
      reload();
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Could not delete this notification.', 'error');
    }
  };

  const notifications = data?.notifications ?? [];
  const hasUnread = notifications.some((notification) => !notification.readAt);
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-page-heading">Notifications</h1>
          <p className="text-secondary">Reminders and updates about your study plan.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleMarkAllRead} disabled={!hasUnread}>
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all as read
        </Button>
      </div>

      <PushPermissionCard />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleFilterChange('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-250 ${
            filter === 'all' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary hover:bg-accent-soft'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('unread')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-250 ${
            filter === 'unread' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary hover:bg-accent-soft'
          }`}
        >
          Unread
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading notifications" />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title={filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
          description={
            filter === 'unread'
              ? 'New reminders and updates will show up here.'
              : 'Study reminders, deadlines, and streak updates will appear here.'
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </ul>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-caption">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
