import { useMemo, useState } from 'react';
import { Timer } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import type { Subject, Topic } from '../../types/academic';
import type { SessionType } from '../../types/dashboard';
import type { CreateManualSessionInput } from '../../services/studySessions.service';

interface SessionSetupCardProps {
  subjects: Subject[];
  topics: Topic[];
  defaultFocusMinutes: number;
  defaultBreakMinutes: number;
  onStart: (input: CreateManualSessionInput) => void | Promise<void>;
  isStarting: boolean;
}

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'focus', label: 'Focus' },
  { value: 'revision', label: 'Revision' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practice', label: 'Practice' },
  { value: 'review', label: 'Review' },
];

// Matches the backend's plannedDurationMinutes upper bound.
const MAX_TOTAL_FOCUS_MINUTES = 480;

export function SessionSetupCard({
  subjects,
  topics,
  defaultFocusMinutes,
  defaultBreakMinutes,
  onStart,
  isStarting,
}: SessionSetupCardProps) {
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('pomodoro');
  const [focusMinutes, setFocusMinutes] = useState(defaultFocusMinutes || 25);
  const [breakMinutes, setBreakMinutes] = useState(defaultBreakMinutes || 5);
  const [cyclesPlanned, setCyclesPlanned] = useState(4);

  const filteredTopics = useMemo(
    () => (subjectId ? topics.filter((topic) => topic.subject === subjectId) : topics),
    [topics, subjectId]
  );

  const safeFocusMinutes = Math.max(1, focusMinutes);
  const safeCyclesPlanned = Math.max(1, cyclesPlanned);
  const totalFocusMinutes = safeFocusMinutes * safeCyclesPlanned;
  const exceedsMax = totalFocusMinutes > MAX_TOTAL_FOCUS_MINUTES;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (exceedsMax) return;

    onStart({
      subject: subjectId || undefined,
      topic: topicId || undefined,
      sessionType,
      plannedDurationMinutes: totalFocusMinutes,
      focusDurationMinutes: safeFocusMinutes,
      shortBreakDurationMinutes: Math.max(1, breakMinutes),
      longBreakDurationMinutes: Math.min(120, Math.max(1, breakMinutes) * 3),
      cyclesPlanned: safeCyclesPlanned,
    });
  };

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Timer className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-page-heading">Ready to focus?</h1>
        <p className="text-secondary max-w-sm">
          Choose what you're working on and start a distraction-free study session.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Subject (optional)"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setTopicId('');
            }}
          >
            <option value="">No subject</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </Select>

          <Select label="Topic (optional)" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            <option value="">No topic</option>
            {filteredTopics.map((topic) => (
              <option key={topic._id} value={topic._id}>
                {topic.name}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="Session type"
          value={sessionType}
          onChange={(event) => setSessionType(event.target.value as SessionType)}
        >
          {SESSION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            type="number"
            min={1}
            max={180}
            label="Focus (min)"
            value={focusMinutes}
            onChange={(event) => setFocusMinutes(Number(event.target.value))}
          />
          <Input
            type="number"
            min={1}
            max={60}
            label="Break (min)"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(Number(event.target.value))}
          />
          <Input
            type="number"
            min={1}
            max={20}
            label="Cycles"
            value={cyclesPlanned}
            onChange={(event) => setCyclesPlanned(Number(event.target.value))}
            error={
              exceedsMax
                ? `Focus × cycles must be at most ${MAX_TOTAL_FOCUS_MINUTES} minutes (currently ${totalFocusMinutes}).`
                : undefined
            }
          />
        </div>

        <Button type="submit" size="lg" isLoading={isStarting} disabled={exceedsMax} className="w-full">
          Start Focus
        </Button>
      </form>
    </Card>
  );
}
