import React, { createContext, useContext, ReactNode } from 'react';
import { useNotificationManager, NotificationHookState } from '../hooks/useNotificationManager';

interface NotificationContextType extends NotificationHookState {
  // Core methods
  sendNotification: (
    title: string,
    body: string,
    category: string,
    priority?: 'low' | 'medium' | 'high',
    data?: any
  ) => Promise<string | null>;
  sendPersonalizedMotivation: (
    messageType?: 'motivational' | 'achievement' | 'inactivity_reminder' | 'daily_motivation'
  ) => Promise<string | null>;
  updatePreferences: (preferences: any) => Promise<void>;
  loadEngagementMetrics: (startDate?: Date, endDate?: Date) => Promise<void>;
  getOptimalSettings: () => Promise<{
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    frequency: 'low' | 'medium' | 'high';
    confidence: number;
  } | null>;
  
  // Activity tracking
  trackActivity: (activityType: string, data?: any) => Promise<void>;
  trackWalkStart: () => Promise<void>;
  trackWalkEnd: () => Promise<void>;
  trackGoalSet: (goalType: string, value: number) => Promise<void>;
  trackGoalAchieved: (goalType: string, value: number) => Promise<void>;
  trackJournalEntry: () => Promise<void>;
  trackScreenView: (screenName: string) => Promise<void>;
  
  // Notification management
  pauseNotifications: () => Promise<void>;
  resumeNotifications: () => Promise<void>;
  scheduleNotification: (
    type: 'inactivity_check' | 'motivational_message' | 'achievement_check' | 'daily_motivation',
    scheduledTime: Date,
    data?: any
  ) => Promise<string | null>;
  cancelScheduledNotification: (taskId: string) => Promise<void>;
  
  // Event handlers
  onNotificationOpened: (notificationId: string, category: string) => Promise<void>;
  onNotificationDismissed: (notificationId: string, category: string) => Promise<void>;
  onNotificationActionTaken: (
    notificationId: string,
    category: string,
    actionType: string
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notificationManager = useNotificationManager();

  const contextValue: NotificationContextType = {
    ...notificationManager,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;