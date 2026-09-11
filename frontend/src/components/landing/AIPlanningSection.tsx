import type { LucideIcon } from 'lucide-react';
import { Brain, CalendarCheck, ChevronRight, Database, RefreshCw } from 'lucide-react';
import { Reveal } from './Reveal';

const FLOW: { icon: LucideIcon; label: string }[] = [
  { icon: Database, label: 'Your Data' },
  { icon: Brain, label: 'AI Prioritization' },
  { icon: CalendarCheck, label: 'Optimized Schedule' },
  { icon: RefreshCw, label: 'Continuous Adjustment' },
];

export function AIPlanningSection() {
  return (
    <section id="ai-planning" className="scroll-mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal className="flex flex-col gap-4">
            <span className="text-label text-accent">AI PLANNING ENGINE</span>
            <h2 className="text-page-heading">Planning that adapts to you.</h2>
            <p className="text-body text-text-secondary">
              LearnPilot AI considers your subjects, deadlines, workload, availability, priorities, and
              study patterns to create a plan that fits your actual schedule.
            </p>
          </Reveal>

          <Reveal delay={120} className="surface-elevated p-6 sm:p-8">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-2">
              {FLOW.map((step, index) => (
                <div key={step.label} className="flex flex-1 items-center gap-2">
                  <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-surface px-3 py-4 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <step.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-label">{step.label}</span>
                  </div>
                  {index < FLOW.length - 1 && (
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-text-muted sm:block" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
