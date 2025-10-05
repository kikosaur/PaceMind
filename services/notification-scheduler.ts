import { NotificationService } from './notification-service';
import { ActivityTracker } from './activity-tracker';
import { AIMessageGenerator } from './ai-message-generator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScheduleConfig {
  activeHours: {
    start: number; // 6 (6 AM)
    end: number;   // 24 (12 AM)
  };
  quietHours: {
    start: number; // 0 (12 AM)
    end: number;   // 6 (6 AM)
  };
  intervals: {
    inactivityCheck: number; // minutes
    motivationalMessage: number; // minutes
    achievementCheck: number; // minutes
  };
}

export interface ScheduledTask {
  id: string;
  type: 'inactivity_check' | 'motivational_message' | 'achievement_check' | 'daily_motivation';
  scheduledTime: Date;
  isRecurring: boolean;
  intervalMinutes?: number;
  isActive: boolean;
}

export class NotificationScheduler {
  private notificationService: NotificationService;
  private activityTracker: ActivityTracker;
  private messageGenerator: AIMessageGenerator;
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  private defaultConfig: ScheduleConfig = {
    activeHours: { start: 6, end: 24 },
    quietHours: { start: 0, end: 6 },
    intervals: {
      inactivityCheck: 30, // Check every 30 minutes
      motivationalMessage: 120, // Send motivational messages every 2 hours
      achievementCheck: 60, // Check achievements every hour
    },
  };

  constructor(
    notificationService: NotificationService,
    activityTracker: ActivityTracker,
    messageGenerator: AIMessageGenerator
  ) {
    this.notificationService = notificationService;
    this.activityTracker = activityTracker;
    this.messageGenerator = messageGenerator;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved configuration
      const savedConfig = await this.loadScheduleConfig();
      const config = savedConfig || this.defaultConfig;

      // Set up recurring tasks
      await this.setupRecurringTasks(config);

      // Set up daily motivation task
      await this.setupDailyMotivationTask();

      // Start the scheduler
      this.startScheduler();

      this.isInitialized = true;
      console.log('NotificationScheduler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationScheduler:', error);
      throw error;
    }
  }

  private async setupRecurringTasks(config: ScheduleConfig): Promise<void> {
    // Inactivity check task
    const inactivityTask: ScheduledTask = {
      id: 'inactivity_check',
      type: 'inactivity_check',
      scheduledTime: this.getNextScheduledTime(config.intervals.inactivityCheck),
      isRecurring: true,
      intervalMinutes: config.intervals.inactivityCheck,
      isActive: true,
    };

    // Motivational message task
    const motivationalTask: ScheduledTask = {
      id: 'motivational_message',
      type: 'motivational_message',
      scheduledTime: this.getNextScheduledTime(config.intervals.motivationalMessage),
      isRecurring: true,
      intervalMinutes: config.intervals.motivationalMessage,
      isActive: true,
    };

    // Achievement check task
    const achievementTask: ScheduledTask = {
      id: 'achievement_check',
      type: 'achievement_check',
      scheduledTime: this.getNextScheduledTime(config.intervals.achievementCheck),
      isRecurring: true,
      intervalMinutes: config.intervals.achievementCheck,
      isActive: true,
    };

    this.scheduledTasks.set(inactivityTask.id, inactivityTask);
    this.scheduledTasks.set(motivationalTask.id, motivationalTask);
    this.scheduledTasks.set(achievementTask.id, achievementTask);
  }

  private async setupDailyMotivationTask(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8 AM daily motivation

    const dailyTask: ScheduledTask = {
      id: 'daily_motivation',
      type: 'daily_motivation',
      scheduledTime: tomorrow,
      isRecurring: true,
      intervalMinutes: 24 * 60, // 24 hours
      isActive: true,
    };

    this.scheduledTasks.set(dailyTask.id, dailyTask);
  }

  private getNextScheduledTime(intervalMinutes: number): Date {
    const now = new Date();
    const next = new Date(now.getTime() + intervalMinutes * 60 * 1000);
    
    // Ensure it's within active hours
    return this.adjustToActiveHours(next);
  }

  private adjustToActiveHours(date: Date): Date {
    const hour = date.getHours();
    const config = this.defaultConfig;

    // If it's during quiet hours (12 AM - 6 AM), move to 6 AM
    if (hour >= config.quietHours.start && hour < config.quietHours.end) {
      const adjusted = new Date(date);
      adjusted.setHours(config.activeHours.start, 0, 0, 0);
      return adjusted;
    }

    return date;
  }

  private startScheduler(): void {
    // Check and execute tasks every minute
    const schedulerInterval = setInterval(() => {
      this.checkAndExecuteTasks();
    }, 60 * 1000) as any; // Check every minute

    // Store the main scheduler interval
    this.timers.set('main_scheduler', schedulerInterval);
  }

  private async checkAndExecuteTasks(): Promise<void> {
    const now = new Date();

    for (const [taskId, task] of this.scheduledTasks) {
      if (!task.isActive) continue;

      // Check if it's time to execute the task
      if (now >= task.scheduledTime) {
        try {
          await this.executeTask(task);

          // Reschedule if recurring
          if (task.isRecurring && task.intervalMinutes) {
            task.scheduledTime = this.getNextScheduledTime(task.intervalMinutes);
          } else {
            // Remove non-recurring completed tasks
            this.scheduledTasks.delete(taskId);
          }
        } catch (error) {
          console.error(`Failed to execute task ${taskId}:`, error);
        }
      }
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    // Check if we're in active hours
    if (!this.isActiveHour()) {
      console.log(`Skipping task ${task.id} - outside active hours`);
      return;
    }

    // Check user preferences
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.log(`Skipping task ${task.id} - no user ID available`);
      return;
    }
    
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences.enabled) {
      console.log(`Skipping task ${task.id} - notifications disabled`);
      return;
    }

    switch (task.type) {
      case 'inactivity_check':
        await this.handleInactivityCheck();
        break;
      case 'motivational_message':
        await this.handleMotivationalMessage();
        break;
      case 'achievement_check':
        await this.handleAchievementCheck();
        break;
      case 'daily_motivation':
        await this.handleDailyMotivation();
        break;
    }
  }

  private async handleInactivityCheck(): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;
    
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences.inactivityReminders) return;

    const inactivityAlert = this.activityTracker.generateInactivityAlert();
    if (inactivityAlert) {
      const message = await this.messageGenerator.generateMessage({
        userId,
        activityPattern: {
          userId,
          lastActiveTime: new Date(Date.now() - inactivityAlert.inactiveDuration * 60000),
          dailyActiveMinutes: 0,
          weeklyPattern: [],
          preferredActiveHours: [],
          engagementLevel: 'low',
          inactivityThreshold: 60
        },
        recentStats: [],
        timeContext: this.getTimeOfDay(),
        preferences,
        inactivityMinutes: inactivityAlert.inactiveDuration
      });

      await this.notificationService.sendNotification({
        id: `inactivity_${Date.now()}`,
        type: 'reminder',
        title: 'Time to Move! 🚶‍♂️',
        body: message?.body || 'Time to get moving and stay active!',
        category: 'inactivity_reminder',
        personalizedFor: 'inactivity_pattern',
        priority: 'medium',
        timeContext: this.getTimeOfDay(),
      });
    }
  }

  private async handleMotivationalMessage(): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;
    
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences.motivationalMessages) return;

    // Check if user is currently walking
    const isWalking = await this.activityTracker.isCurrentlyWalking();
    if (isWalking && !preferences.allowDuringWalks) return;

    const engagementScore = await this.activityTracker.getEngagementScore();
    const message = await this.messageGenerator.generateMessage({
      userId: await this.getCurrentUserId() || '',
      activityPattern: {
        userId: await this.getCurrentUserId() || '',
        lastActiveTime: new Date(),
        dailyActiveMinutes: 30,
        weeklyPattern: [0.7, 0.8, 0.6, 0.7, 0.8, 0.9, 0.5],
        preferredActiveHours: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        engagementLevel: engagementScore > 70 ? 'high' : engagementScore > 40 ? 'medium' : 'low',
        inactivityThreshold: 60
      },
      recentStats: [],
      timeContext: this.getTimeOfDay(),
      preferences: preferences,
      inactivityMinutes: 0
    });

    await this.notificationService.sendNotification({
      id: `motivational_${Date.now()}`,
      type: 'motivational',
      title: 'Stay Motivated! 💪',
      body: message?.body || 'Keep up the great work!',
      category: 'motivational',
      personalizedFor: 'engagement_pattern',
      priority: 'medium',
      timeContext: this.getTimeOfDay(),
    });
  }

  private async handleAchievementCheck(): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;
    
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences.achievementAlerts) return;

    // This would integrate with your achievement system
    // For now, we'll check basic achievements like step goals
    const todayStats = await this.activityTracker.getTodayStats();
    const stepGoal = 10000; // This should come from user preferences

    if (todayStats.steps >= stepGoal) {
      const activityPattern = await this.notificationService.getUserActivityPattern(userId);
      const message = await this.messageGenerator.generateMessage({
        userId,
        activityPattern,
        recentStats: [todayStats],
        timeContext: this.getTimeOfDay(),
        preferences,
        inactivityMinutes: 0,
      });

      await this.notificationService.sendNotification({
        id: `achievement_${Date.now()}`,
        type: 'achievement',
        title: 'Goal Achieved! 🎉',
        body: message?.body || 'Congratulations on your achievement!',
        category: 'achievement',
        personalizedFor: 'daily_steps_pattern',
        priority: 'high',
        timeContext: this.getTimeOfDay(),
      });
    }
  }

  private async handleDailyMotivation(): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;
    
    const preferences = await this.notificationService.getUserPreferences(userId);
    if (!preferences.motivationalMessages) return;

    const activityPattern = await this.notificationService.getUserActivityPattern(userId);
    const message = await this.messageGenerator.generateMessage({
      userId,
      activityPattern,
      recentStats: [],
      timeContext: 'morning',
      preferences,
      inactivityMinutes: 0,
    });

    await this.notificationService.sendNotification({
      id: `daily_motivation_${Date.now()}`,
      type: 'motivational',
      title: 'Good Morning! 🌅',
      body: message?.body || 'Have a great day ahead!',
      category: 'daily_motivation',
      personalizedFor: 'morning_routine',
      priority: 'medium',
      timeContext: 'morning',
    });
  }

  private isActiveHour(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const config = this.defaultConfig;

    return hour >= config.activeHours.start || hour < config.activeHours.end;
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

  // Public methods for managing the scheduler
  async pauseScheduler(): Promise<void> {
    for (const [, task] of this.scheduledTasks) {
      task.isActive = false;
    }
    
    // Clear all timers
    for (const [, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  async resumeScheduler(): Promise<void> {
    for (const [, task] of this.scheduledTasks) {
      task.isActive = true;
    }
    
    this.startScheduler();
  }

  async updateScheduleConfig(config: Partial<ScheduleConfig>): Promise<void> {
    const currentConfig = await this.loadScheduleConfig() || this.defaultConfig;
    const newConfig = { ...currentConfig, ...config };
    
    await this.saveScheduleConfig(newConfig);
    
    // Restart scheduler with new config
    await this.pauseScheduler();
    await this.setupRecurringTasks(newConfig);
    await this.resumeScheduler();
  }

  async addOneTimeTask(
    type: ScheduledTask['type'],
    scheduledTime: Date,
    data?: any
  ): Promise<string> {
    const taskId = `onetime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ScheduledTask = {
      id: taskId,
      type,
      scheduledTime: this.adjustToActiveHours(scheduledTime),
      isRecurring: false,
      isActive: true,
    };

    this.scheduledTasks.set(taskId, task);
    return taskId;
  }

  async removeTask(taskId: string): Promise<void> {
    this.scheduledTasks.delete(taskId);
    
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  private async loadScheduleConfig(): Promise<ScheduleConfig | null> {
    try {
      const configStr = await AsyncStorage.getItem('notification_schedule_config');
      return configStr ? JSON.parse(configStr) : null;
    } catch (error) {
      console.error('Failed to load schedule config:', error);
      return null;
    }
  }

  private async saveScheduleConfig(config: ScheduleConfig): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_schedule_config', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save schedule config:', error);
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { supabase } = await import('../lib/supabase');
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

  async cleanup(): Promise<void> {
    await this.pauseScheduler();
    this.scheduledTasks.clear();
    this.isInitialized = false;
  }
}