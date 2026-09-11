import { getGreetingForHour } from '../../utils/dashboardFormat';

interface DashboardHeaderProps {
  name?: string;
  profileImage?: string;
  hasPlanToday: boolean;
}

export function DashboardHeader({ name, hasPlanToday }: DashboardHeaderProps) {
  const greeting = getGreetingForHour(new Date().getHours());
  const firstName = name?.trim().split(/\s+/)[0];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-page-heading">
          {greeting}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-secondary">
          {hasPlanToday ? "Here's what your study day looks like." : 'Your study day is ready to be planned.'}
        </p>
      </div>
    </div>
  );
}
