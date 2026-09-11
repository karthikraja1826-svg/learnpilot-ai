import { Outlet, Link, useLocation } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { AuthSidePanel } from '../components/auth/AuthSidePanel';
import { cn } from '../utils/cn';

export function AuthLayout() {
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" aria-label="LearnPilot AI home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main
        className={cn(
          'mx-auto flex w-full flex-1 items-center px-4 pb-16',
          isOnboarding ? 'max-w-3xl justify-center' : 'max-w-6xl justify-center lg:justify-between lg:gap-16'
        )}
      >
        <div className={cn('w-full', isOnboarding ? 'max-w-2xl' : 'max-w-md')}>
          <Outlet />
        </div>
        {!isOnboarding && (
          <div className="hidden w-full max-w-md lg:block">
            <AuthSidePanel />
          </div>
        )}
      </main>
    </div>
  );
}
