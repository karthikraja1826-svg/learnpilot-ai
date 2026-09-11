import { getPasswordStrength } from '../../utils/validation';
import { cn } from '../../utils/cn';

interface PasswordStrengthMeterProps {
  password: string;
}

const CONFIG = {
  weak: { label: 'Weak', bars: 1, color: 'bg-error' },
  fair: { label: 'Fair', bars: 2, color: 'bg-warning' },
  strong: { label: 'Strong', bars: 3, color: 'bg-success' },
} as const;

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const { label, bars, color } = CONFIG[strength];

  return (
    <div className="flex items-center gap-2.5" role="status">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((segment) => (
          <span
            key={segment}
            className={cn('h-1.5 flex-1 rounded-full bg-border/60', segment <= bars && color)}
          />
        ))}
      </div>
      <span className="text-caption">{label}</span>
    </div>
  );
}
