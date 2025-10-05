import { DatabaseService, UserGoal, WalkingSession, MotivationJournal } from '../lib/database-improved';
import { PerformanceMonitor } from '../utils/performance';

export interface GoalAdjustmentConfig {
  minAdjustmentThreshold: number; // Minimum performance change to trigger adjustment
  maxAdjustmentPercentage: number; // Maximum percentage change per adjustment
  evaluationPeriodDays: number; // Days to look back for performance evaluation
  adaptationSensitivity: 'low' | 'medium' | 'high';
}

export interface UserPerformanceMetrics {
  averageStepsPerDay: number;
  averageWalkDuration: number;
  averageDistance: number;
  goalAchievementRate: number;
  consistencyScore: number;
  motivationTrend: number;
  recentPerformanceChange: number;
}

export interface GoalAdjustmentRecommendation {
  goalId: string;
  currentTarget: number;
  recommendedTarget: number;
  adjustmentReason: string;
  confidence: number;
  expectedImpact: 'positive' | 'neutral' | 'challenging';
}

export class AdaptiveGoalService {
  private static instance: AdaptiveGoalService;
  private performanceMonitor: PerformanceMonitor;
  
  private defaultConfig: GoalAdjustmentConfig = {
    minAdjustmentThreshold: 0.15, // 15% performance change
    maxAdjustmentPercentage: 0.25, // 25% max adjustment
    evaluationPeriodDays: 14, // 2 weeks evaluation
    adaptationSensitivity: 'medium'
  };

  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  public static getInstance(): AdaptiveGoalService {
    if (!AdaptiveGoalService.instance) {
      AdaptiveGoalService.instance = new AdaptiveGoalService();
    }
    return AdaptiveGoalService.instance;
  }

  /**
   * Analyzes user performance and generates goal adjustment recommendations
   */
  public async analyzeAndRecommendGoalAdjustments(
    userId: string,
    config: Partial<GoalAdjustmentConfig> = {}
  ): Promise<GoalAdjustmentRecommendation[]> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      // Get user's current active goals
      const activeGoals = await this.getUserActiveGoals(userId);
      if (activeGoals.length === 0) {
        return [];
      }

      // Calculate user performance metrics
      const performanceMetrics = await this.calculateUserPerformanceMetrics(
        userId, 
        finalConfig.evaluationPeriodDays
      );

      // Generate recommendations for each goal
      const recommendations: GoalAdjustmentRecommendation[] = [];
      
      for (const goal of activeGoals) {
        const recommendation = await this.generateGoalRecommendation(
          goal,
          performanceMetrics,
          finalConfig
        );
        
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error analyzing goal adjustments:', error);
      return [];
    }
  }

  /**
   * Automatically applies goal adjustments based on user behavior patterns
   */
  public async applyAdaptiveGoalAdjustments(
    userId: string,
    autoApprove: boolean = false,
    config: Partial<GoalAdjustmentConfig> = {}
  ): Promise<{ applied: GoalAdjustmentRecommendation[], pending: GoalAdjustmentRecommendation[] }> {
    try {
      const recommendations = await this.analyzeAndRecommendGoalAdjustments(userId, config);
      
      const applied: GoalAdjustmentRecommendation[] = [];
      const pending: GoalAdjustmentRecommendation[] = [];

      for (const recommendation of recommendations) {
        // Auto-apply if confidence is high and user has auto-approval enabled
        if (autoApprove && recommendation.confidence >= 0.8) {
          const success = await this.applyGoalAdjustment(recommendation);
          if (success) {
            applied.push(recommendation);
          } else {
            pending.push(recommendation);
          }
        } else {
          pending.push(recommendation);
        }
      }

      return { applied, pending };
    } catch (error) {
      console.error('Error applying adaptive goal adjustments:', error);
      return { applied: [], pending: [] };
    }
  }

  /**
   * Calculates comprehensive user performance metrics
   */
  private async calculateUserPerformanceMetrics(
    userId: string,
    evaluationPeriodDays: number
  ): Promise<UserPerformanceMetrics> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - evaluationPeriodDays);

    // Get walking sessions for the evaluation period
    const sessions = await this.getWalkingSessionsInPeriod(userId, startDate, endDate);
    
    // Get motivation journal entries
    const journalEntries = await this.getMotivationEntriesInPeriod(userId, startDate, endDate);

    // Calculate metrics
    const totalDays = evaluationPeriodDays;
    const activeDays = new Set(sessions.map(s => s.start_time.split('T')[0])).size;
    
    const averageStepsPerDay = sessions.reduce((sum, s) => sum + (s.steps || 0), 0) / totalDays;
    const averageWalkDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / Math.max(sessions.length, 1);
    const averageDistance = sessions.reduce((sum, s) => sum + (s.distance || 0), 0) / totalDays;
    
    // Calculate goal achievement rate
    const goalAchievementRate = await this.calculateGoalAchievementRate(userId, startDate, endDate);
    
    // Calculate consistency score (how many days user was active)
    const consistencyScore = activeDays / totalDays;
    
    // Calculate motivation trend from journal entries
    const motivationTrend = this.calculateMotivationTrend(journalEntries);
    
    // Calculate recent performance change (last week vs previous week)
    const recentPerformanceChange = await this.calculateRecentPerformanceChange(userId, evaluationPeriodDays);

    return {
      averageStepsPerDay,
      averageWalkDuration,
      averageDistance,
      goalAchievementRate,
      consistencyScore,
      motivationTrend,
      recentPerformanceChange
    };
  }

  /**
   * Generates a goal adjustment recommendation for a specific goal
   */
  private async generateGoalRecommendation(
    goal: UserGoal,
    metrics: UserPerformanceMetrics,
    config: GoalAdjustmentConfig
  ): Promise<GoalAdjustmentRecommendation | null> {
    const currentTarget = goal.target_value;
    let recommendedTarget = currentTarget;
    let adjustmentReason = '';
    let confidence = 0;
    let expectedImpact: 'positive' | 'neutral' | 'challenging' = 'neutral';

    // Determine adjustment based on goal type and performance
    switch (goal.type) {
      case 'daily_steps':
        const stepAdjustment = this.calculateStepGoalAdjustment(metrics, config);
        recommendedTarget = Math.round(currentTarget * (1 + stepAdjustment.percentage));
        adjustmentReason = stepAdjustment.reason;
        confidence = stepAdjustment.confidence;
        expectedImpact = stepAdjustment.impact;
        break;

      case 'weekly_walks':
        const walkAdjustment = this.calculateWalkFrequencyAdjustment(metrics, config);
        recommendedTarget = Math.max(1, Math.round(currentTarget * (1 + walkAdjustment.percentage)));
        adjustmentReason = walkAdjustment.reason;
        confidence = walkAdjustment.confidence;
        expectedImpact = walkAdjustment.impact;
        break;

      case 'monthly_distance':
        const distanceAdjustment = this.calculateDistanceGoalAdjustment(metrics, config);
        recommendedTarget = Math.round(currentTarget * (1 + distanceAdjustment.percentage) * 100) / 100;
        adjustmentReason = distanceAdjustment.reason;
        confidence = distanceAdjustment.confidence;
        expectedImpact = distanceAdjustment.impact;
        break;

      default:
        return null; // Don't adjust custom or other goal types automatically
    }

    // Only recommend if adjustment is significant enough
    const adjustmentPercentage = Math.abs((recommendedTarget - currentTarget) / currentTarget);
    if (adjustmentPercentage < config.minAdjustmentThreshold) {
      return null;
    }

    // Cap the adjustment to maximum allowed percentage
    const maxChange = currentTarget * config.maxAdjustmentPercentage;
    if (recommendedTarget > currentTarget + maxChange) {
      recommendedTarget = currentTarget + maxChange;
    } else if (recommendedTarget < currentTarget - maxChange) {
      recommendedTarget = currentTarget - maxChange;
    }

    return {
      goalId: goal.id,
      currentTarget,
      recommendedTarget,
      adjustmentReason,
      confidence,
      expectedImpact
    };
  }

  /**
   * Calculates step goal adjustment based on performance metrics
   */
  private calculateStepGoalAdjustment(
    metrics: UserPerformanceMetrics,
    config: GoalAdjustmentConfig
  ): { percentage: number; reason: string; confidence: number; impact: 'positive' | 'neutral' | 'challenging' } {
    let percentage = 0;
    let reason = '';
    let confidence = 0;
    let impact: 'positive' | 'neutral' | 'challenging' = 'neutral';

    // High achievement rate and positive trend - increase goal
    if (metrics.goalAchievementRate > 0.8 && metrics.motivationTrend > 0.1) {
      percentage = 0.15; // 15% increase
      reason = 'Consistently exceeding goals with high motivation - ready for a challenge';
      confidence = 0.9;
      impact = 'challenging';
    }
    // Good achievement but declining motivation - slight increase
    else if (metrics.goalAchievementRate > 0.7 && metrics.motivationTrend > -0.1) {
      percentage = 0.08; // 8% increase
      reason = 'Good performance with stable motivation - gradual progression';
      confidence = 0.7;
      impact = 'positive';
    }
    // Low achievement rate - decrease goal
    else if (metrics.goalAchievementRate < 0.5) {
      percentage = -0.12; // 12% decrease
      reason = 'Struggling to meet current goals - adjusting for better success rate';
      confidence = 0.8;
      impact = 'positive';
    }
    // Declining performance - small decrease
    else if (metrics.recentPerformanceChange < -0.2) {
      percentage = -0.08; // 8% decrease
      reason = 'Recent performance decline - providing more achievable target';
      confidence = 0.6;
      impact = 'positive';
    }

    // Adjust based on sensitivity setting
    const sensitivityMultiplier = config.adaptationSensitivity === 'high' ? 1.3 : 
                                 config.adaptationSensitivity === 'low' ? 0.7 : 1.0;
    percentage *= sensitivityMultiplier;

    return { percentage, reason, confidence, impact };
  }

  /**
   * Calculates walk frequency adjustment
   */
  private calculateWalkFrequencyAdjustment(
    metrics: UserPerformanceMetrics,
    config: GoalAdjustmentConfig
  ): { percentage: number; reason: string; confidence: number; impact: 'positive' | 'neutral' | 'challenging' } {
    let percentage = 0;
    let reason = '';
    let confidence = 0;
    let impact: 'positive' | 'neutral' | 'challenging' = 'neutral';

    // High consistency - can handle more frequent walks
    if (metrics.consistencyScore > 0.85 && metrics.motivationTrend > 0) {
      percentage = 0.2; // 20% increase
      reason = 'Excellent consistency - ready for more frequent walks';
      confidence = 0.85;
      impact = 'challenging';
    }
    // Low consistency - reduce frequency
    else if (metrics.consistencyScore < 0.4) {
      percentage = -0.15; // 15% decrease
      reason = 'Low consistency - focusing on sustainable frequency';
      confidence = 0.8;
      impact = 'positive';
    }

    return { percentage, reason, confidence, impact };
  }

  /**
   * Calculates distance goal adjustment
   */
  private calculateDistanceGoalAdjustment(
    metrics: UserPerformanceMetrics,
    config: GoalAdjustmentConfig
  ): { percentage: number; reason: string; confidence: number; impact: 'positive' | 'neutral' | 'challenging' } {
    let percentage = 0;
    let reason = '';
    let confidence = 0;
    let impact: 'positive' | 'neutral' | 'challenging' = 'neutral';

    // Strong distance performance - increase goal
    if (metrics.averageDistance > 0 && metrics.goalAchievementRate > 0.75) {
      percentage = 0.12; // 12% increase
      reason = 'Strong distance performance - pushing for greater achievements';
      confidence = 0.8;
      impact = 'challenging';
    }
    // Poor distance performance - decrease goal
    else if (metrics.goalAchievementRate < 0.5) {
      percentage = -0.1; // 10% decrease
      reason = 'Distance goals too ambitious - adjusting for better success';
      confidence = 0.75;
      impact = 'positive';
    }

    return { percentage, reason, confidence, impact };
  }

  /**
   * Helper methods for data retrieval and calculations
   */
  private async getUserActiveGoals(userId: string): Promise<UserGoal[]> {
    try {
      const result = await DatabaseService.getUserGoals(userId);
      return result.success ? result.data.filter(goal => goal.status === 'active') : [];
    } catch (error) {
      console.error('Error fetching user goals:', error);
      return [];
    }
  }

  private async getWalkingSessionsInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WalkingSession[]> {
    try {
      const result = await DatabaseService.getWalkingSessions(userId);
      if (!result.success) return [];
      
      return result.data.filter(session => {
        const sessionDate = new Date(session.start_time);
        return sessionDate >= startDate && sessionDate <= endDate;
      });
    } catch (error) {
      console.error('Error fetching walking sessions:', error);
      return [];
    }
  }

  private async getMotivationEntriesInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MotivationJournal[]> {
    try {
      const result = await DatabaseService.getMotivationJournalEntries(userId);
      if (!result.success) return [];
      
      return result.data.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    } catch (error) {
      console.error('Error fetching motivation entries:', error);
      return [];
    }
  }

  private async calculateGoalAchievementRate(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // This would need to be implemented based on specific goal tracking logic
    // For now, return a placeholder calculation
    return 0.7; // 70% achievement rate
  }

  private calculateMotivationTrend(entries: MotivationJournal[]): number {
    if (entries.length < 2) return 0;
    
    const sortedEntries = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstHalf = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));
    const secondHalf = sortedEntries.slice(Math.floor(sortedEntries.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.motivation_level, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.motivation_level, 0) / secondHalf.length;
    
    return (secondHalfAvg - firstHalfAvg) / 10; // Normalize to -1 to 1 range
  }

  private async calculateRecentPerformanceChange(
    userId: string,
    evaluationPeriodDays: number
  ): Promise<number> {
    const midPoint = Math.floor(evaluationPeriodDays / 2);
    const endDate = new Date();
    const midDate = new Date();
    midDate.setDate(midDate.getDate() - midPoint);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - evaluationPeriodDays);

    const recentSessions = await this.getWalkingSessionsInPeriod(userId, midDate, endDate);
    const olderSessions = await this.getWalkingSessionsInPeriod(userId, startDate, midDate);

    const recentAvg = recentSessions.reduce((sum, s) => sum + (s.steps || 0), 0) / Math.max(recentSessions.length, 1);
    const olderAvg = olderSessions.reduce((sum, s) => sum + (s.steps || 0), 0) / Math.max(olderSessions.length, 1);

    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  private async applyGoalAdjustment(recommendation: GoalAdjustmentRecommendation): Promise<boolean> {
    try {
      const result = await DatabaseService.updateUserGoal(recommendation.goalId, {
        target_value: recommendation.recommendedTarget,
        updated_at: new Date().toISOString()
      });
      
      return result.success;
    } catch (error) {
      console.error('Error applying goal adjustment:', error);
      return false;
    }
  }

  /**
   * Adjust user goals based on performance analysis and recommendations
   */
  async adjustGoals(userId: string, options?: {
    evaluationPeriodDays?: number;
    autoApply?: boolean;
  }): Promise<{
    recommendations: GoalAdjustmentRecommendation[];
    applied: boolean[];
    summary: {
      totalRecommendations: number;
      successfulAdjustments: number;
      failedAdjustments: number;
    };
  }> {
    const evaluationPeriodDays = options?.evaluationPeriodDays || 14;
    const autoApply = options?.autoApply || false;

    try {
      // Get goal adjustment recommendations
      const recommendations = await this.analyzeAndRecommendGoalAdjustments(userId, { evaluationPeriodDays });
      
      const applied: boolean[] = [];
      let successfulAdjustments = 0;
      let failedAdjustments = 0;

      // Apply adjustments if autoApply is enabled
      if (autoApply) {
        for (const recommendation of recommendations) {
          const success = await this.applyGoalAdjustment(recommendation);
          applied.push(success);
          
          if (success) {
            successfulAdjustments++;
          } else {
            failedAdjustments++;
          }
        }
      } else {
        // If not auto-applying, mark all as not applied
        applied.fill(false, 0, recommendations.length);
      }

      return {
        recommendations,
        applied,
        summary: {
          totalRecommendations: recommendations.length,
          successfulAdjustments,
          failedAdjustments
        }
      };
    } catch (error) {
      console.error('Error adjusting goals:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to adjust goals: ${errorMessage}`);
    }
  }
}

export default AdaptiveGoalService;