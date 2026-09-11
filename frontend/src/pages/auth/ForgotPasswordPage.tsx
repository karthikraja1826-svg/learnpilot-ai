import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { isValidEmail } from '../../utils/validation';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';
import { FirebaseError } from 'firebase/app';

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(undefined);

    setIsSubmitting(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setIsSent(true);
    } catch (submitError) {
      if (submitError instanceof FirebaseError && submitError.code === 'auth/user-not-found') {
        setIsSent(true);
      } else {
        setFormError(getAuthErrorMessage(submitError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-page-heading">Check your inbox</h1>
          <p className="text-secondary">
            If an account exists for <span className="text-text-primary">{email.trim()}</span>, we&apos;ve sent a
            link to reset your password.
          </p>
        </div>
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-page-heading">Reset your password</h1>
        <p className="text-secondary">We&apos;ll send you a link to get back into your account.</p>
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
          error={error}
          disabled={isSubmitting}
        />

        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} disabled={isSubmitting}>
          Send Reset Link
        </Button>
      </form>

      <p className="text-center text-secondary">
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
