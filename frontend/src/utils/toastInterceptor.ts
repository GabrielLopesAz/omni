import { toast } from '@/components/ui/sonner';

type ToastFunction = (message: string | React.ReactNode, data?: Record<string, unknown>) => string | number;

// Funções originais do toast
let originalSuccess: ToastFunction | null = null;
let originalError: ToastFunction | null = null;
let originalWarning: ToastFunction | null = null;
let originalInfo: ToastFunction | null = null;

export interface NotificationInterceptorSettings {
  enabled: boolean;
  showSuccess: boolean;
  showError: boolean;
  showWarning: boolean;
  showInfo: boolean;
  duration: number;
}

// Configurações atuais
let currentSettings: NotificationInterceptorSettings = {
  enabled: true,
  showSuccess: true,
  showError: true,
  showWarning: true,
  showInfo: true,
  duration: 5
};

// Função para verificar se um tipo de notificação está habilitado
function isNotificationEnabled(type: 'success' | 'error' | 'warning' | 'info'): boolean {
  if (!currentSettings.enabled) return false;
  
  switch (type) {
    case 'success':
      return currentSettings.showSuccess;
    case 'error':
      return currentSettings.showError;
    case 'warning':
      return currentSettings.showWarning;
    case 'info':
      return currentSettings.showInfo;
    default:
      return false;
  }
}

// Função para interceptar os toasts
export function interceptToasts(settings: NotificationInterceptorSettings) {
  currentSettings = settings;
  
  // Salvar funções originais apenas uma vez
  if (!originalSuccess) {
    originalSuccess = toast.success as ToastFunction;
    originalError = toast.error as ToastFunction;
    originalWarning = toast.warning as ToastFunction;
    originalInfo = toast.info as ToastFunction;
  }

  // Sobrescrever toast.success
  toast.success = (message: string | React.ReactNode, options?: Record<string, unknown>) => {
    if (!isNotificationEnabled('success')) return '';
    
    const duration = options?.duration || currentSettings.duration * 1000;
    return originalSuccess ? originalSuccess(message, { ...options, duration }) : '';
  };

  // Sobrescrever toast.error
  toast.error = (message: string | React.ReactNode, options?: Record<string, unknown>) => {
    if (!isNotificationEnabled('error')) return '';
    
    const duration = options?.duration || currentSettings.duration * 1000;
    return originalError ? originalError(message, { ...options, duration }) : '';
  };

  // Sobrescrever toast.warning
  toast.warning = (message: string | React.ReactNode, options?: Record<string, unknown>) => {
    if (!isNotificationEnabled('warning')) return '';
    
    const duration = options?.duration || currentSettings.duration * 1000;
    return originalWarning ? originalWarning(message, { ...options, duration }) : '';
  };

  // Sobrescrever toast.info
  toast.info = (message: string | React.ReactNode, options?: Record<string, unknown>) => {
    if (!isNotificationEnabled('info')) return '';
    
    const duration = options?.duration || currentSettings.duration * 1000;
    return originalInfo ? originalInfo(message, { ...options, duration }) : '';
  };
}

// Função para restaurar as funções originais
export function restoreToasts() {
  if (originalSuccess && originalError && originalWarning && originalInfo) {
    toast.success = originalSuccess;
    toast.error = originalError;
    toast.warning = originalWarning;
    toast.info = originalInfo;
  }
}