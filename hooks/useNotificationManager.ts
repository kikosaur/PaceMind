import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationManager } from '../services/notification-manager';
import { useAuth } from '../contexts/AuthContext';

export interface NotificationHookState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: any | null;
  engagementMetrics: any | null;
}

export const useNotificationManager = () => {
  const { user } = useAuth();
  const notificationManagerRef = useRef<NotificationManager | null>(null);
  const [state, setState] = useState<NotificationHookState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    preferences: null,
    engagementMetrics: null,
  });

  // Initialize notification manager
  useEffect(() => {
    if (!user) return;

    const initializeNotificationManager = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Create notification manager instance
        const manager = new NotificationManager({
          enableAnalytics: true,
          enableScheduling: true,
          enableIntegration: true,
          debugMode: __DEV__,
        });

        await manager.initialize();
        notificationManagerRef.current = manager;

        // Load user preferences
        const preferences = await manager.getUserPreferences();

        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          preferences,
        }));

        console.log('NotificationManager initialized successfully');
      } catch (error) {
        console.error('Failed to initialize NotificationManager:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize notifications',
        }));
      }
    };

    initializeNotificationManager();

    // Cleanup on unmount or user change
    return () => {
      if (notificationManagerRef.current) {
        notificationManagerRef.current.cleanup();
        notificationManagerRef.current = null;
      }
    };
  }, [user]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!notificationManagerRef.current) return;

      if (nextAppState === 'active') {
        // App became active - track activity
        await notificationManagerRef.current.trackActivity('app_open');
      } else if (nextAppState === 'background') {
        // App went to background - track activity
        await notificationManagerRef.current.trackActivity('app_background');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // API methods
  const sendNotification = async (
    title: string,
    body: string,
    category: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    data?: any
  ): Promise<string | null> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return null;
    }

    try {
      return await notificationManagerRef.current.sendNotification(title, body, category, priority, data);
    } catch (error) {
      console.error('Failed to send notification:', error);
      return null;
    }
  };

  const sendPersonalizedMotivation = async (
    messageType: 'motivational' | 'achievement' | 'inactivity_reminder' | 'daily_motivation' = 'motivational'
  ): Promise<string | null> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return null;
    }

    try {
      return await notificationManagerRef.current.sendPersonalizedMotivation(messageType);
    } catch (error) {
      console.error('Failed to send personalized motivation:', error);
      return null;
    }
  };

  const updatePreferences = async (preferences: any): Promise<void> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return;
    }

    try {
      await notificationManagerRef.current.updateUserPreferences(preferences);
      setState(prev => ({ ...prev, preferences }));
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      }));
    }
  };

  const loadEngagementMetrics = async (startDate?: Date, endDate?: Date): Promise<void> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return;
    }

    try {
      const metrics = await notificationManagerRef.current.getEngagementMetrics(startDate, endDate);
      setState(prev => ({ ...prev, engagementMetrics: metrics }));
    } catch (error) {
      console.error('Failed to load engagement metrics:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load metrics',
      }));
    }
  };

  const getOptimalSettings = async (): Promise<{
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    frequency: 'low' | 'medium' | 'high';
    confidence: number;
  } | null> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return null;
    }

    try {
      return await notificationManagerRef.current.getOptimalNotificationSettings();
    } catch (error) {
      console.error('Failed to get optimal settings:', error);
      return null;
    }
  };

  const trackActivity = async (activityType: string, data?: any): Promise<void> => {
    if (!notificationManagerRef.current) return;

    try {
      await notificationManagerRef.current.trackActivity(activityType, data);
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  };

  const pauseNotifications = async (): Promise<void> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return;
    }

    try {
      await notificationManagerRef.current.pauseNotifications();
      const updatedPreferences = await notificationManagerRef.current.getUserPreferences();
      setState(prev => ({ ...prev, preferences: updatedPreferences }));
    } catch (error) {
      console.error('Failed to pause notifications:', error);
    }
  };

  const resumeNotifications = async (): Promise<void> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return;
    }

    try {
      await notificationManagerRef.current.resumeNotifications();
      const updatedPreferences = await notificationManagerRef.current.getUserPreferences();
      setState(prev => ({ ...prev, preferences: updatedPreferences }));
    } catch (error) {
      console.error('Failed to resume notifications:', error);
    }
  };

  const scheduleNotification = async (
    type: 'inactivity_check' | 'motivational_message' | 'achievement_check' | 'daily_motivation',
    scheduledTime: Date,
    data?: any
  ): Promise<string | null> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return null;
    }

    try {
      return await notificationManagerRef.current.scheduleNotification(type, scheduledTime, data);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  };

  const cancelScheduledNotification = async (taskId: string): Promise<void> => {
    if (!notificationManagerRef.current) {
      console.warn('NotificationManager not initialized');
      return;
    }

    try {
      await notificationManagerRef.current.cancelScheduledNotification(taskId);
    } catch (error) {
      console.error('Failed to cancel scheduled notification:', error);
    }
  };

  // Event handlers for notification interactions
  const onNotificationOpened = async (notificationId: string, category: string): Promise<void> => {
    if (!notificationManagerRef.current) return;

    try {
      await notificationManagerRef.current.onNotificationOpened(notificationId, category);
    } catch (error) {
      console.error('Failed to track notification opened:', error);
    }
  };

  const onNotificationDismissed = async (notificationId: string, category: string): Promise<void> => {
    if (!notificationManagerRef.current) return;

    try {
      await notificationManagerRef.current.onNotificationDismissed(notificationId, category);
    } catch (error) {
      console.error('Failed to track notification dismissed:', error);
    }
  };

  const onNotificationActionTaken = async (
    notificationId: string,
    category: string,
    actionType: string
  ): Promise<void> => {
    if (!notificationManagerRef.current) return;

    try {
      await notificationManagerRef.current.onNotificationActionTaken(notificationId, category, actionType);
    } catch (error) {
      console.error('Failed to track notification action:', error);
    }
  };

  // Convenience methods for common activities
  const trackWalkStart = () => trackActivity('walk_start');
  const trackWalkEnd = () => trackActivity('walk_end');
  const trackGoalSet = (goalType: string, value: number) => 
    trackActivity('goal_set', { goalType, value });
  const trackGoalAchieved = (goalType: string, value: number) => 
    trackActivity('goal_achieved', { goalType, value });
  const trackJournalEntry = () => trackActivity('journal_entry');
  const trackScreenView = (screenName: string) => 
    trackActivity('screen_view', { screenName });

  return {
    // State
    ...state,
    
    // Core methods
    sendNotification,
    sendPersonalizedMotivation,
    updatePreferences,
    loadEngagementMetrics,
    getOptimalSettings,
    
    // Activity tracking
    trackActivity,
    trackWalkStart,
    trackWalkEnd,
    trackGoalSet,
    trackGoalAchieved,
    trackJournalEntry,
    trackScreenView,
    
    // Notification management
    pauseNotifications,
    resumeNotifications,
    scheduleNotification,
    cancelScheduledNotification,
    
    // Event handlers
    onNotificationOpened,
    onNotificationDismissed,
    onNotificationActionTaken,
    
    // Utility
    manager: notificationManagerRef.current,
  };
};