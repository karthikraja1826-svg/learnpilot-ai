import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../layout/ThemeToggle';
import { Footer } from '../landing/Footer';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
          <Link to="/" aria-label="LearnPilot AI home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-label text-text-secondary transition-colors duration-250 hover:bg-accent-soft hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-page-heading">{title}</h1>
          <p className="text-caption">Last updated: {lastUpdated}</p>
        </div>

        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </main>

      <Footer />
    </>
  );
}
