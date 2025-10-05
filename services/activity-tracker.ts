import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActivityEvent {
  type: 'app_open' | 'screen_view' | 'walk_start' | 'walk_end' | 'goal_set' | 'profile_update' | 'settings_change';
  timestamp: Date;
  screen?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ActivityPattern {
  userId: string;
  dailyActiveHours: number[];
  averageSessionDuration: number;
  mostActiveTimeSlots: string[];
  inactivityThreshold: number;
  lastActivityTime: Date;
  weeklyEngagementScore: number;
  preferredNotificationTimes: string[];
}

export interface InactivityAlert {
  userId: string;
  inactiveDuration: number;
  lastActivity: ActivityEvent;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
}

export class ActivityTracker {
  private static instance: ActivityTracker;
  private activityEvents: ActivityEvent[] = [];
  private currentPattern: ActivityPattern | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;
  private readonly STORAGE_KEY = 'activity_tracker_data';
  private readonly MAX_EVENTS_STORED = 1000;

  private constructor() {}

  public static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker();
    }
    return ActivityTracker.instance;
  }

  /**
   * Initialize activity tracking for a user
   */
  public async initialize(userId: string): Promise<void> {
    try {
      this.isTracking = true;
      await this.loadStoredData();
      await this.loadUserPattern(userId);
      this.startInactivityMonitoring();
      
      // Track app initialization
      await this.trackActivity({
        type: 'app_open',
        timestamp: new Date(),
        metadata: { source: 'initialization' }
      });
    } catch (error) {
      console.warn('ActivityTracker initialization failed:', error);
    }
  }

  /**
   * Track a user activity event
   */
  public async trackActivity(event: ActivityEvent): Promise<void> {
    if (!this.isTracking) return;

    try {
      // Add to local events array
      this.activityEvents.push(event);
      
      // Maintain storage limit
      if (this.activityEvents.length > this.MAX_EVENTS_STORED) {
        this.activityEvents = this.activityEvents.slice(-this.MAX_EVENTS_STORED);
      }

      // Update last activity time
      if (this.currentPattern) {
        this.currentPattern.lastActivityTime = event.timestamp;
      }

      // Store locally
      await this.saveToStorage();

      // Store in Supabase for pattern analysis
      await this.saveActivityToDatabase(event);

      // Reset inactivity timer
      this.resetInactivityTimer();

      // Update activity pattern
      await this.updateActivityPattern();

    } catch (error) {
      console.warn('Failed to track activity:', error);
    }
  }

  /**
   * Get current user activity pattern
   */
  public getCurrentPattern(): ActivityPattern | null {
    return this.currentPattern;
  }

  /**
   * Check if user is currently inactive
   */
  public isUserInactive(): boolean {
    if (!this.currentPattern) return false;

    const now = new Date();
    const lastActivity = this.currentPattern.lastActivityTime;
    const inactiveMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

    return inactiveMinutes > this.currentPattern.inactivityThreshold;
  }

  /**
   * Get inactivity duration in minutes
   */
  public getInactivityDuration(): number {
    if (!this.currentPattern) return 0;

    const now = new Date();
    const lastActivity = this.currentPattern.lastActivityTime;
    return Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
  }

  /**
   * Get activity events for a specific time range
   */
  public getActivityEvents(startDate: Date, endDate: Date): ActivityEvent[] {
    return this.activityEvents.filter(event => 
      event.timestamp >= startDate && event.timestamp <= endDate
    );
  }

  /**
   * Calculate engagement score based on recent activity
   */
  public calculateEngagementScore(): number {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = this.getActivityEvents(oneDayAgo, now);

    if (recentEvents.length === 0) return 0;

    // Base score from event frequency
    let score = Math.min(recentEvents.length * 2, 50);

    // Bonus for diverse activity types
    const uniqueTypes = new Set(recentEvents.map(e => e.type));
    score += uniqueTypes.size * 5;

    // Bonus for walking activities
    const walkingEvents = recentEvents.filter(e => 
      e.type === 'walk_start' || e.type === 'walk_end'
    );
    score += walkingEvents.length * 10;

    // Penalty for long inactivity periods
    const inactivityPenalty = Math.min(this.getInactivityDuration() * 0.5, 30);
    score -= inactivityPenalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get today's activity statistics
   */
  public async getTodayStats(): Promise<{
    steps: number;
    distance: number;
    duration: number;
    calories: number;
    activeTime: number;
    engagementScore: number;
  }> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayEvents = this.getActivityEvents(startOfDay, endOfDay);
    
    // Calculate basic stats from activity events
    let totalDuration = 0;
    let walkingEvents = 0;
    
    todayEvents.forEach(event => {
      if (event.duration) {
        totalDuration += event.duration;
      }
      if (event.type === 'walk_start' || event.type === 'walk_end') {
        walkingEvents++;
      }
    });

    // Estimate stats based on activity patterns
    const estimatedSteps = walkingEvents * 500; // Rough estimate
    const estimatedDistance = estimatedSteps * 0.0008; // km (rough estimate)
    const estimatedCalories = Math.floor(estimatedSteps * 0.04); // Rough estimate
    
    return {
      steps: estimatedSteps,
      distance: estimatedDistance,
      duration: totalDuration,
      calories: estimatedCalories,
      activeTime: totalDuration,
      engagementScore: this.calculateEngagementScore()
    };
  }

  /**
   * Get suggested notification timing based on activity patterns
   */
  public getSuggestedNotificationTimes(): string[] {
    if (!this.currentPattern) {
      return ['09:00', '14:00', '19:00']; // Default times
    }

    return this.currentPattern.preferredNotificationTimes;
  }

  /**
   * Check if user is currently walking
   */
  public async isCurrentlyWalking(): Promise<boolean> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const recentEvents = this.getActivityEvents(fiveMinutesAgo, now);
    const walkStartEvents = recentEvents.filter(e => e.type === 'walk_start');
    const walkEndEvents = recentEvents.filter(e => e.type === 'walk_end');
    
    // If more walk_start events than walk_end events, user is likely walking
    return walkStartEvents.length > walkEndEvents.length;
  }

  /**
   * Get current engagement score
   */
  public async getEngagementScore(): Promise<number> {
    return this.calculateEngagementScore();
  }

  /**
   * Check if current time is within user's active hours
   */
  public isWithinActiveHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    // Exclude midnight to 6 AM (inactive period)
    if (currentHour >= 0 && currentHour < 6) {
      return false;
    }

    if (!this.currentPattern) {
      return currentHour >= 6 && currentHour < 24;
    }

    return this.currentPattern.dailyActiveHours.includes(currentHour);
  }

  /**
   * Generate inactivity alert
   */
  public generateInactivityAlert(): InactivityAlert | null {
    if (!this.currentPattern || !this.isUserInactive()) {
      return null;
    }

    const inactiveDuration = this.getInactivityDuration();
    const lastEvent = this.activityEvents[this.activityEvents.length - 1];

    let priority: 'low' | 'medium' | 'high' = 'low';
    let suggestedAction = 'Take a short walk to stay active!';

    if (inactiveDuration > 120) { // 2+ hours
      priority = 'high';
      suggestedAction = 'You\'ve been inactive for a while. How about a refreshing walk?';
    } else if (inactiveDuration > 60) { // 1+ hour
      priority = 'medium';
      suggestedAction = 'Time for some movement! A quick walk can boost your energy.';
    }

    return {
      userId: this.currentPattern.userId,
      inactiveDuration,
      lastActivity: lastEvent,
      suggestedAction,
      priority
    };
  }

  /**
   * Stop activity tracking
   */
  public async stop(): Promise<void> {
    this.isTracking = false;
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    await this.saveToStorage();
  }

  // Private methods

  private async loadStoredData(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        this.activityEvents = data.events || [];
      }
    } catch (error) {
      console.warn('Failed to load stored activity data:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        events: this.activityEvents,
        lastUpdated: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save activity data to storage:', error);
    }
  }

  private async loadUserPattern(userId: string): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      const { data, error } = await supabase
        .from('user_activity_patterns')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      if (data) {
        this.currentPattern = {
          userId: data.user_id,
          dailyActiveHours: data.daily_active_hours || [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          averageSessionDuration: data.average_session_duration || 15,
          mostActiveTimeSlots: data.most_active_time_slots || ['09:00-12:00', '14:00-17:00', '19:00-21:00'],
          inactivityThreshold: data.inactivity_threshold || 30,
          lastActivityTime: new Date(),
          weeklyEngagementScore: data.weekly_engagement_score || 50,
          preferredNotificationTimes: data.preferred_notification_times || ['09:00', '14:00', '19:00']
        };
      } else {
        // Create default pattern for new user
        this.currentPattern = {
          userId,
          dailyActiveHours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          averageSessionDuration: 15,
          mostActiveTimeSlots: ['09:00-12:00', '14:00-17:00', '19:00-21:00'],
          inactivityThreshold: 30,
          lastActivityTime: new Date(),
          weeklyEngagementScore: 50,
          preferredNotificationTimes: ['09:00', '14:00', '19:00']
        };
      }
    } catch (error) {
      console.warn('Failed to load user activity pattern:', error);
      // Fallback to default pattern
      this.currentPattern = {
        userId,
        dailyActiveHours: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
        averageSessionDuration: 15,
        mostActiveTimeSlots: ['09:00-12:00', '14:00-17:00', '19:00-21:00'],
        inactivityThreshold: 30,
        lastActivityTime: new Date(),
        weeklyEngagementScore: 50,
        preferredNotificationTimes: ['09:00', '14:00', '19:00']
      };
    }
  }

  private async saveActivityToDatabase(event: ActivityEvent): Promise<void> {
    try {
      if (!this.currentPattern) return;
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }

      await supabase
        .from('user_activities')
        .insert({
          user_id: this.currentPattern.userId,
          activity_type: event.type,
          timestamp: event.timestamp.toISOString(),
          screen: event.screen,
          duration: event.duration,
          metadata: event.metadata
        });
    } catch (error) {
      console.warn('Failed to save activity to database:', error);
    }
  }

  private async updateActivityPattern(): Promise<void> {
    if (!this.currentPattern) return;

    try {
      // Calculate new engagement score
      this.currentPattern.weeklyEngagementScore = this.calculateEngagementScore();

      // Update preferred notification times based on activity patterns
      this.updatePreferredNotificationTimes();

      // Save updated pattern to database
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }
      
      await supabase
        .from('user_activity_patterns')
        .upsert({
          user_id: this.currentPattern.userId,
          daily_active_hours: this.currentPattern.dailyActiveHours,
          average_session_duration: this.currentPattern.averageSessionDuration,
          most_active_time_slots: this.currentPattern.mostActiveTimeSlots,
          inactivity_threshold: this.currentPattern.inactivityThreshold,
          weekly_engagement_score: this.currentPattern.weeklyEngagementScore,
          preferred_notification_times: this.currentPattern.preferredNotificationTimes,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to update activity pattern:', error);
    }
  }

  private updatePreferredNotificationTimes(): void {
    if (!this.currentPattern) return;

    // Analyze recent activity to find optimal notification times
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = this.getActivityEvents(oneWeekAgo, now);

    // Group events by hour
    const hourlyActivity: { [hour: number]: number } = {};
    recentEvents.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    // Find top 3 most active hours (excluding inactive period)
    const activeHours = Object.entries(hourlyActivity)
      .filter(([hour]) => parseInt(hour) >= 6 && parseInt(hour) < 24)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour.padStart(2, '0')}:00`);

    if (activeHours.length > 0) {
      this.currentPattern.preferredNotificationTimes = activeHours;
    }
  }

  private startInactivityMonitoring(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Check for inactivity every 15 minutes
    this.inactivityTimer = setTimeout(() => {
      if (this.isTracking && this.isWithinActiveHours()) {
        // This will be used by the notification service
        this.startInactivityMonitoring(); // Restart timer
      }
    }, 15 * 60 * 1000) as any;
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.startInactivityMonitoring();
    }
  }

  /**
   * Cleanup method for proper resource management
   */
  async cleanup(): Promise<void> {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    this.isTracking = false;
    this.activityEvents = [];
    this.currentPattern = null;
    
    console.log('ActivityTracker cleaned up');
  }
}

export default ActivityTracker;