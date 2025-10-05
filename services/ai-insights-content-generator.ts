import { MotivationPredictionResponse, MotivationTrendData } from '../lib/motivation-service';
import { WalkingSession, BasicStats } from '../contexts/WalkingContext';
import { JournalEntry } from '../types/walking';

export interface AIInsightContent {
  id: string;
  title: string;
  content: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  type: 'motivation' | 'performance' | 'recommendation' | 'achievement';
  timestamp: number;
  confidence: number;
}

export interface InsightGenerationContext {
  recentSessions: WalkingSession[];
  basicStats: BasicStats;
  motivationData?: MotivationPredictionResponse;
  motivationTrends?: MotivationTrendData[];
  journalEntries?: JournalEntry[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
  isWeekend: boolean;
}

export interface PersonalizedInsightTemplates {
  motivation: {
    high: string[];
    medium: string[];
    low: string[];
  };
  performance: {
    improving: string[];
    stable: string[];
    declining: string[];
  };
  recommendations: {
    timing: string[];
    frequency: string[];
    duration: string[];
    motivation: string[];
  };
  achievements: {
    streak: string[];
    distance: string[];
    consistency: string[];
    improvement: string[];
  };
}

export class AIInsightsContentGenerator {
  private templates: PersonalizedInsightTemplates;
  private lastGeneratedInsights: Map<string, AIInsightContent> = new Map();

  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Generates personalized AI insights for the home screen
   */
  public async generateHomeInsights(context: InsightGenerationContext): Promise<AIInsightContent> {
    try {
      const insights = await this.analyzeUserContext(context);
      const primaryInsight = this.selectPrimaryInsight(insights, 'home');
      
      // Cache the insight to avoid repetition
      this.lastGeneratedInsights.set('home', primaryInsight);
      
      return primaryInsight;
    } catch (error) {
      console.error('Error generating home insights:', error);
      return this.getFallbackInsight('home');
    }
  }

  /**
   * Generates personalized AI insights for the progress screen
   */
  public async generateProgressInsights(context: InsightGenerationContext): Promise<AIInsightContent> {
    try {
      const insights = await this.analyzeUserContext(context);
      const progressInsight = this.selectPrimaryInsight(insights, 'progress');
      
      // Cache the insight to avoid repetition
      this.lastGeneratedInsights.set('progress', progressInsight);
      
      return progressInsight;
    } catch (error) {
      console.error('Error generating progress insights:', error);
      return this.getFallbackInsight('progress');
    }
  }

  /**
   * Analyzes user context to generate relevant insights
   */
  private async analyzeUserContext(context: InsightGenerationContext): Promise<AIInsightContent[]> {
    const insights: AIInsightContent[] = [];
    
    // Analyze motivation trends
    if (context.motivationData) {
      insights.push(...this.generateMotivationInsights(context));
    }
    
    // Analyze performance patterns
    insights.push(...this.generatePerformanceInsights(context));
    
    // Generate recommendations
    insights.push(...this.generateRecommendationInsights(context));
    
    // Check for achievements
    insights.push(...this.generateAchievementInsights(context));
    
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generates motivation-based insights
   */
  private generateMotivationInsights(context: InsightGenerationContext): AIInsightContent[] {
    const insights: AIInsightContent[] = [];
    const { motivationData } = context;
    
    if (!motivationData) return insights;
    
    const motivationState = motivationData.motivation_state;
    const confidence = motivationData.confidence;
    
    // Generate insight based on motivation state
    const templates = this.templates.motivation[motivationState];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Personalize the template with user data
    const personalizedContent = this.personalizeTemplate(template, context);
    
    insights.push({
      id: `motivation-${Date.now()}`,
      title: this.getMotivationTitle(motivationState),
      content: personalizedContent,
      icon: this.getMotivationIcon(motivationState),
      priority: motivationState === 'high' ? 'high' : motivationState === 'medium' ? 'medium' : 'low',
      type: 'motivation',
      timestamp: Date.now(),
      confidence: confidence
    });
    
    return insights;
  }

  /**
   * Generates performance-based insights
   */
  private generatePerformanceInsights(context: InsightGenerationContext): AIInsightContent[] {
    const insights: AIInsightContent[] = [];
    const { recentSessions } = context;
    
    if (recentSessions.length === 0) {
      insights.push({
        id: `performance-${Date.now()}`,
        title: "Ready to Start?",
        content: "It's a great day to begin your walking journey! Even a short 10-minute walk can boost your mood and energy.",
        icon: "walk",
        priority: 'high',
        type: 'recommendation',
        timestamp: Date.now(),
        confidence: 0.9
      });
      return insights;
    }
    
    // Analyze recent performance trends
    const performanceTrend = this.analyzePerformanceTrend(recentSessions);
    const templates = this.templates.performance[performanceTrend];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const personalizedContent = this.personalizeTemplate(template, context);
    
    insights.push({
      id: `performance-${Date.now()}`,
      title: this.getPerformanceTitle(performanceTrend),
      content: personalizedContent,
      icon: this.getPerformanceIcon(performanceTrend),
      priority: performanceTrend === 'improving' ? 'high' : 'medium',
      type: 'performance',
      timestamp: Date.now(),
      confidence: 0.8
    });
    
    return insights;
  }

  /**
   * Generates recommendation insights
   */
  private generateRecommendationInsights(context: InsightGenerationContext): AIInsightContent[] {
    const insights: AIInsightContent[] = [];
    const { recentSessions, timeOfDay } = context;
    
    // Analyze optimal walking times
    const optimalTime = this.findOptimalWalkingTime(recentSessions, timeOfDay);
    if (optimalTime) {
      const templates = this.templates.recommendations.timing;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const personalizedContent = this.personalizeTemplate(template, context, { optimalTime });
      
      insights.push({
        id: `recommendation-${Date.now()}`,
        title: "Perfect Timing",
        content: personalizedContent,
        icon: "time",
        priority: 'medium',
        type: 'recommendation',
        timestamp: Date.now(),
        confidence: 0.7
      });
    }
    
    return insights;
  }

  /**
   * Generates achievement insights
   */
  private generateAchievementInsights(context: InsightGenerationContext): AIInsightContent[] {
    const insights: AIInsightContent[] = [];
    const { recentSessions } = context;
    
    // Check for streaks
    const streak = this.calculateWalkingStreak(recentSessions);
    if (streak >= 3) {
      const templates = this.templates.achievements.streak;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const personalizedContent = this.personalizeTemplate(template, context, { streak });
      
      insights.push({
        id: `achievement-${Date.now()}`,
        title: "Amazing Streak!",
        content: personalizedContent,
        icon: "trophy",
        priority: 'high',
        type: 'achievement',
        timestamp: Date.now(),
        confidence: 0.95
      });
    }
    
    return insights;
  }

  /**
   * Selects the most appropriate insight for the given screen
   */
  private selectPrimaryInsight(insights: AIInsightContent[], screen: 'home' | 'progress'): AIInsightContent {
    if (insights.length === 0) {
      return this.getFallbackInsight(screen);
    }
    
    // For home screen, prioritize motivation and achievements
    if (screen === 'home') {
      const homeRelevant = insights.filter(i => 
        i.type === 'motivation' || i.type === 'achievement' || i.type === 'recommendation'
      );
      return homeRelevant.length > 0 ? homeRelevant[0] : insights[0];
    }
    
    // For progress screen, prioritize performance and trends
    if (screen === 'progress') {
      const progressRelevant = insights.filter(i => 
        i.type === 'performance' || i.type === 'achievement'
      );
      return progressRelevant.length > 0 ? progressRelevant[0] : insights[0];
    }
    
    return insights[0];
  }

  /**
   * Personalizes template with user-specific data
   */
  private personalizeTemplate(
    template: string, 
    context: InsightGenerationContext, 
    additionalData?: Record<string, any>
  ): string {
    let personalized = template;
    
    // Replace placeholders with actual data
    const { basicStats, recentSessions, timeOfDay } = context;
    
    personalized = personalized.replace('{steps}', basicStats.steps.toLocaleString());
    personalized = personalized.replace('{distance}', basicStats.distance.toFixed(1));
    personalized = personalized.replace('{walks}', basicStats.walks.toString());
    personalized = personalized.replace('{timeOfDay}', timeOfDay);
    
    if (recentSessions.length > 0) {
      const avgDuration = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
      personalized = personalized.replace('{avgDuration}', Math.round(avgDuration).toString());
    }
    
    // Apply additional data if provided
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        personalized = personalized.replace(`{${key}}`, value.toString());
      });
    }
    
    return personalized;
  }

  /**
   * Analyzes performance trend from recent sessions
   */
  private analyzePerformanceTrend(sessions: WalkingSession[]): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 2) return 'stable';
    
    const recent = sessions.slice(-3);
    const older = sessions.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, s) => sum + (s.distance || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + (s.distance || 0), 0) / older.length;
    
    const improvement = (recentAvg - olderAvg) / olderAvg;
    
    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Finds optimal walking time based on user patterns
   */
  private findOptimalWalkingTime(sessions: WalkingSession[], currentTime: string): string | null {
    if (sessions.length < 3) return null;
    
    const timePatterns = sessions.reduce((acc, session) => {
      const hour = new Date(session.startTime).getHours();
      let period = 'morning';
      if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17) period = 'evening';
      
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActive = Object.entries(timePatterns)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    return mostActive !== currentTime ? mostActive : null;
  }

  /**
   * Calculates walking streak
   */
  private calculateWalkingStreak(sessions: WalkingSession[]): number {
    if (sessions.length === 0) return 0;
    
    const sortedSessions = sessions.sort((a, b) => b.startTime - a.startTime);
    let streak = 0;
    let currentDate = new Date();
    
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.startTime);
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= streak + 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Gets fallback insight when generation fails
   */
  private getFallbackInsight(screen: 'home' | 'progress'): AIInsightContent {
    const fallbacks = {
      home: {
        title: "Keep Moving Forward",
        content: "Every step counts towards your wellness journey. Ready to make today count?",
        icon: "walk"
      },
      progress: {
        title: "Your Journey Continues",
        content: "Track your progress and celebrate every milestone on your path to better health.",
        icon: "trending-up"
      }
    };
    
    const fallback = fallbacks[screen];
    
    return {
      id: `fallback-${screen}-${Date.now()}`,
      title: fallback.title,
      content: fallback.content,
      icon: fallback.icon,
      priority: 'medium',
      type: 'motivation',
      timestamp: Date.now(),
      confidence: 0.5
    };
  }

  /**
   * Helper methods for titles and icons
   */
  private getMotivationTitle(state: string): string {
    const titles = {
      high: "You're On Fire! 🔥",
      medium: "Steady Progress 📈",
      low: "New Beginnings 🌱"
    };
    return titles[state as keyof typeof titles] || "Keep Going!";
  }

  private getMotivationIcon(state: string): string {
    const icons = {
      high: "flash",
      medium: "trending-up",
      low: "leaf"
    };
    return icons[state as keyof typeof icons] || "heart";
  }

  private getPerformanceTitle(trend: string): string {
    const titles = {
      improving: "Excellent Progress! 🚀",
      stable: "Consistent Effort 💪",
      declining: "Time to Recharge ⚡"
    };
    return titles[trend as keyof typeof titles] || "Keep Moving!";
  }

  private getPerformanceIcon(trend: string): string {
    const icons = {
      improving: "trending-up",
      stable: "checkmark-circle",
      declining: "refresh"
    };
    return icons[trend as keyof typeof icons] || "activity";
  }

  /**
   * Initialize insight templates
   */
  private initializeTemplates(): PersonalizedInsightTemplates {
    return {
      motivation: {
        high: [
          "Your motivation is soaring! You've walked {distance} km this week. Keep riding this wave of energy!",
          "Amazing energy levels! Your {timeOfDay} walks are really paying off. You're {steps} steps closer to your goals!",
          "You're in the zone! Your consistency is inspiring - {walks} walks completed with great enthusiasm!"
        ],
        medium: [
          "Steady progress! You've maintained {distance} km this week. Small steps lead to big changes.",
          "You're building great habits! Your {avgDuration}-minute walks are becoming a healthy routine.",
          "Consistent effort pays off! You've completed {walks} walks - keep the momentum going!"
        ],
        low: [
          "Every journey starts with a single step. Ready to take yours today?",
          "It's okay to start small. Even a 10-minute walk can boost your mood and energy.",
          "Your wellness journey is waiting. What small step can you take right now?"
        ]
      },
      performance: {
        improving: [
          "Outstanding improvement! Your recent walks show a {improvement}% increase in distance. You're getting stronger!",
          "Your performance is trending upward! Keep pushing those boundaries - you're capable of amazing things!",
          "Incredible progress! Your dedication is showing real results. Your body is adapting beautifully to the challenge!"
        ],
        stable: [
          "Solid consistency! You're maintaining great performance with {distance} km average. Stability builds strength!",
          "Your steady approach is working! Consistent {avgDuration}-minute walks are building lasting fitness.",
          "Reliable progress! Your commitment to regular walking is creating a strong foundation for health."
        ],
        declining: [
          "Time to reignite that spark! Your body is ready for a fresh challenge. What's one small change you can make?",
          "Every champion has comeback moments. Your next walk could be the start of something amazing!",
          "Rest and recovery are part of the journey. Ready to bounce back stronger than before?"
        ]
      },
      recommendations: {
        timing: [
          "Your most successful walks happen in the {optimalTime}. Consider scheduling your next walk then for best results!",
          "Pattern detected: You perform best during {optimalTime} hours. Use this insight to optimize your routine!",
          "Your energy peaks in the {optimalTime}. That might be your golden hour for walking!"
        ],
        frequency: [
          "Based on your pattern, adding one more walk per week could boost your progress by 25%!",
          "Your body responds well to your current frequency. Consider maintaining this rhythm for optimal results.",
          "Gradual increases work best. Try adding 5 minutes to your walks this week!"
        ],
        duration: [
          "Your sweet spot seems to be {avgDuration}-minute walks. This duration maximizes your enjoyment and results!",
          "Consider extending your walks by 2-3 minutes. Your body is ready for the next level!",
          "Quality over quantity! Your focused {avgDuration}-minute sessions are more effective than longer, less intense walks."
        ],
        motivation: [
          "Try walking during your peak energy time: {optimalTime}. You'll feel more motivated and energized!",
          "Your motivation stays high when you walk consistently. Keep that rhythm going!",
          "Mix up your routes to keep things interesting. Variety fuels motivation!"
        ]
      },
      achievements: {
        streak: [
          "Incredible {streak}-day streak! You're building an unbreakable habit. This consistency will transform your health!",
          "Wow! {streak} days in a row! You're proving that commitment creates results. Keep this momentum alive!",
          "Your {streak}-day streak is inspiring! You've shown that small daily actions create big life changes!"
        ],
        distance: [
          "Distance milestone achieved! You've walked {distance} km total. That's like walking across your entire city!",
          "Amazing distance covered! {distance} km represents serious dedication to your health journey!",
          "You've conquered {distance} km! Each kilometer is a victory worth celebrating!"
        ],
        consistency: [
          "Your consistency is remarkable! {walks} walks completed shows real commitment to your wellbeing.",
          "Steady wins the race! Your {walks} completed walks prove that persistence pays off!",
          "Consistency champion! {walks} walks show you've mastered the art of showing up for yourself!"
        ],
        improvement: [
          "Your improvement trajectory is impressive! You're {improvement}% better than when you started!",
          "Growth mindset in action! Your continuous improvement shows what's possible with dedication!",
          "You're evolving! Your {improvement}% improvement proves that every step forward matters!"
        ]
      }
    };
  }
}

export default AIInsightsContentGenerator;