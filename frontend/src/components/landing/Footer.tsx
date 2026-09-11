import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:px-10 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-secondary">
            AI-powered study planning that turns your subjects, deadlines, and habits into a plan
            you can actually follow.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-8">
          <div className="flex flex-col gap-2">
            <p className="text-label">Product</p>
            <a href="#features" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              Features
            </a>
            <a href="#how-it-works" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              How It Works
            </a>
            <a href="#ai-planning" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              AI Planning
            </a>
            <a href="#analytics" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              Analytics
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label">Account</p>
            <Link to="/login" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              Log In
            </Link>
            <Link to="/register" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              Register
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-label">Legal</p>
            <Link to="/terms" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="text-secondary transition-colors duration-250 hover:text-text-primary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-5 sm:px-10">
        <p className="text-caption mx-auto max-w-6xl">© {new Date().getFullYear()} LearnPilot AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
