import { CalendarClock, LineChart, Sparkles, Timer } from 'lucide-react';
import { Reveal } from './Reveal';

const VALUES = [
  { icon: Sparkles, label: 'Personalized plans' },
  { icon: CalendarClock, label: 'Adaptive scheduling' },
  { icon: Timer, label: 'Focus sessions' },
  { icon: LineChart, label: 'Progress insights' },
];

export function ValueStrip() {
  return (
    <section className="border-y border-border bg-surface/60">
      <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:px-10 md:grid-cols-4">
        {VALUES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-label">{label}</span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
