import { Reveal } from './Reveal';

const WEEK_HOURS = [
  { day: 'Mon', hours: 2.5 },
  { day: 'Tue', hours: 3.2 },
  { day: 'Wed', hours: 1.8 },
  { day: 'Thu', hours: 3.6 },
  { day: 'Fri', hours: 2.1 },
  { day: 'Sat', hours: 4.0 },
  { day: 'Sun', hours: 1.4 },
];

const SUBJECT_DISTRIBUTION = [
  { subject: 'Mathematics', percent: 32 },
  { subject: 'Data Structures', percent: 27 },
  { subject: 'Machine Learning', percent: 24 },
  { subject: 'Database Systems', percent: 17 },
];

const TREND_POINTS = [12, 18, 16, 24, 22, 30, 34];
const COMPLETION_RATE = 82;
const COMPLETION_RADIUS = 42;
const COMPLETION_CIRCUMFERENCE = 2 * Math.PI * COMPLETION_RADIUS;

export function AnalyticsShowcase() {
  const maxHours = Math.max(...WEEK_HOURS.map((item) => item.hours));
  const maxTrend = Math.max(...TREND_POINTS);
  const trendPath = TREND_POINTS.map((value, index) => {
    const x = (index / (TREND_POINTS.length - 1)) * 100;
    const y = 32 - (value / maxTrend) * 28;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section id="analytics" className="scroll-mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-page-heading">Know how you're actually studying.</h2>
          <p className="text-body mt-4 text-text-secondary">
            Track hours, consistency, and progress across every subject in one clear dashboard.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <Reveal className="surface-elevated p-6 lg:col-span-2">
            <p className="text-label">Weekly Study Hours</p>
            <div className="mt-6 flex h-40 items-end gap-3 sm:gap-4">
              {WEEK_HOURS.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end overflow-hidden rounded-lg bg-border/40">
                    <div
                      className="w-full rounded-lg bg-accent transition-[height] duration-500"
                      style={{ height: `${(item.hours / maxHours) * 100}%` }}
                    />
                  </div>
                  <span className="text-caption">{item.day}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80} className="surface-elevated flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-label">Completion Rate</p>
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r={COMPLETION_RADIUS} className="fill-none stroke-border" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r={COMPLETION_RADIUS}
                  className="fill-none stroke-accent"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={COMPLETION_CIRCUMFERENCE}
                  strokeDashoffset={COMPLETION_CIRCUMFERENCE * (1 - COMPLETION_RATE / 100)}
                />
              </svg>
              <span className="absolute font-display text-2xl text-text-primary">{COMPLETION_RATE}%</span>
            </div>
            <p className="text-caption">Sessions completed on schedule</p>
          </Reveal>

          <Reveal delay={120} className="surface-elevated p-6">
            <p className="text-label">Subject Distribution</p>
            <div className="mt-4 flex flex-col gap-3">
              {SUBJECT_DISTRIBUTION.map((item) => (
                <div key={item.subject}>
                  <div className="flex items-center justify-between text-caption">
                    <span>{item.subject}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={160} className="surface-elevated p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-label">Progress Trend</p>
              <span className="text-caption">Last 7 weeks</span>
            </div>
            <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-4 h-16 w-full" aria-hidden="true">
              <polyline
                points={trendPath}
                className="fill-none stroke-accent"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
