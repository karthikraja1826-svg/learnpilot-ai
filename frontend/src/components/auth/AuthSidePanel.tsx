import { Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';
import loginPreviewImage from '../../assets/images/login-preview.jpg';

export function AuthSidePanel() {
  return (
    <div className="relative flex h-full flex-col justify-center gap-8 overflow-hidden rounded-3xl bg-surface-elevated p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-soft blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent-soft blur-3xl" />

      <div className="relative flex flex-col gap-3">
        <Badge tone="accent" className="w-fit">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          AI-planned
        </Badge>
        <h2 className="text-page-heading">A study plan that adapts to your week.</h2>
        <p className="text-secondary max-w-sm">
          LearnPilot AI turns your subjects, deadlines, and energy levels into a schedule you can
          actually keep.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border">
        <img
          src={loginPreviewImage}
          alt="Student using an AI-powered learning assistant"
          className="h-auto w-full object-cover"
        />
      </div>
    </div>
  );
}
