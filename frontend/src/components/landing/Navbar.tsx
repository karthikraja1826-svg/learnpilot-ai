import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../layout/ThemeToggle';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'AI Planning', href: '#ai-planning' },
  { label: 'Analytics', href: '#analytics' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
        <Link to="/" aria-label="LearnPilot AI home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleNavClick(link.href)}
              className="text-label text-text-secondary transition-colors duration-250 hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Log In
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
            Get Started
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors duration-250 hover:bg-accent-soft hover:text-text-primary"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border bg-bg transition-[max-height] duration-300 ease-out md:hidden',
          open ? 'max-h-96' : 'max-h-0 border-t-0'
        )}
      >
        <nav className="flex flex-col gap-1 px-6 py-4" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleNavClick(link.href)}
              className="rounded-lg px-3 py-2.5 text-body text-text-secondary transition-colors duration-250 hover:bg-accent-soft hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
            <Button variant="secondary" size="md" className="w-full" onClick={() => navigate('/login')}>
              Log In
            </Button>
            <Button variant="primary" size="md" className="w-full" onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
