import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface NotificationEvent {
  id: string;
  userId: string;
  notificationId: string;
  type: 'sent' | 'delivered' | 'opened' | 'dismissed' | 'action_taken';
  category: 'inactivity_reminder' | 'motivational' | 'achievement' | 'daily_motivation' | 'walking_reminder';
  timestamp: Date;
  metadata?: {
    title?: string;
    body?: string;
    engagementScore?: number;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    userActivity?: string;
    actionType?: string;
  };
}

export interface EngagementMetrics {
  totalNotificationsSent: number;
  totalNotificationsOpened: number;
  totalNotificationsDismissed: number;
  openRate: number;
  dismissalRate: number;
  actionRate: number;
  averageResponseTime: number; // in minutes
  categoryPerformance: {
    [category: string]: {
      sent: number;
      opened: number;
      dismissed: number;
      openRate: number;
    };
  };
  timeOfDayPerformance: {
    morning: { sent: number; opened: number; openRate: number };
    afternoon: { sent: number; opened: number; openRate: number };
    evening: { sent: number; opened: number; openRate: number };
  };
  weeklyTrends: {
    week: string;
    sent: number;
    opened: number;
    openRate: number;
  }[];
}

export interface UserEngagementProfile {
  userId: string;
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
  mostEngagingCategories: string[];
  averageResponseTime: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: Date;
  totalInteractions: number;
  streakDays: number;
}

export class NotificationAnalytics {
  private isInitialized = false;
  private eventQueue: NotificationEvent[] = [];
  private syncInterval: NodeJS.Timeout | number | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start periodic sync with Supabase
      this.startPeriodicSync();
      
      // Process any queued events
      await this.processEventQueue();

      this.isInitialized = true;
      console.log('NotificationAnalytics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationAnalytics:', error);
      throw error;
    }
  }

  async trackNotificationEvent(
    userId: string,
    notificationId: string,
    type: NotificationEvent['type'],
    category: NotificationEvent['category'],
    metadata?: NotificationEvent['metadata']
  ): Promise<void> {
    const event: NotificationEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      notificationId,
      type,
      category,
      timestamp: new Date(),
      metadata,
    };

    // Add to queue for processing
    this.eventQueue.push(event);

    // Try to sync immediately, but don't block if it fails
    try {
      await this.syncEventToSupabase(event);
    } catch (error) {
      console.warn('Failed to sync event immediately, will retry later:', error);
    }

    // Store locally as backup
    await this.storeEventLocally(event);
  }

  async getEngagementMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<EngagementMetrics> {
    try {
      const events = await this.getEventsFromSupabase(userId, startDate, endDate);
      return this.calculateEngagementMetrics(events);
    } catch (error) {
      console.error('Failed to get engagement metrics from Supabase, using local data:', error);
      const localEvents = await this.getLocalEvents(userId);
      return this.calculateEngagementMetrics(localEvents);
    }
  }

  async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    try {
      // Get last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const events = await this.getEventsFromSupabase(userId, thirtyDaysAgo);
      return this.calculateUserProfile(userId, events);
    } catch (error) {
      console.error('Failed to get user profile from Supabase, using local data:', error);
      const localEvents = await this.getLocalEvents(userId);
      return this.calculateUserProfile(userId, localEvents);
    }
  }

  async getOptimalNotificationTime(userId: string): Promise<{
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    confidence: number;
  }> {
    const metrics = await this.getEngagementMetrics(userId);

    // Find the time of day with highest open rate
    const timePerformance = metrics.timeOfDayPerformance;
    let bestTime: 'morning' | 'afternoon' | 'evening' = 'morning';
    let bestRate = 0;

    Object.entries(timePerformance).forEach(([time, data]) => {
      if (data.openRate > bestRate) {
        bestRate = data.openRate;
        bestTime = time as 'morning' | 'afternoon' | 'evening';
      }
    });

    // Calculate confidence based on sample size and consistency
    const totalSent = Object.values(timePerformance).reduce((sum, data) => sum + data.sent, 0);
    const confidence = Math.min(totalSent / 50, 1); // Max confidence at 50+ notifications

    return {
      timeOfDay: bestTime,
      confidence,
    };
  }

  async getOptimalNotificationFrequency(userId: string): Promise<{
    frequency: 'low' | 'medium' | 'high';
    recommendedInterval: number; // minutes
  }> {
    const profile = await this.getUserEngagementProfile(userId);
    const metrics = await this.getEngagementMetrics(userId);

    // Base recommendation on engagement trend and response time
    let frequency: 'low' | 'medium' | 'high' = 'medium';
    let recommendedInterval = 120; // 2 hours default

    if (profile.engagementTrend === 'decreasing' || metrics.openRate < 0.3) {
      frequency = 'low';
      recommendedInterval = 240; // 4 hours
    } else if (profile.engagementTrend === 'increasing' && metrics.openRate > 0.7) {
      frequency = 'high';
      recommendedInterval = 60; // 1 hour
    }

    return { frequency, recommendedInterval };
  }

  private async syncEventToSupabase(event: NotificationEvent): Promise<void> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }
    
    const { error } = await supabase
      .from('notification_events')
      .insert({
        id: event.id,
        user_id: event.userId,
        notification_id: event.notificationId,
        event_type: event.type,
        category: event.category,
        timestamp: event.timestamp.toISOString(),
        metadata: event.metadata,
      });

    if (error) {
      throw error;
    }
  }

  private async getEventsFromSupabase(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationEvent[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }
    
    let query = supabase
      .from('notification_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      notificationId: row.notification_id,
      type: row.event_type,
      category: row.category,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata,
    }));
  }

  private calculateEngagementMetrics(events: NotificationEvent[]): EngagementMetrics {
    const sentEvents = events.filter(e => e.type === 'sent');
    const openedEvents = events.filter(e => e.type === 'opened');
    const dismissedEvents = events.filter(e => e.type === 'dismissed');
    const actionEvents = events.filter(e => e.type === 'action_taken');

    const totalSent = sentEvents.length;
    const totalOpened = openedEvents.length;
    const totalDismissed = dismissedEvents.length;
    const totalActions = actionEvents.length;

    // Calculate rates
    const openRate = totalSent > 0 ? totalOpened / totalSent : 0;
    const dismissalRate = totalSent > 0 ? totalDismissed / totalSent : 0;
    const actionRate = totalOpened > 0 ? totalActions / totalOpened : 0;

    // Calculate average response time
    const responseTimes: number[] = [];
    openedEvents.forEach(openEvent => {
      const sentEvent = sentEvents.find(s => s.notificationId === openEvent.notificationId);
      if (sentEvent) {
        const responseTime = (openEvent.timestamp.getTime() - sentEvent.timestamp.getTime()) / (1000 * 60);
        responseTimes.push(responseTime);
      }
    });
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Category performance
    const categoryPerformance: { [category: string]: any } = {};
    const categories = [...new Set(events.map(e => e.category))];
    
    categories.forEach(category => {
      const categorySent = sentEvents.filter(e => e.category === category).length;
      const categoryOpened = openedEvents.filter(e => e.category === category).length;
      const categoryDismissed = dismissedEvents.filter(e => e.category === category).length;
      
      categoryPerformance[category] = {
        sent: categorySent,
        opened: categoryOpened,
        dismissed: categoryDismissed,
        openRate: categorySent > 0 ? categoryOpened / categorySent : 0,
      };
    });

    // Time of day performance
    const timeOfDayPerformance = {
      morning: { sent: 0, opened: 0, openRate: 0 },
      afternoon: { sent: 0, opened: 0, openRate: 0 },
      evening: { sent: 0, opened: 0, openRate: 0 },
    };

    ['morning', 'afternoon', 'evening'].forEach(timeOfDay => {
      const timeSent = sentEvents.filter(e => e.metadata?.timeOfDay === timeOfDay).length;
      const timeOpened = openedEvents.filter(e => e.metadata?.timeOfDay === timeOfDay).length;
      
      timeOfDayPerformance[timeOfDay as keyof typeof timeOfDayPerformance] = {
        sent: timeSent,
        opened: timeOpened,
        openRate: timeSent > 0 ? timeOpened / timeSent : 0,
      };
    });

    // Weekly trends (last 4 weeks)
    const weeklyTrends: { week: string; sent: number; opened: number; openRate: number }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSent = sentEvents.filter(e => 
        e.timestamp >= weekStart && e.timestamp < weekEnd
      ).length;
      const weekOpened = openedEvents.filter(e => 
        e.timestamp >= weekStart && e.timestamp < weekEnd
      ).length;

      weeklyTrends.unshift({
        week: `Week ${4 - i}`,
        sent: weekSent,
        opened: weekOpened,
        openRate: weekSent > 0 ? weekOpened / weekSent : 0,
      });
    }

    return {
      totalNotificationsSent: totalSent,
      totalNotificationsOpened: totalOpened,
      totalNotificationsDismissed: totalDismissed,
      openRate,
      dismissalRate,
      actionRate,
      averageResponseTime,
      categoryPerformance,
      timeOfDayPerformance,
      weeklyTrends,
    };
  }

  private calculateUserProfile(userId: string, events: NotificationEvent[]): UserEngagementProfile {
    const openedEvents = events.filter(e => e.type === 'opened');
    const sentEvents = events.filter(e => e.type === 'sent');

    // Find preferred time of day
    const timeOfDayStats = {
      morning: openedEvents.filter(e => e.metadata?.timeOfDay === 'morning').length,
      afternoon: openedEvents.filter(e => e.metadata?.timeOfDay === 'afternoon').length,
      evening: openedEvents.filter(e => e.metadata?.timeOfDay === 'evening').length,
    };

    const preferredTimeOfDay = Object.entries(timeOfDayStats).reduce((a, b) => 
      timeOfDayStats[a[0] as keyof typeof timeOfDayStats] > timeOfDayStats[b[0] as keyof typeof timeOfDayStats] ? a : b
    )[0] as 'morning' | 'afternoon' | 'evening';

    // Find most engaging categories
    const categoryStats: { [category: string]: number } = {};
    openedEvents.forEach(event => {
      categoryStats[event.category] = (categoryStats[event.category] || 0) + 1;
    });

    const mostEngagingCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // Calculate average response time
    const responseTimes: number[] = [];
    openedEvents.forEach(openEvent => {
      const sentEvent = sentEvents.find(s => s.notificationId === openEvent.notificationId);
      if (sentEvent) {
        const responseTime = (openEvent.timestamp.getTime() - sentEvent.timestamp.getTime()) / (1000 * 60);
        responseTimes.push(responseTime);
      }
    });
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate engagement trend (comparing last 2 weeks vs previous 2 weeks)
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const recentEngagement = openedEvents.filter(e => e.timestamp >= twoWeeksAgo).length;
    const previousEngagement = openedEvents.filter(e => 
      e.timestamp >= fourWeeksAgo && e.timestamp < twoWeeksAgo
    ).length;

    let engagementTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentEngagement > previousEngagement * 1.1) {
      engagementTrend = 'increasing';
    } else if (recentEngagement < previousEngagement * 0.9) {
      engagementTrend = 'decreasing';
    }

    // Calculate streak days (consecutive days with at least one interaction)
    const interactionDays = [...new Set(
      openedEvents.map(e => e.timestamp.toDateString())
    )].sort();

    let streakDays = 0;
    let currentDate = new Date();

    while (interactionDays.includes(currentDate.toDateString())) {
      streakDays++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return {
      userId,
      preferredTimeOfDay,
      mostEngagingCategories,
      averageResponseTime,
      engagementTrend,
      lastUpdated: new Date(),
      totalInteractions: openedEvents.length,
      streakDays,
    };
  }

  private async storeEventLocally(event: NotificationEvent): Promise<void> {
    try {
      const key = `notification_events_${event.userId}`;
      const existingEventsStr = await AsyncStorage.getItem(key);
      const existingEvents: NotificationEvent[] = existingEventsStr ? JSON.parse(existingEventsStr) : [];
      
      existingEvents.push(event);
      
      // Keep only last 1000 events locally
      if (existingEvents.length > 1000) {
        existingEvents.splice(0, existingEvents.length - 1000);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(existingEvents));
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  private async getLocalEvents(userId: string): Promise<NotificationEvent[]> {
    try {
      const key = `notification_events_${userId}`;
      const eventsStr = await AsyncStorage.getItem(key);
      return eventsStr ? JSON.parse(eventsStr) : [];
    } catch (error) {
      console.error('Failed to get local events:', error);
      return [];
    }
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      await this.processEventQueue();
    }, 5 * 60 * 1000);
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSync = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToSync) {
      try {
        await this.syncEventToSupabase(event);
      } catch (error) {
        console.warn('Failed to sync event, re-queuing:', error);
        this.eventQueue.push(event);
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Process remaining events
    await this.processEventQueue();
    
    this.isInitialized = false;
  }
}