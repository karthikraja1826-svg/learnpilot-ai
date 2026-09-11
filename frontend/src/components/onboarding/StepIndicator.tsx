import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;

        return (
          <li key={step} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors duration-250',
                  isComplete && 'border-accent bg-accent text-white',
                  isActive && !isComplete && 'border-accent text-accent',
                  !isActive && !isComplete && 'border-border text-text-muted'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : stepNumber}
              </span>
              <span
                className={cn(
                  'hidden text-caption sm:block',
                  isActive && 'font-medium text-text-primary'
                )}
              >
                {step}
              </span>
            </div>
            {stepNumber < steps.length && (
              <span
                className={cn('h-px flex-1', isComplete ? 'bg-accent' : 'bg-border')}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
