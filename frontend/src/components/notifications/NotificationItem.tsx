import { BookOpen, CalendarClock, Flame, GraduationCap, Sparkles, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from '../ui/IconButton';
import type { AppNotification, NotificationType } from '../../types/notifications';

const TYPE_ICONS: Record<NotificationType, typeof BookOpen> = {
  study_session_start: BookOpen,
  study_session_reminder: BookOpen,
  study_session_missed: BookOpen,
  assignment_deadline: CalendarClock,
  exam_reminder: GraduationCap,
  streak: Flame,
  study_plan: CalendarClock,
  adaptive_plan: Sparkles,
  system: Sparkles,
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const Icon = TYPE_ICONS[notification.type] ?? Sparkles;
  const isUnread = !notification.readAt;

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border p-4 transition-colors duration-250',
        isUnread ? 'bg-accent-soft/40' : 'bg-surface'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-body', isUnread && 'font-semibold')}>{notification.title}</p>
          <span className="shrink-0 text-caption">{formatTimestamp(notification.createdAt)}</span>
        </div>
        <p className="text-secondary">{notification.body}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isUnread && (
          <button
            type="button"
            onClick={() => onMarkRead(notification._id)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft"
          >
            Mark read
          </button>
        )}
        <IconButton aria-label="Delete notification" onClick={() => onDelete(notification._id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </li>
  );
}
