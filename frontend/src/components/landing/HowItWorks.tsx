import { Reveal } from './Reveal';

const STEPS = [
  {
    number: '01',
    title: 'Add your academic goals',
    description: 'Bring in your subjects, exams, assignments, and deadlines.',
  },
  {
    number: '02',
    title: 'Tell LearnPilot AI what matters',
    description: 'Set your priorities, workload, and the time you actually have.',
  },
  {
    number: '03',
    title: 'Get your optimized plan',
    description: 'Receive a personalized schedule built around your real week.',
  },
  {
    number: '04',
    title: 'Study, track, improve',
    description: 'Follow your plan and let it adapt as your progress changes.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <Reveal className="max-w-2xl">
          <h2 className="text-page-heading">A plan that builds itself around you.</h2>
        </Reveal>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.number}
              delay={index * 80}
              className="flex flex-col gap-3 border-l-2 border-border pl-5 lg:border-l-0 lg:border-t-2 lg:pl-0 lg:pt-5"
            >
              <span className="font-display text-3xl text-accent">{step.number}</span>
              <h3 className="text-section-heading">{step.title}</h3>
              <p className="text-secondary">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
