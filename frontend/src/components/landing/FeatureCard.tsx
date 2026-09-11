import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group surface-card p-6 transition-all duration-250 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent transition-colors duration-250 group-hover:bg-accent group-hover:text-white">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="text-section-heading mt-4">{title}</h3>
      <p className="text-secondary mt-2">{description}</p>
    </div>
  );
}
