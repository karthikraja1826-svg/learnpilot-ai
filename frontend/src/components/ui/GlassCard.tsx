import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type GlassCardProps = HTMLAttributes<HTMLDivElement>;

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border bg-surface-elevated/70 p-5 backdrop-blur-md shadow-soft-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
