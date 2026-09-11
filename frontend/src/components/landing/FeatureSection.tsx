import { BarChart3, BellRing, Brain, ListChecks, RefreshCw, Timer } from 'lucide-react';
import { FeatureCard } from './FeatureCard';
import { Reveal } from './Reveal';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Study Planning',
    description: 'Personalized daily and weekly study plans built around your goals.',
  },
  {
    icon: ListChecks,
    title: 'Smart Prioritization',
    description: 'Prioritize subjects, exams, assignments, and tasks based on urgency and importance.',
  },
  {
    icon: RefreshCw,
    title: 'Adaptive Scheduling',
    description: 'Your plan adjusts automatically when sessions are missed or priorities change.',
  },
  {
    icon: Timer,
    title: 'Focus Sessions',
    description: 'Pomodoro-based focused study sessions that keep you in flow.',
  },
  {
    icon: BarChart3,
    title: 'Progress Analytics',
    description: 'Understand your study consistency, performance, and progress over time.',
  },
  {
    icon: BellRing,
    title: 'Smart Reminders',
    description: 'Stay aware of important study sessions and upcoming deadlines.',
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:px-10 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-page-heading">Everything you need to study with intention.</h2>
        <p className="text-body mt-4 text-text-secondary">
          LearnPilot AI brings planning, prioritization, focus, and analytics together in one place, so
          your time goes toward what actually moves you forward.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 60}>
            <FeatureCard {...feature} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
