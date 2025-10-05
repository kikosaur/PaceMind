import { WalkingSession, MotivationJournal } from '../lib/database-improved';

export interface BehaviorPatternValidationResult {
  isValid: boolean;
  accuracy: number; // 0-1 scale
  confidence: number; // 0-1 scale
  patterns: DetectedPattern[];
  issues: string[];
  recommendations: string[];
}

export interface DetectedPattern {
  type: PatternType;
  description: string;
  confidence: number;
  frequency: number;
  timeframe: string;
  significance: 'high' | 'medium' | 'low';
  evidence: PatternEvidence[];
}

export interface PatternEvidence {
  dataPoint: string;
  value: number | string;
  timestamp: string;
  relevance: number; // 0-1 scale
}

export type PatternType = 
  | 'walking_frequency'
  | 'preferred_times'
  | 'duration_consistency'
  | 'motivation_cycles'
  | 'goal_achievement'
  | 'seasonal_variation'
  | 'weekly_routine'
  | 'performance_trends';

export interface BehaviorAnalysisConfig {
  minDataPoints: number;
  analysisWindowDays: number;
  confidenceThreshold: number;
  significanceThreshold: number;
}

export class BehaviorPatternValidator {
  private static instance: BehaviorPatternValidator;
  private config: BehaviorAnalysisConfig;

  private constructor() {
    this.config = {
      minDataPoints: 7, // Minimum data points for pattern detection
      analysisWindowDays: 30, // Analysis window in days
      confidenceThreshold: 0.6, // Minimum confidence for valid patterns
      significanceThreshold: 0.5 // Minimum significance for reporting patterns
    };
  }

  public static getInstance(): BehaviorPatternValidator {
    if (!BehaviorPatternValidator.instance) {
      BehaviorPatternValidator.instance = new BehaviorPatternValidator();
    }
    return BehaviorPatternValidator.instance;
  }

  /**
   * Validates user behavior pattern recognition accuracy
   */
  public async validateBehaviorPatterns(
    userId: string,
    walkingSessions: WalkingSession[],
    journalEntries: MotivationJournal[],
    userGoals: any[]
  ): Promise<BehaviorPatternValidationResult> {
    try {
      // Filter data to analysis window
      const filteredSessions = this.filterToAnalysisWindow(walkingSessions);
      const filteredJournalEntries = this.filterJournalToAnalysisWindow(journalEntries);

      // Check if we have sufficient data
      if (filteredSessions.length < this.config.minDataPoints) {
        return {
          isValid: false,
          accuracy: 0,
          confidence: 0,
          patterns: [],
          issues: ['Insufficient data for pattern analysis'],
          recommendations: ['Collect more walking data over time', 'Encourage regular app usage']
        };
      }

      // Detect various behavior patterns
      const patterns = await this.detectAllPatterns(
        userId,
        filteredSessions,
        filteredJournalEntries,
        userGoals
      );

      // Validate pattern accuracy
      const accuracy = this.calculatePatternAccuracy(patterns, filteredSessions, filteredJournalEntries);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(patterns);

      // Identify issues and recommendations
      const { issues, recommendations } = this.analyzePatternQuality(patterns, accuracy, confidence);

      return {
        isValid: accuracy > 0.7 && confidence > this.config.confidenceThreshold,
        accuracy,
        confidence,
        patterns: patterns.filter(p => p.significance !== 'low'),
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Error validating behavior patterns:', error);
      return {
        isValid: false,
        accuracy: 0,
        confidence: 0,
        patterns: [],
        issues: ['System error during pattern validation'],
        recommendations: ['Retry pattern analysis', 'Check data integrity']
      };
    }
  }

  /**
   * Detects all types of behavior patterns
   */
  private async detectAllPatterns(
    userId: string,
    sessions: WalkingSession[],
    journalEntries: MotivationJournal[],
    userGoals: any[]
  ): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Walking frequency patterns
    const frequencyPattern = this.detectWalkingFrequencyPattern(sessions);
    if (frequencyPattern) patterns.push(frequencyPattern);

    // Preferred time patterns
    const timePattern = this.detectPreferredTimePattern(sessions);
    if (timePattern) patterns.push(timePattern);

    // Duration consistency patterns
    const durationPattern = this.detectDurationConsistencyPattern(sessions);
    if (durationPattern) patterns.push(durationPattern);

    // Motivation cycle patterns
    const motivationPattern = this.detectMotivationCyclePattern(journalEntries);
    if (motivationPattern) patterns.push(motivationPattern);

    // Goal achievement patterns
    const goalPattern = await this.detectGoalAchievementPattern(userId, userGoals);
    if (goalPattern) patterns.push(goalPattern);

    // Weekly routine patterns
    const weeklyPattern = this.detectWeeklyRoutinePattern(sessions);
    if (weeklyPattern) patterns.push(weeklyPattern);

    // Performance trend patterns
    const performancePattern = this.detectPerformanceTrendPattern(sessions, journalEntries);
    if (performancePattern) patterns.push(performancePattern);

    return patterns;
  }

  /**
   * Detects walking frequency patterns
   */
  private detectWalkingFrequencyPattern(sessions: WalkingSession[]): DetectedPattern | null {
    if (sessions.length < 7) return null;

    // Group sessions by week
    const weeklyFrequencies = this.groupSessionsByWeek(sessions);
    const frequencies = Object.values(weeklyFrequencies);
    
    if (frequencies.length < 2) return null;

    const avgFrequency = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
    const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - avgFrequency, 2), 0) / frequencies.length;
    const consistency = Math.max(0, 1 - (Math.sqrt(variance) / avgFrequency));

    const evidence: PatternEvidence[] = frequencies.map((freq, index) => ({
      dataPoint: `Week ${index + 1} frequency`,
      value: freq,
      timestamp: new Date(Date.now() - (frequencies.length - index - 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      relevance: 0.8
    }));

    return {
      type: 'walking_frequency',
      description: `User walks an average of ${avgFrequency.toFixed(1)} times per week with ${(consistency * 100).toFixed(0)}% consistency`,
      confidence: Math.min(0.95, consistency + 0.2),
      frequency: avgFrequency,
      timeframe: 'weekly',
      significance: avgFrequency >= 3 ? 'high' : avgFrequency >= 1 ? 'medium' : 'low',
      evidence
    };
  }

  /**
   * Detects preferred walking time patterns
   */
  private detectPreferredTimePattern(sessions: WalkingSession[]): DetectedPattern | null {
    if (sessions.length < 5) return null;

    const timeSlots = {
      'early_morning': 0, // 5-8 AM
      'morning': 0,       // 8-12 PM
      'afternoon': 0,     // 12-5 PM
      'evening': 0,       // 5-8 PM
      'night': 0          // 8-11 PM
    };

    sessions.forEach(session => {
      const hour = new Date(session.start_time).getHours();
      if (hour >= 5 && hour < 8) timeSlots.early_morning++;
      else if (hour >= 8 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
      else if (hour >= 17 && hour < 20) timeSlots.evening++;
      else if (hour >= 20 && hour < 23) timeSlots.night++;
    });

    const totalSessions = sessions.length;
    const preferredSlots = Object.entries(timeSlots)
      .map(([slot, count]) => ({ slot, count, percentage: count / totalSessions }))
      .filter(item => item.percentage > 0.3) // At least 30% of sessions
      .sort((a, b) => b.percentage - a.percentage);

    if (preferredSlots.length === 0) return null;

    const topSlot = preferredSlots[0];
    const confidence = Math.min(0.95, topSlot.percentage + 0.1);

    const evidence: PatternEvidence[] = Object.entries(timeSlots).map(([slot, count]) => ({
      dataPoint: `${slot.replace('_', ' ')} sessions`,
      value: count,
      timestamp: new Date().toISOString(),
      relevance: count / totalSessions
    }));

    return {
      type: 'preferred_times',
      description: `User prefers walking during ${topSlot.slot.replace('_', ' ')} (${(topSlot.percentage * 100).toFixed(0)}% of sessions)`,
      confidence,
      frequency: topSlot.count,
      timeframe: 'daily',
      significance: topSlot.percentage > 0.6 ? 'high' : topSlot.percentage > 0.4 ? 'medium' : 'low',
      evidence
    };
  }

  /**
   * Detects duration consistency patterns
   */
  private detectDurationConsistencyPattern(sessions: WalkingSession[]): DetectedPattern | null {
    if (sessions.length < 5) return null;

    const durations = sessions
      .filter(session => session.duration && session.duration > 0)
      .map(session => session.duration! / 60); // Convert to minutes

    if (durations.length < 5) return null;

    const avgDuration = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;
    const variance = durations.reduce((sum, dur) => sum + Math.pow(dur - avgDuration, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 1 - (stdDev / avgDuration));

    const evidence: PatternEvidence[] = durations.map((duration, index) => ({
      dataPoint: `Session ${index + 1} duration`,
      value: Math.round(duration),
      timestamp: sessions[index].start_time,
      relevance: 0.7
    }));

    return {
      type: 'duration_consistency',
      description: `User maintains consistent walk durations averaging ${avgDuration.toFixed(1)} minutes with ${(consistency * 100).toFixed(0)}% consistency`,
      confidence: Math.min(0.9, consistency + 0.1),
      frequency: avgDuration,
      timeframe: 'per_session',
      significance: consistency > 0.7 ? 'high' : consistency > 0.5 ? 'medium' : 'low',
      evidence
    };
  }

  /**
   * Detects motivation cycle patterns
   */
  private detectMotivationCyclePattern(journalEntries: MotivationJournal[]): DetectedPattern | null {
    if (journalEntries.length < 7) return null;

    // Group by day of week
    const weeklyMotivation: { [key: number]: number[] } = {};
    
    journalEntries.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay();
      if (!weeklyMotivation[dayOfWeek]) weeklyMotivation[dayOfWeek] = [];
      weeklyMotivation[dayOfWeek].push(entry.motivation_level);
    });

    // Calculate average motivation for each day
    const dailyAverages = Object.entries(weeklyMotivation).map(([day, levels]) => ({
      day: parseInt(day),
      average: levels.reduce((sum, level) => sum + level, 0) / levels.length,
      count: levels.length
    }));

    if (dailyAverages.length < 3) return null;

    // Find the day with highest and lowest motivation
    const sortedDays = dailyAverages.sort((a, b) => b.average - a.average);
    const highestDay = sortedDays[0];
    const lowestDay = sortedDays[sortedDays.length - 1];
    
    const motivationRange = highestDay.average - lowestDay.average;
    const significance = motivationRange > 20 ? 'high' : motivationRange > 10 ? 'medium' : 'low';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const evidence: PatternEvidence[] = dailyAverages.map(({ day, average, count }) => ({
      dataPoint: `${dayNames[day]} motivation`,
      value: Math.round(average),
      timestamp: new Date().toISOString(),
      relevance: count / journalEntries.length
    }));

    return {
      type: 'motivation_cycles',
      description: `Motivation peaks on ${dayNames[highestDay.day]} (${highestDay.average.toFixed(0)}) and dips on ${dayNames[lowestDay.day]} (${lowestDay.average.toFixed(0)})`,
      confidence: Math.min(0.9, (motivationRange / 50) + 0.3),
      frequency: motivationRange,
      timeframe: 'weekly',
      significance,
      evidence
    };
  }

  /**
   * Detects goal achievement patterns
   */
  private async detectGoalAchievementPattern(userId: string, userGoals: any[]): Promise<DetectedPattern | null> {
    if (userGoals.length === 0) return null;

    try {
      const activeGoals = userGoals.filter(goal => goal.status === 'active');
      const completedGoals = userGoals.filter(goal => goal.status === 'completed');
      const totalGoals = userGoals.length;

      if (totalGoals < 3) return null;

      const achievementRate = completedGoals.length / totalGoals;
      const avgProgress = activeGoals.length > 0 
        ? activeGoals.reduce((sum, goal) => sum + (goal.progress_percentage || 0), 0) / activeGoals.length
        : 0;

      const evidence: PatternEvidence[] = [
        {
          dataPoint: 'Completed goals',
          value: completedGoals.length,
          timestamp: new Date().toISOString(),
          relevance: 0.9
        },
        {
          dataPoint: 'Active goals progress',
          value: Math.round(avgProgress),
          timestamp: new Date().toISOString(),
          relevance: 0.8
        },
        {
          dataPoint: 'Total goals set',
          value: totalGoals,
          timestamp: new Date().toISOString(),
          relevance: 0.7
        }
      ];

      return {
        type: 'goal_achievement',
        description: `User achieves ${(achievementRate * 100).toFixed(0)}% of goals with average ${avgProgress.toFixed(0)}% progress on active goals`,
        confidence: Math.min(0.9, (totalGoals / 10) + 0.3),
        frequency: achievementRate,
        timeframe: 'overall',
        significance: achievementRate > 0.7 ? 'high' : achievementRate > 0.4 ? 'medium' : 'low',
        evidence
      };
    } catch (error) {
      console.error('Error detecting goal achievement pattern:', error);
      return null;
    }
  }

  /**
   * Detects weekly routine patterns
   */
  private detectWeeklyRoutinePattern(sessions: WalkingSession[]): DetectedPattern | null {
    if (sessions.length < 14) return null; // Need at least 2 weeks of data

    const weekdayCount = sessions.filter(session => {
      const dayOfWeek = new Date(session.start_time).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    }).length;

    const weekendCount = sessions.filter(session => {
      const dayOfWeek = new Date(session.start_time).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
    }).length;

    const totalSessions = sessions.length;
    const weekdayRatio = weekdayCount / totalSessions;
    const weekendRatio = weekendCount / totalSessions;

    let routineType: string;
    let significance: 'high' | 'medium' | 'low';

    if (weekdayRatio > 0.7) {
      routineType = 'weekday-focused';
      significance = 'high';
    } else if (weekendRatio > 0.6) {
      routineType = 'weekend-focused';
      significance = 'high';
    } else if (Math.abs(weekdayRatio - weekendRatio) < 0.2) {
      routineType = 'balanced';
      significance = 'medium';
    } else {
      routineType = 'irregular';
      significance = 'low';
    }

    const evidence: PatternEvidence[] = [
      {
        dataPoint: 'Weekday sessions',
        value: weekdayCount,
        timestamp: new Date().toISOString(),
        relevance: 0.8
      },
      {
        dataPoint: 'Weekend sessions',
        value: weekendCount,
        timestamp: new Date().toISOString(),
        relevance: 0.8
      }
    ];

    return {
      type: 'weekly_routine',
      description: `User follows a ${routineType} walking routine (${(Math.max(weekdayRatio, weekendRatio) * 100).toFixed(0)}% preference)`,
      confidence: Math.min(0.9, Math.abs(weekdayRatio - weekendRatio) + 0.3),
      frequency: Math.max(weekdayRatio, weekendRatio),
      timeframe: 'weekly',
      significance,
      evidence
    };
  }

  /**
   * Detects performance trend patterns
   */
  private detectPerformanceTrendPattern(
    sessions: WalkingSession[],
    journalEntries: MotivationJournal[]
  ): DetectedPattern | null {
    if (sessions.length < 10) return null;

    // Sort sessions by date
    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Calculate performance metrics over time
    const performanceData = sortedSessions.map((session, index) => ({
      index,
      steps: session.steps || 0,
      distance: session.distance || 0,
      duration: session.duration || 0,
      date: session.start_time
    }));

    // Calculate trend using linear regression
    const stepsTrend = this.calculateTrend(performanceData.map(d => d.steps));
    const distanceTrend = this.calculateTrend(performanceData.map(d => d.distance));
    
    let trendDirection: string;
    let trendStrength: number;

    if (stepsTrend > 0.1 && distanceTrend > 0.1) {
      trendDirection = 'improving';
      trendStrength = (stepsTrend + distanceTrend) / 2;
    } else if (stepsTrend < -0.1 && distanceTrend < -0.1) {
      trendDirection = 'declining';
      trendStrength = Math.abs((stepsTrend + distanceTrend) / 2);
    } else {
      trendDirection = 'stable';
      trendStrength = 1 - Math.abs((stepsTrend + distanceTrend) / 2);
    }

    const evidence: PatternEvidence[] = [
      {
        dataPoint: 'Steps trend',
        value: stepsTrend,
        timestamp: new Date().toISOString(),
        relevance: 0.9
      },
      {
        dataPoint: 'Distance trend',
        value: distanceTrend,
        timestamp: new Date().toISOString(),
        relevance: 0.9
      }
    ];

    return {
      type: 'performance_trends',
      description: `User's performance is ${trendDirection} with ${(trendStrength * 100).toFixed(0)}% trend strength`,
      confidence: Math.min(0.9, trendStrength + 0.2),
      frequency: trendStrength,
      timeframe: 'overall',
      significance: trendStrength > 0.6 ? 'high' : trendStrength > 0.3 ? 'medium' : 'low',
      evidence
    };
  }

  /**
   * Helper methods
   */
  private filterToAnalysisWindow(sessions: WalkingSession[]): WalkingSession[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.analysisWindowDays);
    
    return sessions.filter(session => 
      new Date(session.start_time) >= cutoffDate
    );
  }

  private filterJournalToAnalysisWindow(entries: MotivationJournal[]): MotivationJournal[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.analysisWindowDays);
    
    return entries.filter(entry => 
      new Date(entry.date) >= cutoffDate
    );
  }

  private groupSessionsByWeek(sessions: WalkingSession[]): { [week: string]: number } {
    const weeks: { [week: string]: number } = {};
    
    sessions.forEach(session => {
      const date = new Date(session.start_time);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeks[weekKey] = (weeks[weekKey] || 0) + 1;
    });
    
    return weeks;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    // Normalize slope by average value to get relative trend
    return avgY !== 0 ? slope / avgY : 0;
  }

  private calculatePatternAccuracy(
    patterns: DetectedPattern[],
    sessions: WalkingSession[],
    journalEntries: MotivationJournal[]
  ): number {
    if (patterns.length === 0) return 0;
    
    // Calculate accuracy based on pattern confidence and data support
    let totalAccuracy = 0;
    let totalWeight = 0;
    
    patterns.forEach(pattern => {
      const dataSupport = this.calculateDataSupport(pattern, sessions, journalEntries);
      const weight = pattern.confidence;
      
      totalAccuracy += (pattern.confidence * dataSupport) * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalAccuracy / totalWeight : 0;
  }

  private calculateDataSupport(
    pattern: DetectedPattern,
    sessions: WalkingSession[],
    journalEntries: MotivationJournal[]
  ): number {
    // Calculate how well the pattern is supported by available data
    const evidenceCount = pattern.evidence.length;
    const relevanceSum = pattern.evidence.reduce((sum, evidence) => sum + evidence.relevance, 0);
    
    let dataPoints = 0;
    switch (pattern.type) {
      case 'walking_frequency':
      case 'preferred_times':
      case 'duration_consistency':
      case 'weekly_routine':
      case 'performance_trends':
        dataPoints = sessions.length;
        break;
      case 'motivation_cycles':
        dataPoints = journalEntries.length;
        break;
      case 'goal_achievement':
        dataPoints = 10; // Assume reasonable goal data
        break;
    }
    
    const dataAdequacy = Math.min(1, dataPoints / this.config.minDataPoints);
    const evidenceQuality = evidenceCount > 0 ? relevanceSum / evidenceCount : 0;
    
    return (dataAdequacy + evidenceQuality) / 2;
  }

  private calculateOverallConfidence(patterns: DetectedPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const weightedConfidence = patterns.reduce((sum, pattern) => {
      const weight = pattern.significance === 'high' ? 1 : pattern.significance === 'medium' ? 0.7 : 0.4;
      return sum + (pattern.confidence * weight);
    }, 0);
    
    const totalWeight = patterns.reduce((sum, pattern) => {
      return sum + (pattern.significance === 'high' ? 1 : pattern.significance === 'medium' ? 0.7 : 0.4);
    }, 0);
    
    return totalWeight > 0 ? weightedConfidence / totalWeight : 0;
  }

  private analyzePatternQuality(
    patterns: DetectedPattern[],
    accuracy: number,
    confidence: number
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (patterns.length === 0) {
      issues.push('No behavior patterns detected');
      recommendations.push('Collect more user data over time');
      recommendations.push('Encourage consistent app usage');
    }
    
    if (accuracy < 0.6) {
      issues.push('Low pattern accuracy detected');
      recommendations.push('Improve data quality validation');
      recommendations.push('Increase minimum data requirements');
    }
    
    if (confidence < this.config.confidenceThreshold) {
      issues.push('Low confidence in pattern detection');
      recommendations.push('Extend analysis window for more data');
      recommendations.push('Refine pattern detection algorithms');
    }
    
    const highSignificancePatterns = patterns.filter(p => p.significance === 'high').length;
    if (highSignificancePatterns === 0 && patterns.length > 0) {
      issues.push('No high-significance patterns found');
      recommendations.push('Review pattern significance thresholds');
      recommendations.push('Analyze user engagement levels');
    }
    
    const patternTypes = new Set(patterns.map(p => p.type));
    if (patternTypes.size < 3 && patterns.length >= 3) {
      issues.push('Limited pattern diversity detected');
      recommendations.push('Expand pattern detection categories');
      recommendations.push('Improve cross-pattern analysis');
    }
    
    return { issues, recommendations };
  }

  /**
   * Generates a comprehensive behavior pattern report
   */
  public generateBehaviorPatternReport(validationResult: BehaviorPatternValidationResult): string {
    const { isValid, accuracy, confidence, patterns, issues, recommendations } = validationResult;
    
    let report = `Behavior Pattern Validation Report\n`;
    report += `Validation Status: ${isValid ? 'VALID' : 'INVALID'}\n`;
    report += `Pattern Accuracy: ${(accuracy * 100).toFixed(1)}%\n`;
    report += `Detection Confidence: ${(confidence * 100).toFixed(1)}%\n\n`;
    
    if (patterns.length > 0) {
      report += `Detected Patterns (${patterns.length}):\n`;
      patterns.forEach((pattern, index) => {
        report += `${index + 1}. ${pattern.type.replace('_', ' ').toUpperCase()}\n`;
        report += `   Description: ${pattern.description}\n`;
        report += `   Confidence: ${(pattern.confidence * 100).toFixed(1)}%\n`;
        report += `   Significance: ${pattern.significance}\n`;
        report += `   Evidence Points: ${pattern.evidence.length}\n\n`;
      });
    } else {
      report += `No patterns detected.\n\n`;
    }
    
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

  /**
   * Validate a single behavior pattern for accuracy and reliability
   */
  public async validateBehaviorPattern(
    pattern: DetectedPattern,
    walkingSessions: WalkingSession[],
    journalEntries: MotivationJournal[]
  ): Promise<{
    isValid: boolean;
    accuracy: number;
    confidence: number;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Validate pattern evidence
      if (!pattern.evidence || pattern.evidence.length === 0) {
        issues.push('Pattern evidence is empty or missing');
        recommendations.push('Ensure pattern detection algorithms are working correctly');
      }

      // Validate pattern significance
      if (pattern.significance === 'low') {
        issues.push('Pattern significance is low');
        recommendations.push('Consider collecting more data or adjusting detection thresholds');
      }

      // Validate confidence score
      if (pattern.confidence < this.config.confidenceThreshold) {
        issues.push(`Pattern confidence (${pattern.confidence}) below threshold (${this.config.confidenceThreshold})`);
        recommendations.push('Increase data collection period or improve pattern detection algorithms');
      }

      // Calculate accuracy based on pattern type
      let accuracy = 0;
      switch (pattern.type) {
        case 'preferred_times':
          accuracy = this.validateTimePreferencePattern(pattern, walkingSessions);
          break;
        case 'motivation_cycles':
          accuracy = this.validateMotivationCorrelationPattern(pattern, walkingSessions, journalEntries);
          break;
        case 'goal_achievement':
          accuracy = this.validateGoalAchievementPattern(pattern, walkingSessions);
          break;
        default:
          accuracy = pattern.confidence; // Fallback to confidence score
      }

      // Determine overall validity
      const isValid = accuracy > 0.7 && pattern.confidence > this.config.confidenceThreshold && issues.length === 0;

      return {
        isValid,
        accuracy,
        confidence: pattern.confidence,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Error validating behavior pattern:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        isValid: false,
        accuracy: 0,
        confidence: 0,
        issues: [`Validation error: ${errorMessage}`],
        recommendations: ['Check pattern data integrity and validation logic']
      };
    }
  }

  private validateTimePreferencePattern(pattern: DetectedPattern, sessions: WalkingSession[]): number {
    // Simplified validation - check if pattern matches actual session times
    if (pattern.type !== 'preferred_times') return 0;

    const sessionTimes = sessions.map(s => new Date(s.start_time).getHours());
    
    // Extract preferred time from pattern description
    const timeSlotMap: { [key: string]: [number, number] } = {
      'early morning': [5, 8],
      'morning': [8, 12],
      'afternoon': [12, 17],
      'evening': [17, 20],
      'night': [20, 23]
    };
    
    let preferredRange: [number, number] | null = null;
    for (const [slot, range] of Object.entries(timeSlotMap)) {
      if (pattern.description.toLowerCase().includes(slot)) {
        preferredRange = range;
        break;
      }
    }
    
    if (!preferredRange) return 0;
    
    const matches = sessionTimes.filter(time => 
      time >= preferredRange![0] && time < preferredRange![1]
    );
    
    return matches.length / Math.max(sessionTimes.length, 1);
  }

  private validateMotivationCorrelationPattern(
    pattern: DetectedPattern, 
    sessions: WalkingSession[], 
    journalEntries: MotivationJournal[]
  ): number {
    // Simplified validation - check correlation strength based on evidence
    if (pattern.type !== 'motivation_cycles') return 0;
    
    const evidenceRelevance = pattern.evidence.reduce((sum, evidence) => sum + evidence.relevance, 0) / pattern.evidence.length;
    return Math.min(evidenceRelevance, 1);
  }

  private validateGoalAchievementPattern(pattern: DetectedPattern, sessions: WalkingSession[]): number {
    // Simplified validation - check achievement rate consistency
    if (pattern.type !== 'goal_achievement') return 0;
    
    // Use frequency as achievement rate for goal achievement patterns
    return Math.min(pattern.frequency, 1);
  }
}

export default BehaviorPatternValidator;