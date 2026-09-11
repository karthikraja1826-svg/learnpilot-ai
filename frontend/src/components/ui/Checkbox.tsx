import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, className, ...props }, ref) => {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label htmlFor={checkboxId} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={cn('peer h-5 w-5 shrink-0 appearance-none rounded-md border border-border bg-surface', 'checked:bg-accent checked:border-accent transition-colors duration-250', 'focus-visible:outline-none', className)}
          {...props}
        />
        <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" aria-hidden="true" />
      </span>
      {label && <span className="text-body">{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
