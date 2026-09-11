import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, User as UserIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';

export function AccountSection() {
  const { profile, logout, sendPasswordReset } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordReset(profile.email);
      showToast('Password reset email sent.', 'success');
    } catch (err) {
      showToast(getAuthErrorMessage(err), 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      showToast(getAuthErrorMessage(err), 'error');
      setIsLoggingOut(false);
    }
  };

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-section-heading">Account</h2>
        <p className="text-secondary">
          {profile?.authProvider === 'google.com' ? 'Signed in with Google.' : 'Signed in with email and password.'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="secondary" size="sm" className="justify-start" onClick={() => navigate('/app/profile')}>
          <UserIcon className="h-3.5 w-3.5" />
          Edit profile
        </Button>

        {profile?.authProvider === 'password' && (
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={handlePasswordReset}
            isLoading={isSendingReset}
            disabled={isSendingReset}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Send password reset email
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          className="justify-start"
          onClick={handleLogout}
          isLoading={isLoggingOut}
          disabled={isLoggingOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </Button>
      </div>
    </Card>
  );
}
