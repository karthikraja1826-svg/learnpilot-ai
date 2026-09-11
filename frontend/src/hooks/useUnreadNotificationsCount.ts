import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getUnreadCount } from '../services/notifications.service';

const POLL_INTERVAL_MS = 30000;

export function useUnreadNotificationsCount() {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const result = await getUnreadCount();
      setCount(result);
    } catch {
      // Silently ignore transient failures; the next poll will retry.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }

    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, refresh]);

  return { count, refresh };
}
