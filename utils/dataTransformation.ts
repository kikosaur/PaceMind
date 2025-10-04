import { WalkingSession, JournalEntry, BasicStats } from '../contexts/WalkingContext';
import { EnhancedMetrics } from '../lib/enhanced-walking-context';
import { QualityReport } from '../lib/data-quality-monitor';

/**
 * Interface for ML model input data structure
 */
export interface MLModelInput {
  // Walking statistics
  steps: number;
  distance: number;
  duration: number;
  avgPace: number;
  avgSpeed: number;
  calories: number;
  
  // Time-based features
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isWeekend: boolean;
  
  // Performance metrics
  consistencyScore: number;
  improvementTrend: number;
  goalAchievementRate: number;
  
  // Enhanced metrics (if available)
  cadence?: number;
  elevationGain?: number;
  heartRateZone?: number;
  weatherImpact?: number;
  
  // Journal sentiment (if available)
  sentimentScore?: number;
  energyLevel?: number;
  moodRating?: number;
  
  // Historical context
  recentPerformance: number;
  weeklyAverage: number;
  monthlyTrend: number;
}

/**
 * Interface for journal sentiment analysis
 */
export interface JournalSentiment {
  sentimentScore: number; // -1 to 1 (negative to positive)
  energyLevel: number; // 1-5 scale
  moodRating: number; // 1-5 scale
  confidence: number; // 0-1 confidence in analysis
}

/**
 * Data transformation utilities for ML model integration
 */
export class DataTransformationUtils {
  
  /**
   * Transform walking session data to ML model input format
   */
  static transformWalkingSession(
    session: WalkingSession,
    stats: BasicStats,
    enhancedMetrics?: EnhancedMetrics,
    qualityReport?: QualityReport
  ): Partial<MLModelInput> {
    const sessionDate = new Date(session.startTime);
    
    return {
      steps: session.steps,
      distance: session.distance,
      duration: session.duration,
      avgPace: session.metrics.averagePace || this.calculatePace(session.distance, session.duration),
      avgSpeed: session.metrics.speed || this.calculateSpeed(session.distance, session.duration),
      calories: session.calories || this.estimateCalories(session.steps, session.distance),
      
      timeOfDay: this.getTimeOfDay(sessionDate),
      dayOfWeek: sessionDate.getDay(),
      isWeekend: sessionDate.getDay() === 0 || sessionDate.getDay() === 6,
      
      consistencyScore: this.calculateConsistencyScore(stats),
      improvementTrend: this.calculateImprovementTrend(stats),
      goalAchievementRate: this.calculateGoalAchievementRate(stats),
      
      // Enhanced metrics if available
      ...(enhancedMetrics && {
        cadence: enhancedMetrics.kpis?.cadence?.averageCadence || 0,
        elevationGain: 0, // Not available in current KPI structure
        heartRateZone: enhancedMetrics.kpis?.heartRate?.averageHeartRate ? 2 : 1,
        weatherImpact: enhancedMetrics.gpsAccuracy || 0,
      }),
      
      recentPerformance: this.calculateRecentPerformance(stats),
      weeklyAverage: this.calculateWeeklyAverage(stats),
      monthlyTrend: this.calculateMonthlyTrend(stats),
    };
  }

  /**
   * Analyze journal entry for sentiment and mood indicators
   */
  static analyzeJournalSentiment(entry: JournalEntry): JournalSentiment {
    const text = (entry.notes || '').toLowerCase();
    
    // Simple sentiment analysis based on keywords
    const positiveWords = [
      'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'energetic', 'motivated', 'strong', 'confident', 'happy', 'excited',
      'accomplished', 'proud', 'successful', 'refreshed', 'invigorated'
    ];
    
    const negativeWords = [
      'tired', 'exhausted', 'difficult', 'hard', 'struggled', 'pain',
      'frustrated', 'disappointed', 'weak', 'unmotivated', 'sad', 'stressed',
      'challenging', 'tough', 'sluggish', 'drained', 'overwhelmed'
    ];
    
    const energyWords = {
      high: ['energetic', 'strong', 'powerful', 'vigorous', 'dynamic'],
      medium: ['steady', 'consistent', 'moderate', 'balanced'],
      low: ['tired', 'sluggish', 'drained', 'exhausted', 'weak']
    };
    
    let sentimentScore = 0;
    let energyLevel = 3; // Default to medium
    let moodRating = 3; // Default to neutral
    
    // Calculate sentiment score
    const words = text.split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach((word: string) => {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
      }
      if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
      }
    });
    
    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords > 0) {
      sentimentScore = (positiveCount - negativeCount) / totalSentimentWords;
      moodRating = Math.max(1, Math.min(5, 3 + (sentimentScore * 2)));
    }
    
    // Determine energy level
    const highEnergyCount = energyWords.high.filter(word => text.includes(word)).length;
    const lowEnergyCount = energyWords.low.filter(word => text.includes(word)).length;
    
    if (highEnergyCount > lowEnergyCount) {
      energyLevel = Math.min(5, 4 + highEnergyCount);
    } else if (lowEnergyCount > highEnergyCount) {
      energyLevel = Math.max(1, 3 - lowEnergyCount);
    }
    
    // Calculate confidence based on text length and keyword density
    const confidence = Math.min(1, (totalSentimentWords / Math.max(10, words.length)) + 0.3);
    
    return {
      sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
      energyLevel: Math.max(1, Math.min(5, energyLevel)),
      moodRating: Math.max(1, Math.min(5, moodRating)),
      confidence: Math.max(0.1, Math.min(1, confidence))
    };
  }

  /**
   * Combine walking and journal data for complete ML input
   */
  static createMLInput(
    session: WalkingSession,
    stats: BasicStats,
    journalEntry?: JournalEntry,
    enhancedMetrics?: EnhancedMetrics,
    qualityReport?: QualityReport
  ): MLModelInput {
    const walkingData = this.transformWalkingSession(session, stats, enhancedMetrics, qualityReport);
    
    let journalData = {};
    if (journalEntry) {
      const sentiment = this.analyzeJournalSentiment(journalEntry);
      journalData = {
        sentimentScore: sentiment.sentimentScore,
        energyLevel: sentiment.energyLevel,
        moodRating: sentiment.moodRating,
      };
    }
    
    return {
      ...walkingData,
      ...journalData,
    } as MLModelInput;
  }

  /**
   * Batch transform multiple sessions for historical analysis
   */
  static batchTransformSessions(
    sessions: WalkingSession[],
    stats: BasicStats,
    journalEntries: JournalEntry[] = [],
    enhancedMetrics?: EnhancedMetrics[]
  ): MLModelInput[] {
    return sessions.map((session: WalkingSession, index: number) => {
      const matchingJournal = journalEntries.find(
        (entry: JournalEntry) => Math.abs(new Date(entry.timestamp).getTime() - new Date(session.startTime).getTime()) < 24 * 60 * 60 * 1000
      );
      
      const sessionEnhancedMetrics = enhancedMetrics?.[index];
      
      return this.createMLInput(session, stats, matchingJournal, sessionEnhancedMetrics);
    });
  }

  // Helper methods for calculations
  
  private static calculatePace(distance: number, duration: number): number {
    if (distance === 0) return 0;
    return duration / distance; // minutes per km/mile
  }

  private static calculateSpeed(distance: number, duration: number): number {
    if (duration === 0) return 0;
    return distance / (duration / 60); // km/h or mph
  }

  private static estimateCalories(steps: number, distance: number): number {
    // Simple estimation: ~0.04 calories per step + distance factor
    return Math.round(steps * 0.04 + distance * 50);
  }

  private static getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private static calculateConsistencyScore(stats: BasicStats): number {
    // Since BasicStats doesn't have weeklyStats, we'll use a simplified calculation
    // based on the current stats values
    if (stats.walks < 2) return 0.5;
    
    // Calculate consistency based on average performance
    const avgDistance = stats.distance / Math.max(stats.walks, 1);
    const avgDuration = stats.duration / Math.max(stats.walks, 1);
    
    // Simple consistency score based on reasonable ranges
    const distanceConsistency = avgDistance > 0 && avgDistance < 20 ? 0.8 : 0.5;
    const durationConsistency = avgDuration > 0 && avgDuration < 120 ? 0.8 : 0.5;
    
    return (distanceConsistency + durationConsistency) / 2;
  }

  private static calculateImprovementTrend(stats: BasicStats): number {
    // Since BasicStats doesn't have historical data, we'll use a simplified calculation
    // based on current performance vs typical values
    const avgDistance = stats.distance / Math.max(stats.walks, 1);
    const avgDuration = stats.duration / Math.max(stats.walks, 1);
    
    // Compare against typical beginner values (5km distance, 45min duration)
    const distanceImprovement = Math.min(1, avgDistance / 5);
    const durationEfficiency = Math.min(1, 45 / Math.max(avgDuration, 1));
    
    return (distanceImprovement + durationEfficiency) / 2;
  }

  private static calculateGoalAchievementRate(stats: BasicStats): number {
    // Assuming a weekly goal of 10km (can be made configurable later)
    const weeklyGoal = 10; // km
    const currentDistance = stats.distance;
    
    return Math.min(1, currentDistance / weeklyGoal);
  }

  private static calculateRecentPerformance(stats: BasicStats): number {
    // Since BasicStats doesn't have session history, calculate based on current averages
    const avgDistance = stats.distance / Math.max(stats.walks, 1);
    const avgDuration = stats.duration / Math.max(stats.walks, 1);
    
    // Normalize performance score (0-1) based on reasonable targets
    const distanceScore = Math.min(1, avgDistance / 10); // 10km as good performance
    const durationScore = Math.min(1, 60 / Math.max(avgDuration, 1)); // 60min as efficient
    
    return (distanceScore + durationScore) / 2;
  }

  private static calculateWeeklyAverage(stats: BasicStats): number {
    // Since BasicStats doesn't have weeklyStats array, return average distance per walk
    return stats.distance / Math.max(stats.walks, 1);
  }

  private static calculateMonthlyTrend(stats: BasicStats): number {
    // Since BasicStats doesn't have monthlyStats array, return a simplified trend
    // based on current performance vs expected values
    const avgDistance = stats.distance / Math.max(stats.walks, 1);
    
    // Simple trend calculation: positive if above 5km average, negative if below
    return avgDistance > 5 ? 0.5 : -0.5;
  }
}

/**
 * Validation utilities for ML input data
 */
export class MLDataValidator {
  
  /**
   * Validate ML input data structure and values
   */
  static validateMLInput(input: MLModelInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields validation
    const requiredFields = ['steps', 'distance', 'duration', 'timeOfDay', 'dayOfWeek'];
    requiredFields.forEach(field => {
      if (input[field as keyof MLModelInput] === undefined || input[field as keyof MLModelInput] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Value range validation
    if (input.steps < 0) errors.push('Steps cannot be negative');
    if (input.distance < 0) errors.push('Distance cannot be negative');
    if (input.duration < 0) errors.push('Duration cannot be negative');
    if (input.dayOfWeek < 0 || input.dayOfWeek > 6) errors.push('Day of week must be 0-6');
    
    // Optional field validation
    if (input.sentimentScore !== undefined && (input.sentimentScore < -1 || input.sentimentScore > 1)) {
      errors.push('Sentiment score must be between -1 and 1');
    }
    
    if (input.energyLevel !== undefined && (input.energyLevel < 1 || input.energyLevel > 5)) {
      errors.push('Energy level must be between 1 and 5');
    }
    
    if (input.moodRating !== undefined && (input.moodRating < 1 || input.moodRating > 5)) {
      errors.push('Mood rating must be between 1 and 5');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize and normalize ML input data
   */
  static sanitizeMLInput(input: Partial<MLModelInput>): MLModelInput {
    return {
      steps: Math.max(0, input.steps || 0),
      distance: Math.max(0, input.distance || 0),
      duration: Math.max(0, input.duration || 0),
      avgPace: Math.max(0, input.avgPace || 0),
      avgSpeed: Math.max(0, input.avgSpeed || 0),
      calories: Math.max(0, input.calories || 0),
      
      timeOfDay: input.timeOfDay || 'morning',
      dayOfWeek: Math.max(0, Math.min(6, input.dayOfWeek || 0)),
      isWeekend: input.isWeekend || false,
      
      consistencyScore: Math.max(0, Math.min(1, input.consistencyScore || 0.5)),
      improvementTrend: Math.max(-1, Math.min(1, input.improvementTrend || 0)),
      goalAchievementRate: Math.max(0, Math.min(1, input.goalAchievementRate || 0)),
      
      recentPerformance: Math.max(0, Math.min(1, input.recentPerformance || 0.5)),
      weeklyAverage: Math.max(0, input.weeklyAverage || 0),
      monthlyTrend: Math.max(-1, Math.min(1, input.monthlyTrend || 0)),
      
      // Optional fields with validation
      ...(input.cadence !== undefined && { cadence: Math.max(0, input.cadence) }),
      ...(input.elevationGain !== undefined && { elevationGain: Math.max(0, input.elevationGain) }),
      ...(input.heartRateZone !== undefined && { heartRateZone: Math.max(1, Math.min(5, input.heartRateZone)) }),
      ...(input.weatherImpact !== undefined && { weatherImpact: Math.max(-1, Math.min(1, input.weatherImpact)) }),
      ...(input.sentimentScore !== undefined && { sentimentScore: Math.max(-1, Math.min(1, input.sentimentScore)) }),
      ...(input.energyLevel !== undefined && { energyLevel: Math.max(1, Math.min(5, input.energyLevel)) }),
      ...(input.moodRating !== undefined && { moodRating: Math.max(1, Math.min(5, input.moodRating)) }),
    };
  }
}