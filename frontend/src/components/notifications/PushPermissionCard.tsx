import { useEffect, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import {
  getCurrentSubscription,
  isPushSupported,
  sendTestPushNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../services/push.service';
import { ApiRequestError } from '../../services/api';

export function PushPermissionCard() {
  const { showToast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setIsChecking(false);
      return;
    }

    setPermissionDenied(typeof Notification !== 'undefined' && Notification.permission === 'denied');

    getCurrentSubscription()
      .then((subscription) => setIsSubscribed(Boolean(subscription)))
      .finally(() => setIsChecking(false));
  }, []);

  if (!isPushSupported()) {
    return null;
  }

  const handleToggle = async () => {
    setIsBusy(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        setIsSubscribed(false);
        showToast('Push notifications turned off.', 'success');
      } else {
        await subscribeToPush();
        setIsSubscribed(true);
        setPermissionDenied(false);
        showToast('Push notifications turned on.', 'success');
      }
    } catch (err) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermissionDenied(true);
      }
      showToast(err instanceof Error ? err.message : 'Could not update push notifications.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      const delivery = await sendTestPushNotification();
      if (delivery.sent > 0) {
        showToast('Test notification sent. Check your notifications.', 'success');
      } else {
        showToast('The test notification could not be delivered. Try turning push off and on again.', 'error');
      }
    } catch (err) {
      showToast(err instanceof ApiRequestError ? err.message : 'Could not send a test notification.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          {isSubscribed ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-body font-medium">Browser push notifications</p>
          <p className="text-secondary">
            {permissionDenied
              ? 'Notifications are blocked for this site. Enable them in your browser settings to receive alerts.'
              : isSubscribed
                ? 'You will receive reminders and updates on this device.'
                : 'Turn on push notifications to get study reminders in real time.'}
          </p>
        </div>
      </div>
      {!permissionDenied && (
        <div className="flex items-center gap-2">
          {isSubscribed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSendTest}
              isLoading={isSendingTest}
              disabled={isBusy || isChecking || isSendingTest}
            >
              Send test notification
            </Button>
          )}
          <Button
            variant={isSubscribed ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggle}
            isLoading={isBusy || isChecking}
            disabled={isBusy || isChecking || isSendingTest}
          >
            {isSubscribed ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
      )}
    </Card>
  );
}
