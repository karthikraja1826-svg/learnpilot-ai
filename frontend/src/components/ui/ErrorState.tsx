import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center', className)}>
      <AlertCircle className="h-6 w-6 text-error" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-section-heading">{title}</p>
        {description && <p className="text-secondary max-w-sm">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
