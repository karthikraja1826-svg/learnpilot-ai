import { Flame } from 'lucide-react';
import { Card } from '../ui/Card';
import type { StreakInfo } from '../../types/dashboard';

interface StreakPanelProps {
  streak: StreakInfo;
}

export function StreakPanel({ streak }: StreakPanelProps) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Streak</h2>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Flame className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-3xl text-text-primary">{streak.currentStreak}</span>
          <span className="text-caption">day{streak.currentStreak === 1 ? '' : 's'} current streak</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-secondary">Best streak</span>
        <span className="text-body font-medium">{streak.longestStreak} days</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-secondary">Total study days</span>
        <span className="text-body font-medium">{streak.studyDays}</span>
      </div>
    </Card>
  );
}
