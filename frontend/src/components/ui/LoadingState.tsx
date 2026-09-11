import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-text-secondary', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
      <p className="text-secondary">{label}</p>
    </div>
  );
}
