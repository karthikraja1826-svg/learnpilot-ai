import { cn } from '../../utils/cn';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return initials.join('') || '?';
}

export function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ? `${name}'s avatar` : 'User avatar'}
        className={cn('rounded-full object-cover border border-border', sizeClasses[size], className)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name ? `${name}'s avatar` : 'User avatar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        sizeClasses[size],
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
