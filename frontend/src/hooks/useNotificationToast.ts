import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from '@/components/ui/sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
}

export function useNotificationToast() {
  const { settings, isNotificationEnabled } = useNotifications();

  const showSuccess = (message: string, options?: ToastOptions) => {
    if (!isNotificationEnabled('success')) return;
    
    toast.success(message, {
      description: options?.description,
      duration: (options?.duration || settings.duration) * 1000,
    });
  };

  const showError = (message: string, options?: ToastOptions) => {
    if (!isNotificationEnabled('error')) return;
    
    toast.error(message, {
      description: options?.description,
      duration: (options?.duration || settings.duration) * 1000,
    });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    if (!isNotificationEnabled('warning')) return;
    
    toast.warning(message, {
      description: options?.description,
      duration: (options?.duration || settings.duration) * 1000,
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    if (!isNotificationEnabled('info')) return;
    
    toast.info(message, {
      description: options?.description,
      duration: (options?.duration || settings.duration) * 1000,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    isEnabled: settings.enabled,
    settings
  };
} 