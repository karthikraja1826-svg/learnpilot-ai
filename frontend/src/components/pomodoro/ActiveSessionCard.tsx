import { Pause, Play, Square } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CircularTimer } from './CircularTimer';
import { cn } from '../../utils/cn';
import type { StudySession } from '../../types/dashboard';

interface ActiveSessionCardProps {
  session: StudySession;
  phase: 'focus' | 'break';
  subjectName?: string;
  topicName?: string;
  remainingSeconds: number;
  totalSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isTransitioning: boolean;
}

function toSessionTypeLabel(sessionType: string): string {
  return sessionType
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ActiveSessionCard({
  session,
  phase,
  subjectName,
  topicName,
  remainingSeconds,
  totalSeconds,
  onPause,
  onResume,
  onStop,
  isTransitioning,
}: ActiveSessionCardProps) {
  const isBreak = phase === 'break';
  const isPaused = !isBreak && session.status === 'paused';
  const currentCycle = isBreak
    ? Math.min(session.cyclesCompleted, session.cyclesPlanned)
    : Math.min(session.cyclesCompleted + 1, session.cyclesPlanned);

  return (
    <Card className="flex flex-col items-center gap-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Badge tone={isBreak ? 'success' : isPaused ? 'warning' : 'accent'}>
            {isBreak ? 'Break' : isPaused ? 'Paused' : 'Focusing'}
          </Badge>
          <Badge tone="neutral">{toSessionTypeLabel(session.sessionType)}</Badge>
        </div>
        <p className="text-body font-medium">{subjectName || 'Study session'}</p>
        {topicName && <p className="text-secondary">{topicName}</p>}
      </div>

      <CircularTimer
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
        label={isBreak ? 'Break' : 'Focus'}
        isPaused={isPaused}
      />

      {session.cyclesPlanned > 1 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-caption">
            Cycle {currentCycle} of {session.cyclesPlanned}
          </p>
          <div
            className="flex items-center gap-2"
            aria-label={`Cycle ${currentCycle} of ${session.cyclesPlanned}`}
          >
            {Array.from({ length: session.cyclesPlanned }).map((_, index) => (
              <span
                key={index}
                className={cn('h-2 w-2 rounded-full', index < session.cyclesCompleted ? 'bg-accent' : 'bg-border')}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!isBreak && (
          <Button
            variant="secondary"
            size="lg"
            onClick={isPaused ? onResume : onPause}
            disabled={isTransitioning}
            aria-label={isPaused ? 'Resume session' : 'Pause session'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        )}
        <Button variant="danger" size="lg" onClick={onStop} disabled={isTransitioning} aria-label="Stop session">
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>

      <p className="text-caption">
        {isBreak
          ? 'Take a breather — your focus time is safely saved.'
          : session.completionPercentage > 0
            ? `${session.completionPercentage}% of planned focus time complete`
            : 'Stay with it — your progress is saved automatically.'}
      </p>
    </Card>
  );
}
