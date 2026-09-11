import { Flame } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { StreakInfo } from '../../types/dashboard';

interface StreakCardProps {
  streak: StreakInfo | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function StreakCard({ streak, isLoading, error, onRetry }: StreakCardProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-3">
        <LoadingState label="Loading streak" className="py-6" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col gap-3">
        <ErrorState description={error} onRetry={onRetry} className="border-none px-0 py-6" />
      </Card>
    );
  }

  const currentStreak = streak?.currentStreak ?? 0;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-section-heading">Study Streak</h2>
      {currentStreak > 0 ? (
        <div className="flex items-center gap-3">
          <Flame className="h-6 w-6 text-accent" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="font-display text-2xl text-text-primary">{currentStreak} day{currentStreak === 1 ? '' : 's'}</span>
            {streak && streak.longestStreak > currentStreak && (
              <span className="text-caption">Best: {streak.longestStreak} days</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-secondary">Start your first study streak today.</p>
      )}
    </Card>
  );
}
