import React, { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { interceptToasts } from '@/utils/toastInterceptor';

interface NotificationWrapperProps {
  children: React.ReactNode;
}

export function NotificationWrapper({ children }: NotificationWrapperProps) {
  const { settings } = useNotifications();
  
  // Interceptar toasts sempre que as configurações mudarem
  useEffect(() => {
    interceptToasts(settings);
  }, [settings]);
  
  return <>{children}</>;
} 