import { Moon, Sun } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useTheme } from '../../hooks/useTheme';

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-section-heading">Appearance</h2>
        <p className="text-secondary">Choose how LearnPilot AI looks on this device.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors duration-250',
            theme === 'light' ? 'border-accent bg-accent-soft' : 'border-border hover:bg-accent-soft/40'
          )}
        >
          <Sun className="h-5 w-5 text-accent" />
          <span className="text-body">Light theme</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors duration-250',
            theme === 'dark' ? 'border-accent bg-accent-soft' : 'border-border hover:bg-accent-soft/40'
          )}
        >
          <Moon className="h-5 w-5 text-accent" />
          <span className="text-body">Dark theme</span>
        </button>
      </div>
    </Card>
  );
}
