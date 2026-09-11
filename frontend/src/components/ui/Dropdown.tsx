import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  destructive?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex"
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface-elevated py-1 shadow-soft-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => {
                item.onSelect();
                setIsOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors duration-250 hover:bg-accent-soft',
                item.destructive ? 'text-error' : 'text-text-primary'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
