import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Reveal } from './Reveal';

export function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 sm:px-10 sm:pb-28">
      <Reveal className="surface-elevated flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-12">
        <h2 className="text-page-heading max-w-xl">Your next study session starts with a better plan.</h2>
        <p className="text-body max-w-md text-text-secondary">
          Build a study routine that adapts to your goals, deadlines, and real schedule.
        </p>
        <Button size="lg" onClick={() => navigate('/register')}>
          Create My Study Plan
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <p className="text-caption">No complicated setup. Start with what you're studying today.</p>
      </Reveal>
    </section>
  );
}
