import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../utils/cn';

type LinkButtonVariant = 'primary' | 'secondary' | 'ghost';
type LinkButtonSize = 'sm' | 'md' | 'lg';

interface LinkButtonProps extends LinkProps {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
}

const variantClasses: Record<LinkButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface-elevated text-text-primary border border-border hover:bg-accent-soft',
  ghost: 'bg-transparent text-text-secondary hover:bg-accent-soft hover:text-text-primary',
};

const sizeClasses: Record<LinkButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-[0.9375rem] gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function LinkButton({ variant = 'primary', size = 'md', className, children, ...props }: LinkButtonProps) {
  return (
    <Link
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-250',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
