import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Types
export interface NotificationPreferences {
  enabled: boolean;
  frequency: 'low' | 'medium' | 'high'; // low: 1-2/day, medium: 3-4/day, high: 5-6/day
  activeHours: {
    morning: boolean; // 6AM - 12PM
    afternoon: boolean; // 12PM - 6PM
    evening: boolean; // 6PM - 12AM
  };
  categories: {
    motivational: boolean;
    progress: boolean;
    reminders: boolean;
    achievements: boolean;
  };
  // Additional notification type preferences
  inactivityReminders: boolean;
  motivationalMessages: boolean;
  achievementAlerts: boolean;
  walkingReminders: boolean;
  // Quiet hours settings
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  // Additional settings
  allowDuringWalks: boolean;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
}

export interface UserActivityPattern {
  userId: string;
  lastActiveTime: Date;
  dailyActiveMinutes: number;
  weeklyPattern: number[]; // Activity score for each day of week
  preferredActiveHours: number[]; // Hours when user is most active
  engagementLevel: 'low' | 'medium' | 'high';
  inactivityThreshold: number; // Minutes of inactivity before notification
}

export interface NotificationMetrics {
  sent: number;
  opened: number;
  dismissed: number;
  engagementRate: number;
  lastSent: Date;
  messageVariety: string[]; // Track message types sent
}

export interface MotivationalMessage {
  id: string;
  type: 'motivational' | 'progress' | 'reminder' | 'achievement';
  title: string;
  body: string;
  category: string;
  personalizedFor: string; // user behavior pattern
  priority: 'low' | 'medium' | 'high';
  timeContext: 'morning' | 'afternoon' | 'evening';
}

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();
  private messageHistory: Map<string, string[]> = new Map(); // userId -> recent message types

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification categories
      await this.setupNotificationCategories();

      // Start activity monitoring
      this.startActivityMonitoring();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('MOTIVATIONAL', [
        {
          identifier: 'VIEW_PROGRESS',
          buttonTitle: 'View Progress',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'START_WALK',
          buttonTitle: 'Start Walking',
          options: { opensAppToForeground: true },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('REMINDER', [
        {
          identifier: 'OPEN_APP',
          buttonTitle: 'Open App',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'DISMISS',
          buttonTitle: 'Later',
          options: { isDestructive: false },
        },
      ]);
    }
  }

  private startActivityMonitoring(): void {
    // Check for inactivity every 15 minutes
    this.activityCheckInterval = setInterval(async () => {
      await this.checkUserInactivity();
    }, 15 * 60 * 1000) as any;
  }

  private async checkUserInactivity(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return;

      const preferences = await this.getUserPreferences(userId);
      if (!preferences.enabled) return;

      const activityPattern = await this.getUserActivityPattern(userId);
      const currentHour = new Date().getHours();

      // Check if we're in active hours
      if (!this.isActiveHour(currentHour, preferences.activeHours)) return;

      // Check if user has been inactive
      const minutesSinceLastActivity = this.getMinutesSinceLastActivity(activityPattern.lastActiveTime);
      
      if (minutesSinceLastActivity >= activityPattern.inactivityThreshold) {
        await this.triggerContextAwareNotification(userId, activityPattern, preferences);
      }
    } catch (error) {
      console.error('Error checking user inactivity:', error);
    }
  }

  private isActiveHour(hour: number, activeHours: NotificationPreferences['activeHours']): boolean {
    if (hour >= 6 && hour < 12) return activeHours.morning;
    if (hour >= 12 && hour < 18) return activeHours.afternoon;
    if (hour >= 18 && hour < 24) return activeHours.evening;
    return false; // Inactive period (12AM - 6AM)
  }

  private getMinutesSinceLastActivity(lastActiveTime: Date): number {
    return Math.floor((Date.now() - lastActiveTime.getTime()) / (1000 * 60));
  }

  private async triggerContextAwareNotification(
    userId: string,
    activityPattern: UserActivityPattern,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      // Check if we've already sent too many notifications today
      const dailyLimit = this.getDailyNotificationLimit(preferences.frequency);
      const todayCount = await this.getTodayNotificationCount(userId);
      
      if (todayCount >= dailyLimit) return;

      // Generate personalized message
      const message = await this.generatePersonalizedMessage(userId, activityPattern, preferences);
      if (!message) return;

      // Check message variety to prevent fatigue
      if (!this.shouldSendMessage(userId, message.type)) return;

      // Send notification
      await this.sendNotification(message);

      // Track metrics
      await this.trackNotificationSent(userId, message);

      // Update message history
      this.updateMessageHistory(userId, message.type);

    } catch (error) {
      console.error('Error triggering context-aware notification:', error);
    }
  }

  private getDailyNotificationLimit(frequency: NotificationPreferences['frequency']): number {
    switch (frequency) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 6;
      default: return 3;
    }
  }

  private async generatePersonalizedMessage(
    userId: string,
    activityPattern: UserActivityPattern,
    preferences: NotificationPreferences
  ): Promise<MotivationalMessage | null> {
    try {
      // Get user's recent activity data
      const recentStats = await this.getRecentUserStats(userId);
      const currentHour = new Date().getHours();
      const timeContext = this.getTimeContext(currentHour);

      // Call AI message generator
      const aiMessageGenerator = await import('./ai-message-generator');
      return await aiMessageGenerator.default.generateMessage({
        userId,
        activityPattern,
        recentStats,
        timeContext,
        preferences,
        inactivityMinutes: this.getMinutesSinceLastActivity(activityPattern.lastActiveTime)
      });
    } catch (error) {
      console.error('Error generating personalized message:', error);
      return this.getFallbackMessage(activityPattern, preferences);
    }
  }

  private getTimeContext(hour: number): 'morning' | 'afternoon' | 'evening' {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }

  private getFallbackMessage(
    activityPattern: UserActivityPattern,
    preferences: NotificationPreferences
  ): MotivationalMessage {
    const timeContext = this.getTimeContext(new Date().getHours());
    const messages = {
      morning: {
        title: "Good Morning! 🌅",
        body: "Start your day with a refreshing walk. Every step counts!"
      },
      afternoon: {
        title: "Afternoon Boost! ⚡",
        body: "Take a break and get moving. Your body will thank you!"
      },
      evening: {
        title: "Evening Wind Down 🌙",
        body: "End your day with a peaceful walk. Perfect for reflection!"
      }
    };

    return {
      id: `fallback_${Date.now()}`,
      type: 'motivational',
      title: messages[timeContext].title,
      body: messages[timeContext].body,
      category: 'general',
      personalizedFor: activityPattern.engagementLevel,
      priority: 'medium',
      timeContext
    };
  }

  private shouldSendMessage(userId: string, messageType: string): boolean {
    const history = this.messageHistory.get(userId) || [];
    const recentMessages = history.slice(-5); // Check last 5 messages
    
    // Don't send if same type was sent in last 3 messages
    const recentTypeCount = recentMessages.filter(type => type === messageType).length;
    return recentTypeCount < 2;
  }

  private updateMessageHistory(userId: string, messageType: string): void {
    const history = this.messageHistory.get(userId) || [];
    history.push(messageType);
    
    // Keep only last 10 messages
    if (history.length > 10) {
      history.shift();
    }
    
    this.messageHistory.set(userId, history);
  }

  public async sendNotification(message: MotivationalMessage): Promise<string> {
    const notificationContent: Notifications.NotificationContentInput = {
      title: message.title,
      body: message.body,
      data: {
        messageId: message.id,
        type: message.type,
        category: message.category,
        priority: message.priority
      },
      categoryIdentifier: message.type.toUpperCase(),
      priority: message.priority === 'high' ? 
        Notifications.AndroidNotificationPriority.HIGH : 
        Notifications.AndroidNotificationPriority.DEFAULT,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Send immediately
    });

    return notificationId;
  }

  // User preference management
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(`notification_prefs_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting user preferences:', error);
    }

    // Default preferences
    return {
      enabled: true,
      frequency: 'medium',
      activeHours: {
        morning: true,
        afternoon: true,
        evening: true
      },
      categories: {
        motivational: true,
        progress: true,
        reminders: true,
        achievements: true
      },
      // Additional notification type preferences
      inactivityReminders: true,
      motivationalMessages: true,
      achievementAlerts: true,
      walkingReminders: true,
      // Quiet hours settings
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      // Additional settings
      allowDuringWalks: false,
      vibrationEnabled: true,
      soundEnabled: true
    };
  }

  async updateUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(`notification_prefs_${userId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  // Activity pattern management
  async getUserActivityPattern(userId: string): Promise<UserActivityPattern> {
    try {
      // Get from database or calculate from recent activity
      if (!supabase) {
        console.error('Supabase client not initialized');
        return this.getDefaultActivityPattern(userId);
      }
      
      const { data, error } = await supabase
        .from('user_activity_patterns')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return this.calculateActivityPattern(userId);
      }

      return {
        userId: data.user_id,
        lastActiveTime: new Date(data.last_active_time),
        dailyActiveMinutes: data.daily_active_minutes,
        weeklyPattern: data.weekly_pattern,
        preferredActiveHours: data.preferred_active_hours,
        engagementLevel: data.engagement_level,
        inactivityThreshold: data.inactivity_threshold || 60
      };
    } catch (error) {
      console.error('Error getting activity pattern:', error);
      return this.getDefaultActivityPattern(userId);
    }
  }

  private async calculateActivityPattern(userId: string): Promise<UserActivityPattern> {
    // Calculate from recent walking sessions and app usage
    // This would integrate with existing WalkingContext data
    return this.getDefaultActivityPattern(userId);
  }

  private getDefaultActivityPattern(userId: string): UserActivityPattern {
    return {
      userId,
      lastActiveTime: new Date(),
      dailyActiveMinutes: 30,
      weeklyPattern: [0.7, 0.8, 0.6, 0.7, 0.8, 0.9, 0.5], // Mon-Sun activity scores
      preferredActiveHours: [7, 8, 12, 13, 18, 19], // Common active hours
      engagementLevel: 'medium',
      inactivityThreshold: 60 // 1 hour
    };
  }

  async updateUserActivity(userId: string): Promise<void> {
    try {
      // Update last active time
      const pattern = await this.getUserActivityPattern(userId);
      pattern.lastActiveTime = new Date();
      
      // Save to database
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      await supabase
        .from('user_activity_patterns')
        .upsert({
          user_id: userId,
          last_active_time: pattern.lastActiveTime.toISOString(),
          daily_active_minutes: pattern.dailyActiveMinutes,
          weekly_pattern: pattern.weeklyPattern,
          preferred_active_hours: pattern.preferredActiveHours,
          engagement_level: pattern.engagementLevel,
          inactivity_threshold: pattern.inactivityThreshold
        });
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  // Metrics and tracking
  private async trackNotificationSent(userId: string, message: MotivationalMessage): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      await supabase
        .from('notification_metrics')
        .insert({
          user_id: userId,
          message_id: message.id,
          message_type: message.type,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
    } catch (error) {
      console.error('Error tracking notification:', error);
    }
  }

  async trackNotificationEngagement(messageId: string, action: 'opened' | 'dismissed'): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      await supabase
        .from('notification_metrics')
        .update({
          status: action,
          engaged_at: new Date().toISOString()
        })
        .eq('message_id', messageId);
    } catch (error) {
      console.error('Error tracking engagement:', error);
    }
  }

  private async getTodayNotificationCount(userId: string): Promise<number> {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return 0;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('notification_metrics')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('sent_at', `${today}T00:00:00.000Z`)
        .lt('sent_at', `${today}T23:59:59.999Z`);

      return count || 0;
    } catch (error) {
      console.error('Error getting today notification count:', error);
      return 0;
    }
  }

  // Utility methods
  private async getCurrentUserId(): Promise<string | null> {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return null;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  private async getRecentUserStats(userId: string): Promise<any> {
    try {
      // Get recent walking stats from existing database
      if (!supabase) {
        console.error('Supabase client not initialized');
        return [];
      }
      
      const { data } = await supabase
        .from('walking_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error getting recent stats:', error);
      return [];
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.destroy();
  }

  destroy(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    this.scheduledNotifications.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.scheduledNotifications.clear();

    this.isInitialized = false;
  }
}

export default NotificationService;