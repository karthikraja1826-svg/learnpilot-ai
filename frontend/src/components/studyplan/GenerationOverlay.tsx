import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface GenerationOverlayProps {
  isOpen: boolean;
  label?: string;
}

const STAGES = [
  'Reviewing your priorities',
  'Balancing your workload',
  'Finding available study time',
  'Creating your schedule',
];

export function GenerationOverlay({ isOpen, label = 'Building your study plan…' }: GenerationOverlayProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % STAGES.length);
    }, 1600);

    return () => window.clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface-elevated p-8 text-center shadow-soft-lg">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6 animate-pulse" aria-hidden="true" />
        </span>
        <p className="text-section-heading">{label}</p>
        <p className="text-secondary" role="status" aria-live="polite">
          {STAGES[stageIndex]}…
        </p>
      </div>
    </div>
  );
}
