import { CalendarClock, Pencil } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { AVAILABILITY_DAYS, type AvailabilityDay, type StudyAvailability } from '../../types/academic';

interface AvailabilityOverviewProps {
  availability: StudyAvailability | null;
  onEdit: () => void;
}

const DAY_SHORT: Record<AvailabilityDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function AvailabilityOverview({ availability, onEdit }: AvailabilityOverviewProps) {
  if (!availability) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Study availability not set up"
          description="Set your available study time so LearnPilot AI can plan around your schedule."
          action={
            <Button size="sm" onClick={onEdit}>
              Configure availability
            </Button>
          }
        />
      </Card>
    );
  }

  const enabledDays = AVAILABILITY_DAYS.filter((day) => availability.weeklySchedule[day]?.enabled);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-section-heading">Study Availability</h3>
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {enabledDays.length === 0 ? (
        <p className="text-secondary">No days are enabled yet. Edit your availability to add some.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {enabledDays.map((day) => {
            const daySchedule = availability.weeklySchedule[day];
            return (
              <span key={day} className="rounded-lg border border-border px-2.5 py-1 text-caption">
                {DAY_SHORT[day]} {daySchedule?.startTime}–{daySchedule?.endTime}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-caption">
        <span>Timezone: {availability.timezone}</span>
        <span>Daily limit: {availability.dailyStudyLimit}m</span>
        <span>Session: {availability.preferredSessionDuration}m</span>
        <span>Break: {availability.preferredBreakDuration}m</span>
      </div>
    </Card>
  );
}
