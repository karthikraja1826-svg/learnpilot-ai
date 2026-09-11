import { CheckCircle2, Coffee, Play } from 'lucide-react';
import { Reveal } from './Reveal';

const HIGHLIGHTS = ['Distraction-free timer', 'Automatic break reminders', 'Session history built in'];

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PROGRESS = 68;

export function FocusShowcase() {
  const offset = CIRCUMFERENCE * (1 - PROGRESS / 100);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal className="order-2 flex flex-col gap-4 lg:order-1">
          <h2 className="text-page-heading">Turn planned time into focused time.</h2>
          <p className="text-body text-text-secondary">
            Pomodoro-based focus sessions keep you working in short, sustainable bursts — with
            clear breaks and a running record of what you completed.
          </p>
          <ul className="flex flex-col gap-2">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-secondary">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="surface-elevated order-1 flex flex-col items-center gap-6 p-8 lg:order-2">
          <p className="text-label">Focus Session · Data Structures</p>
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-40 w-40 -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={RADIUS} className="fill-none stroke-border" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                className="fill-none stroke-accent transition-[stroke-dashoffset] duration-500"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-2xl text-text-primary">17:02</span>
              <span className="text-caption">remaining</span>
            </div>
          </div>

          <div className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="text-label">Session 3 of 5</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-caption">
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
              Break in 8 min
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
