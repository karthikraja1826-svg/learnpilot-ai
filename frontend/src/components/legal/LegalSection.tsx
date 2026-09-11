import type { ReactNode } from 'react';

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section-heading">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-text-secondary [&_a]:text-accent [&_a:hover]:text-accent-hover [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text-primary">
        {children}
      </div>
    </section>
  );
}
