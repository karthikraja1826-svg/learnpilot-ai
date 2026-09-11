import { Menu, Bell } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';
import { IconButton } from '../ui/IconButton';
import { ThemeToggle } from './ThemeToggle';

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { count: unreadCount } = useUnreadNotificationsCount();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg px-4 sm:px-6">
      <IconButton aria-label="Open navigation" onClick={onMenuClick} className="md:hidden">
        <Menu className="h-5 w-5" />
      </IconButton>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <NavLink to="/app/notifications" className="relative">
          <IconButton aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}>
            <Bell className="h-4 w-4" />
          </IconButton>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>
      </div>
    </header>
  );
}
