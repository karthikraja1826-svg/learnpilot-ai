import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Reveal } from './Reveal';
import heroPreviewImage from '../../assets/images/landing-preview.jpg';

function HeroPreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent-soft blur-2xl" aria-hidden="true" />
      <div className="surface-elevated overflow-hidden p-0">
        <img
          src={heroPreviewImage}
          alt="Student studying with an AI-powered study assistant"
          className="h-auto w-full object-cover"
        />
      </div>
    </div>
  );
}

export function HeroSection() {
  const navigate = useNavigate();

  const scrollToHowItWorks = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 sm:px-10 sm:pb-24 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pb-28 lg:pt-24">
      <Reveal className="flex flex-col items-start gap-6">
        <span className="text-label inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 tracking-wide text-accent">
          AI-POWERED STUDY PLANNING
        </span>
        <h1 className="text-display max-w-xl">
          Study smarter.
          <br />
          Make every hour count.
        </h1>
        <p className="text-body max-w-lg text-text-secondary">
          LearnPilot AI turns your subjects, deadlines, exams, and study habits into a
          personalized plan that helps you focus on what matters most.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="lg" onClick={() => navigate('/register')}>
            Start Planning Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="lg" onClick={scrollToHowItWorks}>
            See How It Works
          </Button>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <HeroPreviewCard />
      </Reveal>
    </section>
  );
}
