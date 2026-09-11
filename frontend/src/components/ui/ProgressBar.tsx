import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-label">{label}</span>}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-border/60"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-250"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
