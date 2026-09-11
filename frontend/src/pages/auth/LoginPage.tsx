import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Divider } from '../../components/ui/Divider';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { useAuth } from '../../hooks/useAuth';
import { isValidEmail } from '../../utils/validation';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';
import { DASHBOARD_PATH, getPostAuthPath } from '../../utils/authRedirect';

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { loginWithEmail, loginWithGoogle, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isBusy = isSubmitting || isGoogleLoading;
  const redirectFrom = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function completeSignIn(isNewUser: boolean) {
    const profile = await refreshProfile();
    const destination = getPostAuthPath(profile, isNewUser);
    const target = destination === DASHBOARD_PATH && redirectFrom ? redirectFrom : destination;
    navigate(target, { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const isNewUser = await loginWithEmail(email.trim(), password);
      await completeSignIn(isNewUser);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setFormError(null);
    setIsGoogleLoading(true);
    try {
      const isNewUser = await loginWithGoogle();
      await completeSignIn(isNewUser);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-page-heading">Welcome back</h1>
        <p className="text-secondary">Sign in to continue your study plan.</p>
      </div>

      <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        {formError && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
            {formError}
          </p>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          disabled={isBusy}
        />

        <div className="flex flex-col gap-1.5">
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            disabled={isBusy}
          />
          <Link to="/forgot-password" className="self-end text-sm font-medium text-accent hover:text-accent-hover">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} disabled={isBusy}>
          Log In
        </Button>

        <Divider label="or" />

        <GoogleButton onClick={handleGoogleLogin} isLoading={isGoogleLoading} disabled={isBusy} />
      </form>

      <p className="text-center text-secondary">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
          Create one
        </Link>
      </p>

      <p className="text-caption text-center">
        By continuing, you agree to our{' '}
        <Link to="/terms" className="font-medium text-accent hover:text-accent-hover">
          Terms &amp; Conditions
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="font-medium text-accent hover:text-accent-hover">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
