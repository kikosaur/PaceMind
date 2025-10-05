import { NotificationService } from './notification-service';
import aiMessageGenerator from './ai-message-generator';
import { ActivityTracker } from './activity-tracker';
import { NotificationIntegration } from './notification-integration';
import { NotificationScheduler } from './notification-scheduler';
import { NotificationAnalytics } from './notification-analytics';

export interface NotificationManagerConfig {
  enableAnalytics: boolean;
  enableScheduling: boolean;
  enableIntegration: boolean;
  debugMode: boolean;
}

export class NotificationManager {
  private notificationService: NotificationService;
  private messageGenerator: typeof aiMessageGenerator;
  private activityTracker: ActivityTracker;
  private integration?: NotificationIntegration;
  private scheduler?: NotificationScheduler;
  private analytics?: NotificationAnalytics;
  private isInitialized = false;
  private config: NotificationManagerConfig;

  constructor(config: Partial<NotificationManagerConfig> = {}) {
    this.config = {
      enableAnalytics: true,
      enableScheduling: true,
      enableIntegration: true,
      debugMode: false,
      ...config,
    };

    // Initialize core services
    this.notificationService = NotificationService.getInstance();
    this.messageGenerator = aiMessageGenerator;
    this.activityTracker = ActivityTracker.getInstance();
    
    // Initialize optional services based on config
    if (this.config.enableIntegration) {
      this.integration = NotificationIntegration.getInstance();
    }

    if (this.config.enableScheduling) {
      this.scheduler = new NotificationScheduler(
        this.notificationService,
        this.activityTracker,
        this.messageGenerator
      );
    }

    if (this.config.enableAnalytics) {
      this.analytics = new NotificationAnalytics();
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.log('Initializing NotificationManager...');

      // Initialize core services
    await this.notificationService.initialize();
    // AIMessageGenerator doesn't have initialize method
    await this.activityTracker.initialize('default');

    // Initialize optional services
    if (this.config.enableAnalytics) {
      await this.analytics?.initialize();
    }

    if (this.config.enableScheduling) {
      await this.scheduler?.initialize();
    }

    if (this.config.enableIntegration) {
      await this.integration?.initialize('default');
    }

      // Set up event listeners for analytics
      if (this.config.enableAnalytics) {
        this.setupAnalyticsTracking();
      }

      this.isInitialized = true;
      this.log('NotificationManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationManager:', error);
      throw error;
    }
  }

  // Public API methods
  async sendNotification(
    title: string,
    body: string,
    category: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    data?: any
  ): Promise<string> {
    this.ensureInitialized();

    const notificationId = await this.notificationService.sendNotification({
      id: `notification_${Date.now()}`,
      type: 'motivational',
      title,
      body,
      category,
      personalizedFor: 'default',
      priority,
      timeContext: this.getTimeOfDay(),
    });

    // Track analytics
      if (this.config.enableAnalytics) {
        const userId = await this.getCurrentUserId();
        if (userId) {
          await this.analytics?.trackNotificationEvent(
            userId,
            notificationId,
            'sent',
            category as any,
            {
              title,
              body,
              timeOfDay: this.getTimeOfDay(),
            }
          );
        }
      }

    return notificationId;
  }

  async sendPersonalizedMotivation(
    messageType: 'motivational' | 'achievement' | 'inactivity_reminder' | 'daily_motivation' = 'motivational'
  ): Promise<string | null> {
    this.ensureInitialized();

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        this.log('No user ID available for personalized motivation');
        return null;
      }

      // Check user preferences
      const preferences = await this.notificationService.getUserPreferences(userId);
      if (!preferences.enabled) {
        this.log('Notifications disabled by user');
        return null;
      }

      // Generate personalized message
      const engagementScore = await this.activityTracker.getEngagementScore();
      const message = await this.messageGenerator.generateMessage({
        userId: 'default',
        activityPattern: {
          userId: 'default',
          lastActiveTime: new Date(),
          dailyActiveMinutes: 0,
          weeklyPattern: [],
          preferredActiveHours: [],
          engagementLevel: this.getEngagementLevel(engagementScore),
          inactivityThreshold: 60
        },
        recentStats: [],
        timeContext: this.getTimeOfDay(),
        inactivityMinutes: 0,
        preferences: {
          enabled: true,
          frequency: 'medium',
          activeHours: { morning: true, afternoon: true, evening: true },
          categories: {
            motivational: true,
            progress: true,
            reminders: true,
            achievements: true
          },
          inactivityReminders: true,
          motivationalMessages: true,
          achievementAlerts: true,
          walkingReminders: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          allowDuringWalks: true,
          vibrationEnabled: true,
          soundEnabled: true
        }
      });

      // Send notification
      const notificationId = await this.notificationService.sendNotification({
        id: message?.id || `notification_${Date.now()}`,
        type: 'motivational',
        title: this.getTitleForMessageType(messageType),
        body: message?.body || 'Stay motivated!',
        category: messageType,
        personalizedFor: 'default',
        priority: 'medium',
        timeContext: this.getTimeOfDay(),
      });

      // Track analytics
      if (this.config.enableAnalytics) {
        await this.analytics?.trackNotificationEvent(
          userId,
          notificationId,
          'sent',
          messageType as any,
          {
            title: this.getTitleForMessageType(messageType),
            body: message?.body || 'Stay motivated!',
            engagementScore,
            timeOfDay: this.getTimeOfDay(),
          }
        );
      }

      return notificationId;
    } catch (error) {
      console.error('Failed to send personalized motivation:', error);
      return null;
    }
  }

  async updateUserPreferences(preferences: any): Promise<void> {
    this.ensureInitialized();
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }
    await this.notificationService.updateUserPreferences(userId, preferences);
  }

  async getUserPreferences(): Promise<any> {
    this.ensureInitialized();
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }
    return await this.notificationService.getUserPreferences(userId);
  }

  async getEngagementMetrics(startDate?: Date, endDate?: Date): Promise<any> {
    this.ensureInitialized();
    
    if (!this.config.enableAnalytics) {
      throw new Error('Analytics not enabled');
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }

    return await this.analytics?.getEngagementMetrics(userId, startDate, endDate) || null;
  }

  async getUserEngagementProfile(): Promise<any> {
    this.ensureInitialized();
    
    if (!this.config.enableAnalytics) {
      throw new Error('Analytics not enabled');
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }

    return await this.analytics?.getUserEngagementProfile(userId) || null;
  }

  async getOptimalNotificationSettings(): Promise<{
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    frequency: 'low' | 'medium' | 'high';
    confidence: number;
  }> {
    this.ensureInitialized();
    
    if (!this.config.enableAnalytics) {
      throw new Error('Analytics not enabled');
    }

    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }

    const [timeResult, frequencyResult] = await Promise.all([
      this.analytics?.getOptimalNotificationTime(userId) || Promise.resolve('09:00'),
      this.analytics?.getOptimalNotificationFrequency(userId) || Promise.resolve('medium'),
    ]);

    return {
      timeOfDay: typeof timeResult === 'string' ? 
        (timeResult as 'morning' | 'afternoon' | 'evening') : 
        timeResult.timeOfDay,
      frequency: typeof frequencyResult === 'string' ? 
        (frequencyResult as 'low' | 'medium' | 'high') : 
        frequencyResult.frequency,
      confidence: typeof timeResult === 'string' ? 0.5 : timeResult.confidence,
    };
  }

  async scheduleNotification(
    type: 'inactivity_check' | 'motivational_message' | 'achievement_check' | 'daily_motivation',
    scheduledTime: Date,
    data?: any
  ): Promise<string> {
    this.ensureInitialized();
    
    if (!this.config.enableScheduling) {
      throw new Error('Scheduling not enabled');
    }

    return await this.scheduler?.addOneTimeTask(type, scheduledTime, data) || 'default_task_id';
  }

  async cancelScheduledNotification(taskId: string): Promise<void> {
    this.ensureInitialized();
    
    if (!this.config.enableScheduling) {
      throw new Error('Scheduling not enabled');
    }

    await this.scheduler?.removeTask(taskId);
  }

  async getScheduledNotifications(): Promise<any[]> {
    this.ensureInitialized();
    
    if (!this.config.enableScheduling) {
      throw new Error('Scheduling not enabled');
    }

    return this.scheduler?.getScheduledTasks() || [];
  }

  async pauseNotifications(): Promise<void> {
    this.ensureInitialized();
    
    if (this.config.enableScheduling) {
      await this.scheduler?.pauseScheduler();
    }
    
    // Update user preferences to disable notifications
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }
    const preferences = await this.notificationService.getUserPreferences(userId);
    await this.notificationService.updateUserPreferences(userId, {
      ...preferences,
      enabled: false,
    });
  }

  async resumeNotifications(): Promise<void> {
    this.ensureInitialized();
    
    // Update user preferences to enable notifications
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No user ID available');
    }
    const preferences = await this.notificationService.getUserPreferences(userId);
    await this.notificationService.updateUserPreferences(userId, {
      ...preferences,
      enabled: true,
    });
    
    if (this.config.enableScheduling) {
      await this.scheduler?.resumeScheduler();
    }
  }

  async trackActivity(activityType: string, data?: any): Promise<void> {
    this.ensureInitialized();
    
    await this.activityTracker.trackActivity({
      type: activityType as any,
      timestamp: new Date(),
      metadata: data,
    });

    // Integration will handle automatic notifications based on activity
  }

  async getActivityStats(): Promise<any> {
    this.ensureInitialized();
    return await this.activityTracker.getTodayStats();
  }

  // Event handlers for analytics tracking
  async onNotificationOpened(notificationId: string, category: string): Promise<void> {
    if (!this.config.enableAnalytics) return;

    const userId = await this.getCurrentUserId();
    if (!userId) return;

    await this.analytics?.trackNotificationEvent(
      userId,
      notificationId,
      'opened',
      category as any
    );
  }

  async onNotificationDismissed(notificationId: string, category: string): Promise<void> {
    if (!this.config.enableAnalytics) return;

    const userId = await this.getCurrentUserId();
    if (!userId) return;

    await this.analytics?.trackNotificationEvent(
      userId,
      notificationId,
      'dismissed',
      category as any
    );
  }

  async onNotificationActionTaken(
    notificationId: string,
    category: string,
    actionType: string
  ): Promise<void> {
    if (!this.config.enableAnalytics) return;

    const userId = await this.getCurrentUserId();
    if (!userId) return;

    await this.analytics?.trackNotificationEvent(
      userId,
      notificationId,
      'action_taken',
      category as any,
      { actionType }
    );
  }

  // Utility methods
  private setupAnalyticsTracking(): void {
    // This would set up listeners for notification events
    // In a real implementation, you'd integrate with the platform's notification system
    this.log('Analytics tracking set up');
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      // This should integrate with your auth system
      // For now, we'll use a placeholder
      return 'current_user_id';
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      return null;
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }

  private getEngagementLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 0.3) return 'low';
    if (score < 0.7) return 'medium';
    return 'high';
  }

  private getTitleForMessageType(messageType: string): string {
    switch (messageType) {
      case 'motivational':
        return 'Stay Motivated! 💪';
      case 'achievement':
        return 'Achievement Unlocked! 🎉';
      case 'inactivity_reminder':
        return 'Time to Move! 🚶‍♂️';
      case 'daily_motivation':
        return 'Good Morning! 🌅';
      default:
        return 'AmiOkiks';
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('NotificationManager not initialized. Call initialize() first.');
    }
  }

  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[NotificationManager] ${message}`);
    }
  }

  async cleanup(): Promise<void> {
    this.log('Cleaning up NotificationManager...');

    if (this.config.enableAnalytics) {
      await this.analytics?.cleanup();
    }

    if (this.config.enableScheduling) {
      await this.scheduler?.cleanup();
    }

    if (this.config.enableIntegration) {
      await this.integration?.cleanup();
    }

    await this.activityTracker.cleanup();
    await this.notificationService.cleanup();

    this.isInitialized = false;
    this.log('NotificationManager cleaned up');
  }
}