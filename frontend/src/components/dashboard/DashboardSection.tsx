import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';

interface DashboardSectionProps {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function DashboardSection({
  title,
  actionLabel,
  actionTo,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
  children,
}: DashboardSectionProps) {
  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section-heading">{title}</h2>
        {actionLabel && actionTo && (
          <Link to={actionTo} className="text-label text-accent hover:text-accent-hover">
            {actionLabel}
          </Link>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Loading" className="py-6" />
      ) : error ? (
        <ErrorState description={error} onRetry={onRetry} className="border-none px-0 py-6" />
      ) : isEmpty ? (
        <EmptyState title={emptyTitle ?? 'Nothing here yet'} description={emptyDescription} action={emptyAction} className="border-none py-6" />
      ) : (
        children
      )}
    </Card>
  );
}
