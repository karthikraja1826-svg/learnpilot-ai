import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center', className)}>
      {icon && <div className="text-text-muted">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="text-section-heading">{title}</p>
        {description && <p className="text-secondary max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
