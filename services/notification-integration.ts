import { NotificationService } from './notification-service';
import { AIMessageGenerator } from './ai-message-generator';
import { ActivityTracker } from './activity-tracker';
import { MotivationService } from '../lib/motivation-service';
import { supabase } from '../lib/supabase';

export interface NotificationIntegrationConfig {
  enableWalkingIntegration: boolean;
  enableMotivationIntegration: boolean;
  enableGoalIntegration: boolean;
  enableJournalIntegration: boolean;
}

export class NotificationIntegration {
  private static instance: NotificationIntegration;
  private notificationService: NotificationService;
  private messageGenerator: AIMessageGenerator;
  private activityTracker: ActivityTracker;
  private motivationService: MotivationService;
  private config: NotificationIntegrationConfig;
  private isInitialized: boolean = false;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
    this.messageGenerator = new AIMessageGenerator();
    this.activityTracker = ActivityTracker.getInstance();
    this.motivationService = new MotivationService();
    this.config = {
      enableWalkingIntegration: true,
      enableMotivationIntegration: true,
      enableGoalIntegration: true,
      enableJournalIntegration: true
    };
  }

  public static getInstance(): NotificationIntegration {
    if (!NotificationIntegration.instance) {
      NotificationIntegration.instance = new NotificationIntegration();
    }
    return NotificationIntegration.instance;
  }

  /**
   * Initialize the notification integration system
   */
  public async initialize(userId: string, config?: Partial<NotificationIntegrationConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize all services
      await this.notificationService.initialize();
      // AIMessageGenerator doesn't have an initialize method
      await this.activityTracker.initialize(userId);
      // MotivationService doesn't have an initialize method

      // Set up integrations
      await this.setupWalkingIntegration(userId);
      await this.setupMotivationIntegration(userId);
      await this.setupGoalIntegration(userId);
      await this.setupJournalIntegration(userId);

      this.isInitialized = true;
    } catch (error) {
      console.warn('NotificationIntegration initialization failed:', error);
    }
  }

  /**
   * Track activity from WalkingContext
   */
  public async trackWalkingActivity(activityType: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.config.enableWalkingIntegration) return;

    try {
      await this.activityTracker.trackActivity({
        type: activityType as any,
        timestamp: new Date(),
        metadata
      });

      // Trigger context-aware notifications based on walking activity
      if (activityType === 'walk_start') {
        await this.handleWalkStart(metadata);
      } else if (activityType === 'walk_end') {
        await this.handleWalkEnd(metadata);
      }
    } catch (error) {
      console.warn('Failed to track walking activity:', error);
    }
  }

  /**
   * Track screen navigation activity
   */
  public async trackScreenActivity(screenName: string, duration?: number): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.activityTracker.trackActivity({
        type: 'screen_view',
        timestamp: new Date(),
        screen: screenName,
        duration,
        metadata: { screen: screenName }
      });
    } catch (error) {
      console.warn('Failed to track screen activity:', error);
    }
  }

  /**
   * Track goal-related activities
   */
  public async trackGoalActivity(goalType: string, achieved: boolean, metadata?: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.config.enableGoalIntegration) return;

    try {
      await this.activityTracker.trackActivity({
        type: 'goal_set',
        timestamp: new Date(),
        metadata: { goalType, achieved, ...metadata }
      });

      // Send congratulatory notification for achieved goals
      if (achieved) {
        await this.sendGoalAchievementNotification(goalType, metadata);
      }
    } catch (error) {
      console.warn('Failed to track goal activity:', error);
    }
  }

  /**
   * Track journal entries
   */
  public async trackJournalActivity(mood: string, energyLevel: number, motivation: number): Promise<void> {
    if (!this.isInitialized || !this.config.enableJournalIntegration) return;

    try {
      await this.activityTracker.trackActivity({
        type: 'profile_update',
        timestamp: new Date(),
        metadata: { 
          type: 'journal_entry',
          mood, 
          energyLevel, 
          motivation 
        }
      });

      // Trigger motivational notifications based on mood/energy
      if (energyLevel <= 2 || motivation <= 30) {
        await this.sendMotivationalBoostNotification(mood, energyLevel, motivation);
      }
    } catch (error) {
      console.warn('Failed to track journal activity:', error);
    }
  }

  /**
   * Get current user engagement metrics
   */
  public async getUserEngagementMetrics(): Promise<{
    engagementScore: number;
    activityPattern: any;
    inactivityDuration: number;
    isInactive: boolean;
  }> {
    try {
      const engagementScore = this.activityTracker.calculateEngagementScore();
      const activityPattern = this.activityTracker.getCurrentPattern();
      const inactivityDuration = this.activityTracker.getInactivityDuration();
      const isInactive = this.activityTracker.isUserInactive();

      return {
        engagementScore,
        activityPattern,
        inactivityDuration,
        isInactive
      };
    } catch (error) {
      console.warn('Failed to get engagement metrics:', error);
      return {
        engagementScore: 0,
        activityPattern: null,
        inactivityDuration: 0,
        isInactive: false
      };
    }
  }

  /**
   * Manually trigger inactivity check
   */
  public async checkAndNotifyInactivity(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const inactivityAlert = this.activityTracker.generateInactivityAlert();
      
      if (inactivityAlert && this.activityTracker.isWithinActiveHours()) {
        const message = await this.messageGenerator.generateMessage({
          userId: 'default',
          activityPattern: {
            userId: 'default',
            lastActiveTime: new Date(Date.now() - inactivityAlert.inactiveDuration * 60000),
            dailyActiveMinutes: 0,
            weeklyPattern: [],
            preferredActiveHours: [],
            engagementLevel: 'medium',
            inactivityThreshold: 60
          },
          recentStats: [],
          timeContext: this.getCurrentTimeOfDay(),
          preferences: {
            enabled: true,
            frequency: 'medium',
            activeHours: { morning: true, afternoon: true, evening: true },
            categories: { motivational: true, progress: true, reminders: true, achievements: true },
            inactivityReminders: true,
            motivationalMessages: true,
            achievementAlerts: true,
            walkingReminders: true,
            quietHoursEnabled: false,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            allowDuringWalks: false,
            vibrationEnabled: true,
            soundEnabled: true
          },
          inactivityMinutes: inactivityAlert.inactiveDuration
        });

        if (message) {
          await this.notificationService.sendNotification({
            id: message.id,
            type: message.type,
            title: message.title,
            body: message.body,
            category: message.category,
            personalizedFor: message.personalizedFor,
            priority: message.priority,
            timeContext: message.timeContext
          });
        }
      }
    } catch (error) {
      console.warn('Failed to check inactivity:', error);
    }
  }

  /**
   * Stop all integrations
   */
  public async stop(): Promise<void> {
    try {
      await this.activityTracker.stop();
      await this.notificationService.cleanup();
      this.isInitialized = false;
    } catch (error) {
      console.warn('Failed to stop notification integration:', error);
    }
  }

  // Private methods

  private async setupWalkingIntegration(userId: string): Promise<void> {
    if (!this.config.enableWalkingIntegration || !supabase) return;

    try {
      // Listen for walking session updates from Supabase
      supabase
        .channel('walking_sessions')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'walking_sessions',
            filter: `user_id=eq.${userId}`
          }, 
          async (payload) => {
            await this.handleWalkingSessionChange(payload);
          }
        )
        .subscribe();

    } catch (error) {
      console.warn('Failed to setup walking integration:', error);
    }
  }

  private async setupMotivationIntegration(userId: string): Promise<void> {
    if (!this.config.enableMotivationIntegration) return;

    try {
      // Schedule daily motivation check
      setInterval(async () => {
        await this.checkDailyMotivation(userId);
      }, 4 * 60 * 60 * 1000); // Every 4 hours

    } catch (error) {
      console.warn('Failed to setup motivation integration:', error);
    }
  }

  private async setupGoalIntegration(userId: string): Promise<void> {
    if (!this.config.enableGoalIntegration || !supabase) return;

    try {
      // Listen for goal updates
      supabase
        .channel('user_goals')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_goals',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            await this.handleGoalChange(payload);
          }
        )
        .subscribe();

    } catch (error) {
      console.warn('Failed to setup goal integration:', error);
    }
  }

  private async setupJournalIntegration(userId: string): Promise<void> {
    if (!this.config.enableJournalIntegration || !supabase) return;

    try {
      // Listen for journal entries
      supabase
        .channel('journal_entries')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'journal_entries',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            await this.handleJournalEntry(payload);
          }
        )
        .subscribe();

    } catch (error) {
      console.warn('Failed to setup journal integration:', error);
    }
  }

  private async handleWalkStart(metadata?: Record<string, any>): Promise<void> {
    try {
      const message = await this.messageGenerator.generateMessage({
        userId: 'default',
        activityPattern: {
          userId: 'default',
          lastActiveTime: new Date(),
          dailyActiveMinutes: 0,
          weeklyPattern: [],
          preferredActiveHours: [],
          engagementLevel: 'medium',
          inactivityThreshold: 60
        },
        recentStats: [],
        timeContext: this.getCurrentTimeOfDay(),
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

      if (message) {
        await this.notificationService.sendNotification({
          id: message.id,
          type: message.type,
          title: message.title,
          body: message.body,
          category: message.category,
          personalizedFor: message.personalizedFor,
          priority: message.priority,
          timeContext: message.timeContext
        });
      }
    } catch (error) {
      console.warn('Failed to handle walk start:', error);
    }
  }

  private async handleWalkEnd(metadata?: Record<string, any>): Promise<void> {
    try {
      const message = await this.messageGenerator.generateMessage({
        userId: 'default',
        activityPattern: {
          userId: 'default',
          lastActiveTime: new Date(),
          dailyActiveMinutes: 0,
          weeklyPattern: [],
          preferredActiveHours: [],
          engagementLevel: 'high',
          inactivityThreshold: 60
        },
        recentStats: [],
        timeContext: this.getCurrentTimeOfDay(),
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

      if (message) {
        await this.notificationService.sendNotification({
          id: message.id,
          type: message.type,
          title: message.title,
          body: message.body,
          category: message.category,
          personalizedFor: message.personalizedFor,
          priority: message.priority,
          timeContext: message.timeContext
        });
      }
    } catch (error) {
      console.warn('Failed to handle walk end:', error);
    }
  }

  private async sendGoalAchievementNotification(goalType: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const message = await this.messageGenerator.generateMessage({
        userId: 'default',
        activityPattern: {
          userId: 'default',
          lastActiveTime: new Date(),
          dailyActiveMinutes: 0,
          weeklyPattern: [],
          preferredActiveHours: [],
          engagementLevel: 'high',
          inactivityThreshold: 60
        },
        recentStats: [],
        timeContext: this.getCurrentTimeOfDay(),
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

      if (message) {
        await this.notificationService.sendNotification({
          id: message.id,
          type: message.type,
          title: message.title,
          body: message.body,
          category: message.category,
          personalizedFor: message.personalizedFor,
          priority: message.priority,
          timeContext: message.timeContext
        });
      }
    } catch (error) {
      console.warn('Failed to send goal achievement notification:', error);
    }
  }

  private async sendMotivationalBoostNotification(mood: string, energyLevel: number, motivation: number): Promise<void> {
    try {
      const message = await this.messageGenerator.generateMessage({
        userId: 'default',
        activityPattern: {
          userId: 'default',
          lastActiveTime: new Date(),
          dailyActiveMinutes: 0,
          weeklyPattern: [],
          preferredActiveHours: [],
          engagementLevel: motivation < 30 ? 'low' : motivation < 60 ? 'medium' : 'high',
          inactivityThreshold: 60
        },
        recentStats: [],
        timeContext: this.getCurrentTimeOfDay(),
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

      if (message) {
        await this.notificationService.sendNotification({
          id: message.id,
          type: message.type,
          title: message.title,
          body: message.body,
          category: message.category,
          personalizedFor: message.personalizedFor,
          priority: message.priority,
          timeContext: message.timeContext
        });
      }
    } catch (error) {
      console.warn('Failed to send motivational boost notification:', error);
    }
  }

  private async handleWalkingSessionChange(payload: any): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT') {
        await this.trackWalkingActivity('walk_start', newRecord);
      } else if (eventType === 'UPDATE' && newRecord.completed_at && !oldRecord.completed_at) {
        await this.trackWalkingActivity('walk_end', newRecord);
      }
    } catch (error) {
      console.warn('Failed to handle walking session change:', error);
    }
  }

  private async handleGoalChange(payload: any): Promise<void> {
    try {
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'UPDATE' && newRecord.achieved && !payload.old?.achieved) {
        await this.trackGoalActivity(newRecord.goal_type, true, newRecord);
      }
    } catch (error) {
      console.warn('Failed to handle goal change:', error);
    }
  }

  private async handleJournalEntry(payload: any): Promise<void> {
    try {
      const { new: newRecord } = payload;
      await this.trackJournalActivity(
        newRecord.mood,
        newRecord.energy_level,
        newRecord.motivation
      );
    } catch (error) {
      console.warn('Failed to handle journal entry:', error);
    }
  }

  private async checkDailyMotivation(userId: string): Promise<void> {
    try {
      if (!this.activityTracker.isWithinActiveHours()) return;

      const engagementScore = this.activityTracker.calculateEngagementScore();
      
      // Send motivation boost if engagement is low
      if (engagementScore < 40) {
        const message = await this.messageGenerator.generateMessage({
          userId: 'default',
          activityPattern: {
            userId: 'default',
            lastActiveTime: new Date(),
            dailyActiveMinutes: 0,
            weeklyPattern: [],
            preferredActiveHours: [],
            engagementLevel: engagementScore < 30 ? 'low' : engagementScore < 60 ? 'medium' : 'high',
            inactivityThreshold: 60
          },
          recentStats: [],
          timeContext: this.getCurrentTimeOfDay(),
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

        if (message) {
          await this.notificationService.sendNotification({
            id: message.id,
            type: message.type,
            title: message.title,
            body: message.body,
            category: message.category,
            personalizedFor: message.personalizedFor,
            priority: message.priority,
            timeContext: message.timeContext
          });
        }
      }
    } catch (error) {
      console.warn('Failed to check daily motivation:', error);
    }
  }

  private getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Cleanup method for proper resource management
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    console.log('NotificationIntegration cleaned up');
  }
}

export default NotificationIntegration;