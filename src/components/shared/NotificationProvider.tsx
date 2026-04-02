'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import NotificationBanner, {
  type NotificationVariant,
  type NotificationAction,
} from './NotificationBanner';

interface ShowNotificationParams {
  message: string;
  variant: NotificationVariant;
  action?: NotificationAction;
  duration?: number;
}

interface NotificationContextValue {
  show: (params: ShowNotificationParams) => void;
  dismiss: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Hook to show/dismiss notification banners.
 * Must be used within a <NotificationProvider>.
 *
 * Usage:
 *   const { show, dismiss } = useNotification();
 *   show({ message: 'Post published!', variant: 'published' });
 */
export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within a <NotificationProvider>');
  }
  return ctx;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const [current, setCurrent] = useState<ShowNotificationParams | null>(null);
  const [visible, setVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearExitTimer();
    setVisible(false);
    // Allow exit animation (200ms) before clearing state
    exitTimerRef.current = setTimeout(() => {
      setCurrent(null);
    }, 200);
  }, [clearExitTimer]);

  const show = useCallback(
    (params: ShowNotificationParams) => {
      clearExitTimer();
      // If a notification is already visible, replace it immediately
      // (latest wins — caller manages queue)
      setCurrent(params);
      setVisible(true);
    },
    [clearExitTimer],
  );

  return (
    <NotificationContext.Provider value={{ show, dismiss }}>
      {children}
      {current && (
        <NotificationBanner
          message={current.message}
          variant={current.variant}
          action={current.action}
          duration={current.duration}
          onDismiss={dismiss}
          visible={visible}
        />
      )}
    </NotificationContext.Provider>
  );
}
