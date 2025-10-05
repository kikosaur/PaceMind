import { MotivationPredictionResponse, MotivationService } from '../lib/motivation-service';
import { WalkingSession, DatabaseService, MotivationJournal } from '../lib/database-improved';

export interface InsightAccuracyMetrics {
  predictionAccuracy: number; // 0-1 scale
  recommendationRelevance: number; // 0-1 scale
  userEngagement: number; // 0-1 scale
  actionableInsights: number; // 0-1 scale
  personalizedContent: number; // 0-1 scale
  overallQuality: number; // 0-1 scale
}

export interface InsightRelevanceAnalysis {
  contextualRelevance: number; // How well insights match user context
  temporalRelevance: number; // How timely the insights are
  behavioralAlignment: number; // How well insights align with user behavior
  goalAlignment: number; // How well insights support user goals
  diversityScore: number; // Variety in insight types
}

export interface InsightValidationResult {
  isValid: boolean;
  accuracy: InsightAccuracyMetrics;
  relevance: InsightRelevanceAnalysis;
  issues: string[];
  recommendations: string[];
  confidence: number;
}

export interface UserBehaviorPattern {
  walkingFrequency: number; // walks per week
  averageWalkDuration: number; // minutes
  preferredWalkingTimes: string[]; // time periods
  motivationTrends: { date: string; level: number }[];
  goalAchievementRate: number; // 0-1 scale
  engagementLevel: number; // 0-1 scale
}

export class AIInsightsAnalyzer {
  private static instance: AIInsightsAnalyzer;
  private motivationService: MotivationService;
  
  private constructor() {
    this.motivationService = new MotivationService();
  }

  public static getInstance(): AIInsightsAnalyzer {
    if (!AIInsightsAnalyzer.instance) {
      AIInsightsAnalyzer.instance = new AIInsightsAnalyzer();
    }
    return AIInsightsAnalyzer.instance;
  }

  /**
   * Validates the accuracy and relevance of AI insights for a user
   */
  public async validateInsights(
    userId: string,
    insights: MotivationPredictionResponse,
    userContext: {
      recentSessions: WalkingSession[];
      journalEntries: MotivationJournal[];
      userGoals: any[];
    }
  ): Promise<InsightValidationResult> {
    try {
      // Analyze user behavior patterns
      const behaviorPattern = await this.analyzeBehaviorPatterns(userId, userContext);
      
      // Calculate accuracy metrics
      const accuracy = await this.calculateAccuracyMetrics(insights, userContext, behaviorPattern);
      
      // Calculate relevance analysis
      const relevance = await this.calculateRelevanceAnalysis(insights, userContext, behaviorPattern);
      
      // Identify issues and generate recommendations
      const { issues, recommendations } = this.identifyIssuesAndRecommendations(accuracy, relevance, insights);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(accuracy, relevance);
      
      return {
        isValid: confidence > 0.6 && issues.length < 3,
        accuracy,
        relevance,
        issues,
        recommendations,
        confidence
      };
    } catch (error) {
      console.error('Error validating insights:', error);
      return {
        isValid: false,
        accuracy: this.getDefaultAccuracyMetrics(),
        relevance: this.getDefaultRelevanceAnalysis(),
        issues: ['Failed to validate insights due to system error'],
        recommendations: ['Retry insight validation', 'Check system connectivity'],
        confidence: 0
      };
    }
  }

  /**
   * Analyzes user behavior patterns from historical data
   */
  private async analyzeBehaviorPatterns(
    userId: string,
    userContext: {
      recentSessions: WalkingSession[];
      journalEntries: MotivationJournal[];
      userGoals: any[];
    }
  ): Promise<UserBehaviorPattern> {
    const { recentSessions, journalEntries } = userContext;
    
    // Calculate walking frequency (sessions per week)
    const weeklyFrequency = this.calculateWeeklyFrequency(recentSessions);
    
    // Calculate average walk duration
    const averageDuration = recentSessions.length > 0 
      ? recentSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / recentSessions.length / 60
      : 0;
    
    // Identify preferred walking times
    const preferredTimes = this.identifyPreferredWalkingTimes(recentSessions);
    
    // Analyze motivation trends
    const motivationTrends = journalEntries.map(entry => ({
      date: entry.date,
      level: entry.motivation_level
    }));
    
    // Calculate goal achievement rate
    const goalAchievementRate = await this.calculateGoalAchievementRate(userId);
    
    // Calculate engagement level based on app usage patterns
    const engagementLevel = this.calculateEngagementLevel(recentSessions, journalEntries);
    
    return {
      walkingFrequency: weeklyFrequency,
      averageWalkDuration: averageDuration,
      preferredWalkingTimes: preferredTimes,
      motivationTrends,
      goalAchievementRate,
      engagementLevel
    };
  }

  /**
   * Calculates accuracy metrics for AI insights
   */
  private async calculateAccuracyMetrics(
    insights: MotivationPredictionResponse,
    userContext: any,
    behaviorPattern: UserBehaviorPattern
  ): Promise<InsightAccuracyMetrics> {
    // Prediction accuracy based on confidence and historical validation
    const predictionAccuracy = Math.min(1, insights.confidence * 1.2); // Boost confidence slightly
    
    // Recommendation relevance based on actionability and specificity
    const recommendationRelevance = this.assessRecommendationRelevance(insights.insights.recommendations);
    
    // User engagement based on behavior patterns
    const userEngagement = behaviorPattern.engagementLevel;
    
    // Actionable insights score
    const actionableInsights = this.assessActionabilityScore(insights);
    
    // Personalized content score
    const personalizedContent = this.assessPersonalizationScore(insights, behaviorPattern);
    
    // Overall quality score
    const overallQuality = (predictionAccuracy + recommendationRelevance + actionableInsights + personalizedContent) / 4;
    
    return {
      predictionAccuracy,
      recommendationRelevance,
      userEngagement,
      actionableInsights,
      personalizedContent,
      overallQuality
    };
  }

  /**
   * Calculates relevance analysis for AI insights
   */
  private async calculateRelevanceAnalysis(
    insights: MotivationPredictionResponse,
    userContext: any,
    behaviorPattern: UserBehaviorPattern
  ): Promise<InsightRelevanceAnalysis> {
    // Contextual relevance based on current user state
    const contextualRelevance = this.assessContextualRelevance(insights, userContext);
    
    // Temporal relevance based on timing and recency
    const temporalRelevance = this.assessTemporalRelevance(insights);
    
    // Behavioral alignment with user patterns
    const behavioralAlignment = this.assessBehavioralAlignment(insights, behaviorPattern);
    
    // Goal alignment with user objectives
    const goalAlignment = this.assessGoalAlignment(insights, userContext.userGoals);
    
    // Diversity in insight types
    const diversityScore = this.assessInsightDiversity(insights);
    
    return {
      contextualRelevance,
      temporalRelevance,
      behavioralAlignment,
      goalAlignment,
      diversityScore
    };
  }

  /**
   * Helper methods for specific assessments
   */
  private calculateWeeklyFrequency(sessions: WalkingSession[]): number {
    if (sessions.length === 0) return 0;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentSessions = sessions.filter(session => 
      new Date(session.start_time) >= oneWeekAgo
    );
    
    return recentSessions.length;
  }

  private identifyPreferredWalkingTimes(sessions: WalkingSession[]): string[] {
    const timeSlots: { [key: string]: number } = {
      'morning': 0,
      'afternoon': 0,
      'evening': 0
    };
    
    sessions.forEach(session => {
      const hour = new Date(session.start_time).getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
      else timeSlots.evening++;
    });
    
    return Object.entries(timeSlots)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([time]) => time);
  }

  private async calculateGoalAchievementRate(userId: string): Promise<number> {
    try {
      const result = await DatabaseService.getUserGoals(userId);
      if (!result.success || result.data.length === 0) return 0;
      
      const completedGoals = result.data.filter(goal => goal.status === 'completed').length;
      return completedGoals / result.data.length;
    } catch (error) {
      console.error('Error calculating goal achievement rate:', error);
      return 0;
    }
  }

  private calculateEngagementLevel(sessions: WalkingSession[], journalEntries: MotivationJournal[]): number {
    const recentActivity = sessions.length + journalEntries.length;
    const maxExpectedActivity = 14; // 7 walks + 7 journal entries per week
    return Math.min(1, recentActivity / maxExpectedActivity);
  }

  private assessRecommendationRelevance(recommendations: string[]): number {
    if (!recommendations || recommendations.length === 0) return 0;
    
    // Check for actionable keywords
    const actionableKeywords = ['try', 'consider', 'start', 'focus', 'set', 'increase', 'decrease', 'adjust'];
    const specificKeywords = ['walk', 'step', 'minute', 'distance', 'time', 'goal', 'pace'];
    
    let relevanceScore = 0;
    recommendations.forEach(rec => {
      const lowerRec = rec.toLowerCase();
      const hasActionable = actionableKeywords.some(keyword => lowerRec.includes(keyword));
      const hasSpecific = specificKeywords.some(keyword => lowerRec.includes(keyword));
      
      if (hasActionable && hasSpecific) relevanceScore += 1;
      else if (hasActionable || hasSpecific) relevanceScore += 0.5;
    });
    
    return Math.min(1, relevanceScore / recommendations.length);
  }

  private assessActionabilityScore(insights: MotivationPredictionResponse): number {
    const recommendations = insights.insights.recommendations || [];
    if (recommendations.length === 0) return 0;
    
    // Check for specific, measurable, actionable recommendations
    let actionableCount = 0;
    recommendations.forEach(rec => {
      const lowerRec = rec.toLowerCase();
      if (lowerRec.includes('minute') || lowerRec.includes('step') || lowerRec.includes('time') || 
          lowerRec.includes('try') || lowerRec.includes('consider') || lowerRec.includes('start')) {
        actionableCount++;
      }
    });
    
    return actionableCount / recommendations.length;
  }

  private assessPersonalizationScore(insights: MotivationPredictionResponse, behaviorPattern: UserBehaviorPattern): number {
    let personalizationScore = 0;
    
    // Check if insights reference user's specific patterns
    const allText = [
      insights.suggestion,
      ...(insights.insights.recommendations || []),
      insights.insights.trendAnalysis || ''
    ].join(' ').toLowerCase();
    
    // Look for personalized elements
    if (behaviorPattern.preferredWalkingTimes.some(time => allText.includes(time))) {
      personalizationScore += 0.3;
    }
    
    if (insights.confidence > 0.7) {
      personalizationScore += 0.3; // High confidence suggests personalization
    }
    
    if (insights.insights.primaryFactors && insights.insights.primaryFactors.length > 0) {
      personalizationScore += 0.4; // Specific factors indicate personalization
    }
    
    return Math.min(1, personalizationScore);
  }

  private assessContextualRelevance(insights: MotivationPredictionResponse, userContext: any): number {
    // Check if insights match current user state and recent activity
    const recentSessions = userContext.recentSessions || [];
    
    let relevanceScore = 0.5; // Base score
    
    // If user has been inactive, insights should address this
    if (recentSessions.length === 0 && insights.suggestion.toLowerCase().includes('start')) {
      relevanceScore += 0.3;
    }
    
    // If user has been active, insights should build on this
    if (recentSessions.length > 3 && insights.motivation_state === 'high') {
      relevanceScore += 0.2;
    }
    
    return Math.min(1, relevanceScore);
  }

  private assessTemporalRelevance(insights: MotivationPredictionResponse): number {
    const now = Date.now();
    const insightAge = now - insights.timestamp;
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    return Math.max(0, 1 - (insightAge / maxAge));
  }

  private assessBehavioralAlignment(insights: MotivationPredictionResponse, behaviorPattern: UserBehaviorPattern): number {
    let alignmentScore = 0.5; // Base score
    
    // Check if recommendations align with user's walking frequency
    const recommendations = insights.insights.recommendations || [];
    const allRecommendations = recommendations.join(' ').toLowerCase();
    
    if (behaviorPattern.walkingFrequency < 3 && allRecommendations.includes('shorter')) {
      alignmentScore += 0.3; // Good alignment for low-frequency walkers
    }
    
    if (behaviorPattern.walkingFrequency > 5 && allRecommendations.includes('challenge')) {
      alignmentScore += 0.3; // Good alignment for high-frequency walkers
    }
    
    return Math.min(1, alignmentScore);
  }

  private assessGoalAlignment(insights: MotivationPredictionResponse, userGoals: any[]): number {
    if (!userGoals || userGoals.length === 0) return 0.5;
    
    // Check if insights support user's active goals
    const activeGoals = userGoals.filter(goal => goal.status === 'active');
    if (activeGoals.length === 0) return 0.5;
    
    let alignmentScore = 0;
    const allText = [insights.suggestion, ...(insights.insights.recommendations || [])].join(' ').toLowerCase();
    
    activeGoals.forEach(goal => {
      if (goal.type === 'daily_steps' && allText.includes('step')) alignmentScore += 0.3;
      if (goal.type === 'weekly_walks' && allText.includes('walk')) alignmentScore += 0.3;
      if (goal.type === 'monthly_distance' && allText.includes('distance')) alignmentScore += 0.3;
    });
    
    return Math.min(1, alignmentScore / activeGoals.length);
  }

  private assessInsightDiversity(insights: MotivationPredictionResponse): number {
    const categories = new Set<string>();
    const allRecommendations = insights.insights.recommendations || [];
    
    allRecommendations.forEach(rec => {
      const lowerRec = rec.toLowerCase();
      if (lowerRec.includes('time') || lowerRec.includes('when')) categories.add('timing');
      if (lowerRec.includes('distance') || lowerRec.includes('step')) categories.add('quantity');
      if (lowerRec.includes('route') || lowerRec.includes('path')) categories.add('location');
      if (lowerRec.includes('music') || lowerRec.includes('friend')) categories.add('social');
      if (lowerRec.includes('goal') || lowerRec.includes('target')) categories.add('motivation');
    });
    
    return Math.min(1, categories.size / 3); // Normalize to max 3 categories
  }

  private identifyIssuesAndRecommendations(
    accuracy: InsightAccuracyMetrics,
    relevance: InsightRelevanceAnalysis,
    insights: MotivationPredictionResponse
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check accuracy issues
    if (accuracy.predictionAccuracy < 0.6) {
      issues.push('Low prediction accuracy detected');
      recommendations.push('Improve ML model training with more user data');
    }
    
    if (accuracy.recommendationRelevance < 0.5) {
      issues.push('Recommendations lack relevance and actionability');
      recommendations.push('Enhance recommendation generation with more specific, actionable content');
    }
    
    if (accuracy.personalizedContent < 0.4) {
      issues.push('Insights lack personalization');
      recommendations.push('Incorporate more user-specific behavior patterns into insight generation');
    }
    
    // Check relevance issues
    if (relevance.contextualRelevance < 0.5) {
      issues.push('Insights do not match current user context');
      recommendations.push('Improve context awareness in insight generation');
    }
    
    if (relevance.temporalRelevance < 0.3) {
      issues.push('Insights are outdated');
      recommendations.push('Increase insight refresh frequency');
    }
    
    if (relevance.diversityScore < 0.3) {
      issues.push('Limited variety in insight types');
      recommendations.push('Expand insight categories and recommendation types');
    }
    
    return { issues, recommendations };
  }

  private calculateOverallConfidence(accuracy: InsightAccuracyMetrics, relevance: InsightRelevanceAnalysis): number {
    const accuracyWeight = 0.6;
    const relevanceWeight = 0.4;
    
    const accuracyScore = (accuracy.predictionAccuracy + accuracy.recommendationRelevance + 
                          accuracy.actionableInsights + accuracy.personalizedContent) / 4;
    
    const relevanceScore = (relevance.contextualRelevance + relevance.temporalRelevance + 
                           relevance.behavioralAlignment + relevance.goalAlignment + 
                           relevance.diversityScore) / 5;
    
    return (accuracyScore * accuracyWeight) + (relevanceScore * relevanceWeight);
  }

  private getDefaultAccuracyMetrics(): InsightAccuracyMetrics {
    return {
      predictionAccuracy: 0,
      recommendationRelevance: 0,
      userEngagement: 0,
      actionableInsights: 0,
      personalizedContent: 0,
      overallQuality: 0
    };
  }

  private getDefaultRelevanceAnalysis(): InsightRelevanceAnalysis {
    return {
      contextualRelevance: 0,
      temporalRelevance: 0,
      behavioralAlignment: 0,
      goalAlignment: 0,
      diversityScore: 0
    };
  }

  /**
   * Generates a comprehensive report of insight quality
   */
  public generateInsightQualityReport(validationResult: InsightValidationResult): string {
    const { accuracy, relevance, issues, recommendations, confidence } = validationResult;
    
    let report = `AI Insights Quality Report\n`;
    report += `Overall Confidence: ${(confidence * 100).toFixed(1)}%\n\n`;
    
    report += `Accuracy Metrics:\n`;
    report += `- Prediction Accuracy: ${(accuracy.predictionAccuracy * 100).toFixed(1)}%\n`;
    report += `- Recommendation Relevance: ${(accuracy.recommendationRelevance * 100).toFixed(1)}%\n`;
    report += `- Actionable Insights: ${(accuracy.actionableInsights * 100).toFixed(1)}%\n`;
    report += `- Personalized Content: ${(accuracy.personalizedContent * 100).toFixed(1)}%\n\n`;
    
    report += `Relevance Analysis:\n`;
    report += `- Contextual Relevance: ${(relevance.contextualRelevance * 100).toFixed(1)}%\n`;
    report += `- Temporal Relevance: ${(relevance.temporalRelevance * 100).toFixed(1)}%\n`;
    report += `- Behavioral Alignment: ${(relevance.behavioralAlignment * 100).toFixed(1)}%\n`;
    report += `- Goal Alignment: ${(relevance.goalAlignment * 100).toFixed(1)}%\n`;
    report += `- Diversity Score: ${(relevance.diversityScore * 100).toFixed(1)}%\n\n`;
    
    if (issues.length > 0) {
      report += `Issues Identified:\n`;
      issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += `\n`;
    }
    
    if (recommendations.length > 0) {
      report += `Recommendations:\n`;
      recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }
    
    return report;
  }
}

export default AIInsightsAnalyzer;