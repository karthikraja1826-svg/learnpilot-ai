import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  CalendarRange,
  BookOpen,
  ClipboardList,
  ListChecks,
  Timer,
  ClipboardCheck,
  BarChart3,
  Bell,
  User,
  Settings,
  ChevronsLeft,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Logo } from '../common/Logo';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/optimize', label: 'Optimize', icon: Target },
  { to: '/app/study-plan', label: 'Study Plan', icon: CalendarRange },
  { to: '/app/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/app/exams-assignments', label: 'Exams & Assignments', icon: ClipboardList },
  { to: '/app/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/app/pomodoro', label: 'Pomodoro', icon: Timer },
  { to: '/app/end-of-day-test', label: 'End-of-Day Test', icon: ClipboardCheck },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navList = (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-250',
                  'text-sidebar-text hover:bg-sidebar-active/60',
                  isActive && 'bg-sidebar-active text-sidebar-active-text'
                )
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden md:flex md:flex-col border-r border-sidebar-border bg-sidebar-bg transition-[width] duration-250',
          isCollapsed ? 'md:w-[4.5rem]' : 'md:w-64'
        )}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <Logo collapsed={isCollapsed} />
        </div>
        {navList}
        <div className="border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sidebar-text-muted hover:bg-sidebar-active/60 hover:text-sidebar-text"
          >
            <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-250', isCollapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onMobileClose} />
          <aside className="relative flex w-72 max-w-[80%] flex-col bg-sidebar-bg shadow-soft-lg">
            <div className="flex items-center justify-between px-4 py-5">
              <Logo />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onMobileClose}
                className="text-sidebar-text-muted hover:text-sidebar-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navList}
          </aside>
        </div>
      )}
    </>
  );
}
