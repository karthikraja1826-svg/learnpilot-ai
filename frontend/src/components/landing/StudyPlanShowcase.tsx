import { Reveal } from './Reveal';

type PriorityTone = 'high' | 'medium' | 'low';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const SESSIONS: Record<(typeof DAYS)[number], { subject: string; tone: PriorityTone }[]> = {
  Mon: [
    { subject: 'Mathematics', tone: 'high' },
    { subject: 'Data Structures', tone: 'medium' },
  ],
  Tue: [{ subject: 'Machine Learning', tone: 'high' }],
  Wed: [
    { subject: 'Database Systems', tone: 'medium' },
    { subject: 'Mathematics', tone: 'low' },
  ],
  Thu: [{ subject: 'Data Structures', tone: 'high' }],
  Fri: [
    { subject: 'Machine Learning', tone: 'medium' },
    { subject: 'Database Systems', tone: 'low' },
  ],
  Sat: [{ subject: 'Mathematics', tone: 'low' }],
  Sun: [],
};

const TONE_CLASSES: Record<PriorityTone, string> = {
  high: 'border-accent/40 bg-accent-soft text-accent',
  medium: 'border-warning/30 bg-warning/10 text-warning',
  low: 'border-border bg-surface text-text-secondary',
};

const SUBJECTS = [
  { name: 'Mathematics', priority: 'High priority', progress: 62 },
  { name: 'Data Structures', priority: 'High priority', progress: 48 },
  { name: 'Machine Learning', priority: 'Medium priority', progress: 71 },
  { name: 'Database Systems', priority: 'Exam in 5 days', progress: 30 },
];

export function StudyPlanShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-page-heading">Your entire study week, organized.</h2>
        <p className="text-body mt-4 text-text-secondary">
          Every subject, session, and deadline in one clear view — prioritized automatically.
        </p>
      </Reveal>

      <Reveal delay={100} className="surface-elevated mt-12 grid gap-6 p-6 lg:grid-cols-[260px_1fr] lg:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-label">Subjects</p>
          {SUBJECTS.map((subject) => (
            <div key={subject.name} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-body font-medium">{subject.name}</p>
                <span className="text-caption">{subject.progress}%</span>
              </div>
              <p className="text-caption mt-0.5">{subject.priority}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                <div className="h-full rounded-full bg-accent" style={{ width: `${subject.progress}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-label">This Week</p>
            <div className="flex items-center gap-3 text-caption">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                High
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                Medium
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-border" aria-hidden="true" />
                Low
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {DAYS.map((day) => (
              <div key={day} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-1.5 sm:p-3">
                <p className="text-caption text-center">{day}</p>
                <div className="flex flex-col gap-1.5">
                  {SESSIONS[day].length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-3 text-center text-caption">
                      —
                    </div>
                  )}
                  {SESSIONS[day].map((session, index) => (
                    <div
                      key={`${day}-${index}`}
                      className={`rounded-lg border px-1 py-1.5 text-center text-[0.625rem] font-medium leading-tight sm:text-[0.6875rem] ${TONE_CLASSES[session.tone]}`}
                    >
                      {session.subject}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
