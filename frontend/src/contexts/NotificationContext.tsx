import React, { createContext, useContext, useState, useEffect } from 'react';

interface NotificationSettings {
  enabled: boolean;
  showSuccess: boolean;
  showError: boolean;
  showWarning: boolean;
  showInfo: boolean;
  soundEnabled: boolean;
  duration: number; // em segundos
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  toggleNotifications: () => void;
  isNotificationEnabled: (type: 'success' | 'error' | 'warning' | 'info') => boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  showSuccess: true,
  showError: true,
  showWarning: true,
  showInfo: true,
  soundEnabled: false,
  duration: 5
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    // Carregar configurações do localStorage
    const saved = localStorage.getItem('notification-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Salvar configurações no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleNotifications = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const isNotificationEnabled = (type: 'success' | 'error' | 'warning' | 'info') => {
    if (!settings.enabled) return false;
    
    switch (type) {
      case 'success':
        return settings.showSuccess;
      case 'error':
        return settings.showError;
      case 'warning':
        return settings.showWarning;
      case 'info':
        return settings.showInfo;
      default:
        return false;
    }
  };

  return (
    <NotificationContext.Provider value={{
      settings,
      updateSettings,
      toggleNotifications,
      isNotificationEnabled
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 