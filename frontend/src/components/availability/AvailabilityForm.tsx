import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { Toggle } from '../ui/Toggle';
import {
  AVAILABILITY_DAYS,
  type AvailabilityDay,
  type DaySchedule,
  type StudyAvailability,
  type StudyPeriod,
  type WeeklySchedule,
} from '../../types/academic';
import type { StudyAvailabilityInput } from '../../services/availability.service';

interface AvailabilityFormProps {
  initial: StudyAvailability | null;
  onSubmit: (input: StudyAvailabilityInput) => Promise<void>;
  onCancel: () => void;
}

const DAY_LABELS: Record<AvailabilityDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const STUDY_PERIODS: { value: StudyPeriod; label: string }[] = [
  { value: 'early_morning', label: 'Early morning' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'late_night', label: 'Late night' },
];

const DEFAULT_DAY: DaySchedule = { enabled: false, startTime: '09:00', endTime: '17:00' };

const buildDefaultSchedule = (existing: WeeklySchedule | undefined): Record<AvailabilityDay, DaySchedule> => {
  const schedule = {} as Record<AvailabilityDay, DaySchedule>;
  AVAILABILITY_DAYS.forEach((day) => {
    schedule[day] = { ...DEFAULT_DAY, ...existing?.[day] };
  });
  return schedule;
};

export function AvailabilityForm({ initial, onSubmit, onCancel }: AvailabilityFormProps) {
  const [schedule, setSchedule] = useState<Record<AvailabilityDay, DaySchedule>>(
    buildDefaultSchedule(initial?.weeklySchedule)
  );
  const [timezone, setTimezone] = useState(
    initial?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [dailyStudyLimit, setDailyStudyLimit] = useState(initial?.dailyStudyLimit ?? 240);
  const [preferredSessionDuration, setPreferredSessionDuration] = useState(initial?.preferredSessionDuration ?? 45);
  const [preferredBreakDuration, setPreferredBreakDuration] = useState(initial?.preferredBreakDuration ?? 10);
  const [preferredStudyPeriods, setPreferredStudyPeriods] = useState<StudyPeriod[]>(
    initial?.preferredStudyPeriods ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateDay = (day: AvailabilityDay, patch: Partial<DaySchedule>) => {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
  };

  const togglePeriod = (period: StudyPeriod) => {
    setPreferredStudyPeriods((current) =>
      current.includes(period) ? current.filter((item) => item !== period) : [...current, period]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const enabledDays = AVAILABILITY_DAYS.filter((day) => schedule[day].enabled);
    if (enabledDays.length === 0) {
      setError('Enable at least one day so a plan can be scheduled.');
      return;
    }
    for (const day of enabledDays) {
      if (schedule[day].startTime >= schedule[day].endTime) {
        setError(`${DAY_LABELS[day]}: start time must be earlier than end time.`);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        weeklySchedule: schedule,
        timezone,
        dailyStudyLimit,
        preferredSessionDuration,
        preferredBreakDuration,
        preferredStudyPeriods,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <span className="text-label">Weekly schedule</span>
        <div className="flex flex-col gap-2">
          {AVAILABILITY_DAYS.map((day) => (
            <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="w-32 shrink-0">
                <Toggle
                  label={DAY_LABELS[day]}
                  checked={schedule[day].enabled}
                  onChange={(event) => updateDay(day, { enabled: event.target.checked })}
                />
              </div>
              <input
                type="time"
                value={schedule[day].startTime}
                disabled={!schedule[day].enabled}
                onChange={(event) => updateDay(day, { startTime: event.target.value })}
                className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm disabled:opacity-40"
                aria-label={`${DAY_LABELS[day]} start time`}
              />
              <span className="text-caption">to</span>
              <input
                type="time"
                value={schedule[day].endTime}
                disabled={!schedule[day].enabled}
                onChange={(event) => updateDay(day, { endTime: event.target.value })}
                className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm disabled:opacity-40"
                aria-label={`${DAY_LABELS[day]} end time`}
              />
            </div>
          ))}
        </div>
      </div>

      <Input
        label="Timezone"
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
        hint="IANA timezone name, e.g. America/New_York"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          type="number"
          label="Daily limit (minutes)"
          min={15}
          max={1440}
          value={dailyStudyLimit}
          onChange={(event) => setDailyStudyLimit(Number(event.target.value))}
        />
        <Input
          type="number"
          label="Session length (minutes)"
          min={5}
          max={480}
          value={preferredSessionDuration}
          onChange={(event) => setPreferredSessionDuration(Number(event.target.value))}
        />
        <Input
          type="number"
          label="Break length (minutes)"
          min={1}
          max={120}
          value={preferredBreakDuration}
          onChange={(event) => setPreferredBreakDuration(Number(event.target.value))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label">Preferred study periods (optional)</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STUDY_PERIODS.map((period) => (
            <Checkbox
              key={period.value}
              label={period.label}
              checked={preferredStudyPeriods.includes(period.value)}
              onChange={() => togglePeriod(period.value)}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save availability
        </Button>
      </div>
    </form>
  );
}
