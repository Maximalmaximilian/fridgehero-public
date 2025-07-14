import React, { createContext, useContext, useEffect, useState } from 'react';
import { enhancedNotificationService } from '../lib/enhanced-notifications';
import { NotificationPermissionManager, PermissionState } from '../lib/notification-permissions';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  isInitialized: boolean;
  permissionState: PermissionState;
  preferences: any;
  requestPermissions: () => Promise<PermissionState>;
  checkPermissions: () => Promise<PermissionState>;
  refreshPreferences: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>({
    hasPermission: false,
    canAskAgain: true,
    hasAskedBefore: false,
    isFirstTime: true
  });
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    if (user) {
      initializeNotifications();
    }
  }, [user]);

  const initializeNotifications = async () => {
    try {
      console.log('🔔 NotificationContext: Initializing notifications...');
      
      // Initialize the notification service
      await enhancedNotificationService.initialize();
      
      // Check permissions
      await checkPermissions();
      
      // Load preferences
      await refreshPreferences();
      
      setIsInitialized(true);
      console.log('🔔 NotificationContext: Notifications initialized');
    } catch (error) {
      console.error('🔔 NotificationContext: Failed to initialize notifications:', error);
      setIsInitialized(false);
    }
  };

  const checkPermissions = async (): Promise<PermissionState> => {
    try {
      const state = await NotificationPermissionManager.checkPermissionStatus();
      setPermissionState(state);
      
      // If this is the first time and user hasn't been asked yet, 
      // we could optionally auto-request here, but it's better to wait
      // for user to try to enable a notification type
      
      return state;
    } catch (error) {
      console.error('🔔 NotificationContext: Failed to check permissions:', error);
      return permissionState;
    }
  };

  const requestPermissions = async (): Promise<PermissionState> => {
    try {
      const state = await NotificationPermissionManager.requestPermissionsWithExplanation();
      setPermissionState(state);
      return state;
    } catch (error) {
      console.error('🔔 NotificationContext: Failed to request permissions:', error);
      return permissionState;
    }
  };

  const refreshPreferences = async () => {
    try {
      const prefs = enhancedNotificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('🔔 NotificationContext: Failed to load preferences:', error);
    }
  };

  const value: NotificationContextType = {
    isInitialized,
    permissionState,
    preferences,
    requestPermissions,
    checkPermissions,
    refreshPreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 