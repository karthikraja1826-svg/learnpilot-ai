import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import type { PlanEntryStatus, StudyPlanEntry } from '../../types/academic';

interface PlanEntryEditModalProps {
  entry: StudyPlanEntry;
  onSubmit: (changes: { startTime: string; endTime: string; durationMinutes: number; status: PlanEntryStatus; reason: string }) => Promise<void>;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: PlanEntryStatus; label: string }[] = [
  { value: 'scheduled', label: 'Upcoming' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'missed', label: 'Missed' },
];

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function PlanEntryEditModal({ entry, onSubmit, onCancel }: PlanEntryEditModalProps) {
  const [startTime, setStartTime] = useState(entry.startTime);
  const [endTime, setEndTime] = useState(entry.endTime);
  const [status, setStatus] = useState<PlanEntryStatus>(entry.status);
  const [reason, setReason] = useState(entry.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationMinutes = toMinutes(endTime) - toMinutes(startTime);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (durationMinutes <= 0) {
      setError('End time must be after start time.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ startTime, endTime, durationMinutes, status, reason: reason.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-section-heading">{entry.subjectName || 'Study session'}</span>
        {entry.topicName && <span className="text-secondary">{entry.topicName}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-label" htmlFor="entry-start-time">
            Start time
          </label>
          <input
            id="entry-start-time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="h-11 rounded-xl border border-border bg-surface px-3.5 text-body focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label" htmlFor="entry-end-time">
            End time
          </label>
          <input
            id="entry-end-time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="h-11 rounded-xl border border-border bg-surface px-3.5 text-body focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </div>

      <p className="text-caption">Duration: {durationMinutes > 0 ? `${durationMinutes} minutes` : '—'}</p>

      <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as PlanEntryStatus)}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Textarea
        label="Notes"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Optional notes about this session"
        maxLength={500}
      />

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
