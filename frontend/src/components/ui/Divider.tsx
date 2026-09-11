import { cn } from '../../utils/cn';

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn('border-t border-border', className)} />;
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <hr className="flex-1 border-t border-border" />
      <span className="text-caption">{label}</span>
      <hr className="flex-1 border-t border-border" />
    </div>
  );
}
