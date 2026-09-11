import { cn } from '../../utils/cn';

interface CircularTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  label: string;
  isPaused?: boolean;
  className?: string;
}

function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function CircularTimer({ remainingSeconds, totalSeconds, label, isPaused, className }: CircularTimerProps) {
  const radius = 120;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds)) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className="-rotate-90"
        role="img"
        aria-label={`${label}: ${formatClock(remainingSeconds)} remaining`}
      >
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <span
          className="font-display text-5xl tabular-nums text-text-primary"
          role="status"
          aria-live="polite"
        >
          {formatClock(remainingSeconds)}
        </span>
        <span className="text-label uppercase tracking-wide">{isPaused ? 'Paused' : label}</span>
      </div>
    </div>
  );
}
