import { cn } from '../../utils/cn';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
}

export function Logo({ className, collapsed = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-base text-white">
        L
      </span>
      {!collapsed && <span className="font-display text-lg tracking-tight text-text-primary">LearnPilot AI</span>}
    </div>
  );
}
