import { Logo } from '../../components/common/Logo';
import { LinkButton } from '../../components/ui/LinkButton';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="flex flex-col gap-2">
        <p className="text-page-heading">Page not found</p>
        <p className="text-secondary max-w-sm">The page you're looking for doesn't exist or may have moved.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <LinkButton to="/" variant="primary" size="md">
          Go home
        </LinkButton>
        <LinkButton to="/app/dashboard" variant="secondary" size="md">
          Go to dashboard
        </LinkButton>
      </div>
    </div>
  );
}
