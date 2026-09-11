import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Divider } from '../../components/ui/Divider';
import { PasswordInput } from '../../components/auth/PasswordInput';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { useAuth } from '../../hooks/useAuth';
import { isValidEmail } from '../../utils/validation';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';
import { getPostAuthPath } from '../../utils/authRedirect';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage() {
  const { registerWithEmail, loginWithGoogle, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isBusy = isSubmitting || isGoogleLoading;

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Enter your full name.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function completeSignUp(isNewUser: boolean) {
    const profile = await refreshProfile();
    navigate(getPostAuthPath(profile, isNewUser), { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await registerWithEmail(email.trim(), password, fullName.trim());
      await completeSignUp(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    setFormError(null);
    setIsGoogleLoading(true);
    try {
      const isNewUser = await loginWithGoogle();
      await completeSignUp(isNewUser);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-page-heading">Create your account</h1>
        <p className="text-secondary">Set up LearnPilot AI to start building your study plan.</p>
      </div>

      <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
        {formError && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
            {formError}
          </p>
        )}

        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={errors.fullName}
          disabled={isBusy}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          disabled={isBusy}
        />

        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            disabled={isBusy}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={errors.confirmPassword}
          disabled={isBusy}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} disabled={isBusy}>
          Create Account
        </Button>

        <Divider label="or" />

        <GoogleButton onClick={handleGoogleSignUp} isLoading={isGoogleLoading} disabled={isBusy} />
      </form>

      <p className="text-center text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Log In
        </Link>
      </p>

      <p className="text-caption text-center">
        By creating an account, you agree to our{' '}
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
