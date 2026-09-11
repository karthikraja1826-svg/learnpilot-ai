import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(({ label, id, className, ...props }, ref) => {
  const generatedId = useId();
  const toggleId = id ?? generatedId;

  return (
    <label htmlFor={toggleId} className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border transition-colors duration-250 has-[:checked]:bg-accent">
        <input ref={ref} id={toggleId} type="checkbox" className={cn('peer sr-only', className)} {...props} />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow-soft transition-transform duration-250 peer-checked:translate-x-5" />
      </span>
      {label && <span className="text-body">{label}</span>}
    </label>
  );
});

Toggle.displayName = 'Toggle';
