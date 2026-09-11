import { CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LinkButton } from '../ui/LinkButton';
import { formatMinutes } from '../../utils/dashboardFormat';
import type { StudySession } from '../../types/dashboard';

interface SessionCompleteCardProps {
  session: StudySession;
  subjectName?: string;
  wasStoppedEarly: boolean;
  onStartAnother: () => void;
}

export function SessionCompleteCard({ session, subjectName, wasStoppedEarly, onStartAnother }: SessionCompleteCardProps) {
  const focusedMinutes = wasStoppedEarly ? session.actualDurationMinutes : session.completedDurationMinutes;

  return (
    <Card className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">{wasStoppedEarly ? 'Session ended early.' : 'Focus session complete.'}</h1>
        <p className="text-secondary">{subjectName || 'Study session'}</p>
      </div>

      <div className="flex flex-col items-center">
        <span className="font-display text-4xl text-text-primary">{formatMinutes(focusedMinutes)}</span>
        <span className="text-caption">Actual focused time</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" size="md" onClick={onStartAnother}>
          Start Another Session
        </Button>
        <LinkButton to="/app/study-plan" variant="secondary" size="md">
          Back to Study Plan
        </LinkButton>
        <LinkButton to="/app/analytics" variant="ghost" size="md">
          View Analytics
        </LinkButton>
      </div>
    </Card>
  );
}
