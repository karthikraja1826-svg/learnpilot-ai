import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-elevated text-text-secondary border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success/15 text-success border-transparent',
  warning: 'bg-warning/15 text-warning border-transparent',
  error: 'bg-error/15 text-error border-transparent',
};

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
