import { Timer, CalendarRange, ListPlus, BookPlus } from 'lucide-react';
import { Card } from '../ui/Card';
import { LinkButton } from '../ui/LinkButton';

const actions = [
  { to: '/app/pomodoro', label: 'Start Focus', icon: Timer, variant: 'primary' as const },
  { to: '/app/study-plan', label: 'View Study Plan', icon: CalendarRange, variant: 'secondary' as const },
  { to: '/app/tasks', label: 'Add Task', icon: ListPlus, variant: 'secondary' as const },
  { to: '/app/subjects', label: 'Add Subject', icon: BookPlus, variant: 'secondary' as const },
];

export function QuickActions() {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Quick Actions</h2>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ to, label, icon: Icon, variant }) => (
          <LinkButton key={to} to={to} variant={variant} size="sm">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </LinkButton>
        ))}
      </div>
    </Card>
  );
}
