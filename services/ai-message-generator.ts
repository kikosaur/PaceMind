import { MotivationalMessage, UserActivityPattern, NotificationPreferences } from './notification-service';

// Types for AI message generation
export interface MessageGenerationContext {
  userId: string;
  activityPattern: UserActivityPattern;
  recentStats: any[];
  timeContext: 'morning' | 'afternoon' | 'evening';
  preferences: NotificationPreferences;
  inactivityMinutes: number;
}

export interface MessageTemplate {
  id: string;
  type: 'motivational' | 'progress' | 'reminder' | 'achievement';
  templates: {
    title: string[];
    body: string[];
  };
  conditions: {
    engagementLevel?: ('low' | 'medium' | 'high')[];
    timeContext?: ('morning' | 'afternoon' | 'evening')[];
    inactivityRange?: [number, number]; // min, max minutes
    activityTrend?: 'increasing' | 'decreasing' | 'stable';
  };
  personalizationTokens: string[]; // Tokens like {name}, {steps}, {goal}
}

export class AIMessageGenerator {
  private messageTemplates: MessageTemplate[] = [];
  private userPersonalizationData: Map<string, any> = new Map();

  constructor() {
    this.initializeMessageTemplates();
  }

  private initializeMessageTemplates(): void {
    this.messageTemplates = [
      // Morning Motivational Messages
      {
        id: 'morning_motivational_high',
        type: 'motivational',
        templates: {
          title: [
            "Rise and Shine! 🌅",
            "Good Morning, Champion! ⭐",
            "Start Strong Today! 💪",
            "Morning Energy Boost! ⚡"
          ],
          body: [
            "You've been crushing your goals! Ready for another amazing day of movement?",
            "Your consistency is inspiring! Let's make today even better than yesterday.",
            "Time to fuel that morning energy with a refreshing walk!",
            "Your dedication shows - let's keep that momentum going strong!"
          ]
        },
        conditions: {
          engagementLevel: ['high'],
          timeContext: ['morning'],
          inactivityRange: [30, 120]
        },
        personalizationTokens: ['{name}', '{weeklySteps}', '{streak}']
      },
      {
        id: 'morning_motivational_medium',
        type: 'motivational',
        templates: {
          title: [
            "Good Morning! 🌞",
            "Ready to Move? 🚶‍♀️",
            "Fresh Start Ahead! 🌱",
            "Morning Opportunity! 🎯"
          ],
          body: [
            "A new day means new opportunities to reach your goals. How about a morning walk?",
            "You've made great progress this week! Let's add some morning movement to the mix.",
            "Starting the day with movement sets a positive tone. Ready to begin?",
            "Your body is ready for action - let's give it the movement it craves!"
          ]
        },
        conditions: {
          engagementLevel: ['medium'],
          timeContext: ['morning'],
          inactivityRange: [45, 180]
        },
        personalizationTokens: ['{name}', '{dailyGoal}', '{progress}']
      },
      {
        id: 'morning_motivational_low',
        type: 'motivational',
        templates: {
          title: [
            "Small Steps Count! 👣",
            "Gentle Start Today 🌸",
            "Easy Does It! 😊",
            "Your Pace, Your Way 🛤️"
          ],
          body: [
            "No pressure - even a short 5-minute walk can make a difference!",
            "Every journey begins with a single step. Ready for yours?",
            "Let's start small today. A gentle walk around the block sounds perfect!",
            "Your wellness journey is unique. How about we begin with something comfortable?"
          ]
        },
        conditions: {
          engagementLevel: ['low'],
          timeContext: ['morning'],
          inactivityRange: [60, 300]
        },
        personalizationTokens: ['{name}', '{easyGoal}']
      },

      // Afternoon Messages
      {
        id: 'afternoon_energy_boost',
        type: 'motivational',
        templates: {
          title: [
            "Afternoon Pick-Me-Up! ☀️",
            "Beat the Slump! 💥",
            "Midday Recharge! 🔋",
            "Afternoon Adventure! 🌟"
          ],
          body: [
            "Feeling that afternoon dip? A quick walk is the perfect natural energy booster!",
            "Time to shake off the midday sluggishness with some refreshing movement!",
            "Your body needs a break from sitting. Let's get those endorphins flowing!",
            "Afternoon walks are proven to boost creativity and energy. Ready to try?"
          ]
        },
        conditions: {
          timeContext: ['afternoon'],
          inactivityRange: [90, 240]
        },
        personalizationTokens: ['{name}', '{todaySteps}', '{energyLevel}']
      },

      // Evening Messages
      {
        id: 'evening_wind_down',
        type: 'motivational',
        templates: {
          title: [
            "Evening Reflection Walk 🌙",
            "Peaceful End to the Day 🌅",
            "Sunset Stroll Time! 🌇",
            "Gentle Evening Movement 🍃"
          ],
          body: [
            "End your day on a positive note with a calming evening walk.",
            "A peaceful walk is the perfect way to transition from day to night.",
            "Let's wrap up the day with some gentle movement and fresh air.",
            "Evening walks are great for reflection and relaxation. Join us?"
          ]
        },
        conditions: {
          timeContext: ['evening'],
          inactivityRange: [60, 180]
        },
        personalizationTokens: ['{name}', '{dailyProgress}', '{mood}']
      },

      // Progress-based Messages
      {
        id: 'progress_celebration',
        type: 'progress',
        templates: {
          title: [
            "Amazing Progress! 🎉",
            "You're On Fire! 🔥",
            "Incredible Streak! ⚡",
            "Goal Crusher! 🏆"
          ],
          body: [
            "You've walked {totalSteps} steps this week - that's fantastic progress!",
            "Your {streak}-day streak is impressive! Ready to keep it going?",
            "You're {percentToGoal}% closer to your weekly goal. Let's finish strong!",
            "Your consistency is paying off - {improvementPercent}% improvement this month!"
          ]
        },
        conditions: {
          activityTrend: 'increasing'
        },
        personalizationTokens: ['{totalSteps}', '{streak}', '{percentToGoal}', '{improvementPercent}']
      },

      // Gentle Reminders
      {
        id: 'gentle_reminder',
        type: 'reminder',
        templates: {
          title: [
            "Friendly Reminder 😊",
            "Just Checking In! 👋",
            "Thinking of You! 💭",
            "Gentle Nudge! 🤗"
          ],
          body: [
            "It's been a while since your last walk. No pressure - just wanted to check in!",
            "Your walking buddy app is here whenever you're ready to move!",
            "No rush, but we're here when you want to add some movement to your day.",
            "Take your time - we'll be here whenever you're ready for your next adventure!"
          ]
        },
        conditions: {
          inactivityRange: [180, 480] // 3-8 hours
        },
        personalizationTokens: ['{name}', '{lastWalk}']
      },

      // Achievement Messages
      {
        id: 'achievement_unlock',
        type: 'achievement',
        templates: {
          title: [
            "Achievement Unlocked! 🏅",
            "New Milestone! 🎯",
            "Congratulations! 🎊",
            "You Did It! ✨"
          ],
          body: [
            "Congratulations! You've reached your {achievementType} goal!",
            "Amazing! You've unlocked the '{badgeName}' achievement!",
            "Incredible work! You've completed {challengeName}!",
            "You're unstoppable! New personal record: {recordType}!"
          ]
        },
        conditions: {},
        personalizationTokens: ['{achievementType}', '{badgeName}', '{challengeName}', '{recordType}']
      }
    ];
  }

  public async generateMessage(context: MessageGenerationContext): Promise<MotivationalMessage | null> {
    return this.generateMotivationalMessage(context);
  }

  private async generateMotivationalMessage(context: MessageGenerationContext): Promise<MotivationalMessage | null> {
    try {
      // Get user personalization data
      const personalizationData = await this.getUserPersonalizationData(context.userId);
      
      // Analyze context to determine message type and priority
      const messageType = this.determineMessageType(context);
      const priority = this.determinePriority(context);
      
      // Find suitable templates
      const suitableTemplates = this.findSuitableTemplates(context, messageType);
      
      if (suitableTemplates.length === 0) {
        return null; // No suitable template found
      }
      
      // Select template based on variety and user history
      const selectedTemplate = this.selectTemplate(suitableTemplates, context.userId);
      
      // Generate personalized message
      const message = await this.personalizeMessage(selectedTemplate, context, personalizationData);
      
      return {
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: messageType,
        title: message.title,
        body: message.body,
        category: selectedTemplate.id,
        personalizedFor: context.userId,
        priority: priority,
        timeContext: context.timeContext
      };
    } catch (error) {
      console.error('Error generating motivational message:', error);
      return null;
    }
  }

  private determineMessageType(context: MessageGenerationContext): 'motivational' | 'progress' | 'reminder' | 'achievement' {
    const { inactivityMinutes, activityPattern, recentStats } = context;
    
    // Check for achievements first
    if (this.hasRecentAchievement(recentStats)) {
      return 'achievement';
    }
    
    // Check for progress celebration
    if (this.shouldCelebrateProgress(recentStats, activityPattern)) {
      return 'progress';
    }
    
    // Long inactivity = gentle reminder
    if (inactivityMinutes > 180) { // 3+ hours
      return 'reminder';
    }
    
    // Default to motivational
    return 'motivational';
  }

  private determinePriority(context: MessageGenerationContext): 'low' | 'medium' | 'high' {
    const { inactivityMinutes, activityPattern } = context;
    
    // High priority for very active users who've been inactive
    if (activityPattern.engagementLevel === 'high' && inactivityMinutes > 120) {
      return 'high';
    }
    
    // Low priority for low engagement users or very long inactivity
    if (activityPattern.engagementLevel === 'low' || inactivityMinutes > 300) {
      return 'low';
    }
    
    return 'medium';
  }

  private findSuitableTemplates(context: MessageGenerationContext, messageType: string): MessageTemplate[] {
    return this.messageTemplates.filter(template => {
      // Match message type
      if (template.type !== messageType) return false;
      
      // Check conditions
      const conditions = template.conditions;
      
      // Check engagement level
      if (conditions.engagementLevel && 
          !conditions.engagementLevel.includes(context.activityPattern.engagementLevel)) {
        return false;
      }
      
      // Check time context
      if (conditions.timeContext && 
          !conditions.timeContext.includes(context.timeContext)) {
        return false;
      }
      
      // Check inactivity range
      if (conditions.inactivityRange) {
        const [min, max] = conditions.inactivityRange;
        if (context.inactivityMinutes < min || context.inactivityMinutes > max) {
          return false;
        }
      }
      
      // Check activity trend
      if (conditions.activityTrend) {
        const trend = this.calculateActivityTrend(context.recentStats);
        if (trend !== conditions.activityTrend) {
          return false;
        }
      }
      
      return true;
    });
  }

  private selectTemplate(templates: MessageTemplate[], userId: string): MessageTemplate {
    // For now, select randomly to ensure variety
    // In a more advanced implementation, this could consider user history
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  private async personalizeMessage(
    template: MessageTemplate, 
    context: MessageGenerationContext, 
    personalizationData: any
  ): Promise<{ title: string; body: string }> {
    // Select random title and body from template
    const titleOptions = template.templates.title;
    const bodyOptions = template.templates.body;
    
    const selectedTitle = titleOptions[Math.floor(Math.random() * titleOptions.length)];
    const selectedBody = bodyOptions[Math.floor(Math.random() * bodyOptions.length)];
    
    // Apply personalization tokens
    const personalizedTitle = this.applyPersonalizationTokens(selectedTitle, context, personalizationData);
    const personalizedBody = this.applyPersonalizationTokens(selectedBody, context, personalizationData);
    
    return {
      title: personalizedTitle,
      body: personalizedBody
    };
  }

  private applyPersonalizationTokens(text: string, context: MessageGenerationContext, data: any): string {
    let personalizedText = text;
    
    // Replace common tokens
    personalizedText = personalizedText.replace(/{name}/g, data.name || 'there');
    personalizedText = personalizedText.replace(/{todaySteps}/g, data.todaySteps?.toString() || '0');
    personalizedText = personalizedText.replace(/{weeklySteps}/g, data.weeklySteps?.toString() || '0');
    personalizedText = personalizedText.replace(/{dailyGoal}/g, data.dailyGoal?.toString() || '10,000');
    personalizedText = personalizedText.replace(/{streak}/g, data.streak?.toString() || '1');
    personalizedText = personalizedText.replace(/{progress}/g, `${data.progressPercent || 0}%`);
    
    // Calculate dynamic values
    const percentToGoal = data.weeklySteps && data.weeklyGoal ? 
      Math.round((data.weeklySteps / data.weeklyGoal) * 100) : 0;
    personalizedText = personalizedText.replace(/{percentToGoal}/g, percentToGoal.toString());
    
    const improvementPercent = this.calculateImprovement(context.recentStats);
    personalizedText = personalizedText.replace(/{improvementPercent}/g, improvementPercent.toString());
    
    return personalizedText;
  }

  private async getUserPersonalizationData(userId: string): Promise<any> {
    // Check cache first
    if (this.userPersonalizationData.has(userId)) {
      return this.userPersonalizationData.get(userId);
    }

    try {
      // Get user profile and recent stats
      const { supabase } = await import('../lib/supabase');
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        return {};
      }
      
      const [profileResult, statsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('walking_sessions')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
      ]);
      
      const profile = profileResult.data;
      const recentSessions = statsResult.data || [];
      
      // Calculate personalization data
      const data = {
        name: profile?.name || profile?.email?.split('@')[0] || 'there',
        todaySteps: this.calculateTodaySteps(recentSessions),
        weeklySteps: this.calculateWeeklySteps(recentSessions),
        dailyGoal: profile?.daily_step_goal || 10000,
        weeklyGoal: (profile?.daily_step_goal || 10000) * 7,
        streak: this.calculateStreak(recentSessions),
        progressPercent: this.calculateProgressPercent(recentSessions, profile?.daily_step_goal || 10000)
      };
      
      // Cache for 1 hour
      this.userPersonalizationData.set(userId, data);
      setTimeout(() => {
        this.userPersonalizationData.delete(userId);
      }, 60 * 60 * 1000);
      
      return data;
    } catch (error) {
      console.error('Error getting user personalization data:', error);
      return {};
    }
  }

  // Helper methods for calculations
  private hasRecentAchievement(recentStats: any[]): boolean {
    // Check if user has achieved something recently
    // This would integrate with achievement system
    return false; // Placeholder
  }

  private shouldCelebrateProgress(recentStats: any[], activityPattern: UserActivityPattern): boolean {
    const trend = this.calculateActivityTrend(recentStats);
    return trend === 'increasing' && activityPattern.engagementLevel !== 'low';
  }

  private calculateActivityTrend(recentStats: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (recentStats.length < 2) return 'stable';
    
    const recent = recentStats.slice(0, 3);
    const older = recentStats.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, session) => sum + (session.steps || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, session) => sum + (session.steps || 0), 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    const threshold = olderAvg * 0.1; // 10% threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  private calculateTodaySteps(sessions: any[]): number {
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter(session => session.created_at.startsWith(today))
      .reduce((sum, session) => sum + (session.steps || 0), 0);
  }

  private calculateWeeklySteps(sessions: any[]): number {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return sessions
      .filter(session => new Date(session.created_at) >= weekAgo)
      .reduce((sum, session) => sum + (session.steps || 0), 0);
  }

  private calculateStreak(sessions: any[]): number {
    // Calculate consecutive days with activity
    const days = new Set();
    sessions.forEach(session => {
      if (session.steps > 0) {
        days.add(session.created_at.split('T')[0]);
      }
    });
    
    return days.size; // Simplified streak calculation
  }

  private calculateProgressPercent(sessions: any[], dailyGoal: number): number {
    const todaySteps = this.calculateTodaySteps(sessions);
    return Math.min(Math.round((todaySteps / dailyGoal) * 100), 100);
  }

  private calculateImprovement(recentStats: any[]): number {
    // Calculate improvement percentage over last month
    const thisWeek = recentStats.slice(0, 7);
    const lastWeek = recentStats.slice(7, 14);
    
    if (lastWeek.length === 0) return 0;
    
    const thisWeekAvg = thisWeek.reduce((sum, s) => sum + (s.steps || 0), 0) / thisWeek.length;
    const lastWeekAvg = lastWeek.reduce((sum, s) => sum + (s.steps || 0), 0) / lastWeek.length;
    
    if (lastWeekAvg === 0) return 0;
    
    return Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100);
  }
}

// Export singleton instance
const aiMessageGenerator = new AIMessageGenerator();

export async function generateMotivationalMessage(context: MessageGenerationContext): Promise<MotivationalMessage | null> {
  return aiMessageGenerator.generateMessage(context);
}

export default aiMessageGenerator;