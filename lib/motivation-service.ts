import { JournalEntry } from '../types/walking';
import { WalkingSession } from '../lib/database-improved';
import { MotivationCacheManager } from '../utils/motivationCache';
import { 
  MotivationErrorHandler, 
  MotivationErrorType
} from '../utils/motivationErrorHandler';

// Types for ML model integration
export interface MotivationPredictionRequest {
  walking: {
    steps: number;
    distance: number; // km
    duration: number; // minutes
    calories: number;
    pace: number; // derived: steps/duration
  };
  context: {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    weeklyProgress: number; // km
    monthlyProgress: number; // km
  };
  journal: {
    mood: 'happy' | 'neutral' | 'sad';
    energyLevel: number; // 1-5
    motivation: number; // 0-100 (adjusted from 1-100)
    notes?: string;
  };
}

export interface MotivationPredictionResponse {
  motivation_state: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  suggestion: string;
  insights: {
    primaryFactors: string[];
    recommendations: string[];
    trendAnalysis?: string;
  };
  recommendations?: string[];
  timestamp: number;
}

export interface MotivationTrendData {
  day: string;
  value: number;
  prediction?: 'high' | 'medium' | 'low';
  confidence?: number;
}

// Configuration for the ML service
interface MotivationServiceConfig {
  apiBaseUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheExpiry: number; // milliseconds
}

// Error types for better error handling
export class MotivationServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MotivationServiceError';
  }
}

export class MotivationService {
  private config: MotivationServiceConfig;
  private cacheManager: MotivationCacheManager;

  constructor(config?: Partial<MotivationServiceConfig>) {
    this.config = {
      apiBaseUrl: process.env.EXPO_PUBLIC_ML_API_URL || 'https://your-fastapi-endpoint.com',
      timeout: 10000, // 10 seconds
      retryAttempts: 3,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    // Initialize cache manager with service config
    this.cacheManager = MotivationCacheManager.getInstance({
      predictionTTL: this.config.cacheExpiry,
      trendTTL: this.config.cacheExpiry * 2, // Trends can be cached longer
      maxCacheSize: 100,
      compressionEnabled: true,
    });
  }

  /**
   * Transform walking session data for ML model
   */
  private transformWalkingData(session: WalkingSession): MotivationPredictionRequest['walking'] {
    const durationMinutes = (session.duration || 0) / 60; // Convert seconds to minutes, handle undefined
    const pace = session.steps > 0 && durationMinutes > 0 ? session.steps / durationMinutes : 0;

    return {
      steps: session.steps,
      distance: session.distance,
      duration: durationMinutes,
      calories: session.calories_burned || 0,
      pace: pace
    };
  }

  /**
   * Transform context data for ML model
   */
  private transformContextData(
    sessionStartTime: number,
    weeklyDistance: number,
    monthlyDistance: number
  ): MotivationPredictionRequest['context'] {
    const hour = new Date(sessionStartTime).getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening';

    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = 'afternoon';
    } else {
      timeOfDay = 'evening';
    }

    return {
      timeOfDay,
      weeklyProgress: weeklyDistance,
      monthlyProgress: monthlyDistance
    };
  }

  /**
   * Transform journal entry for ML model
   */
  private transformJournalData(entry: JournalEntry): MotivationPredictionRequest['journal'] {
    return {
      mood: entry.mood,
      energyLevel: entry.energyLevel,
      motivation: Math.max(0, entry.motivation - 1), // Convert 1-100 to 0-100
      notes: entry.notes
    };
  }

  /**
   * Generate cache key for prediction request
   */
  private generateCacheKey(request: MotivationPredictionRequest): string {
    // Create a deterministic key based on request data
    const keyData = {
      walking: request.walking,
      context: request.context,
      journal: {
        mood: request.journal.mood,
        energyLevel: request.journal.energyLevel,
        motivation: request.journal.motivation,
        // Exclude notes from cache key as they're not used in prediction
      }
    };
    
    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  /**
   * Check if cached prediction is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.cacheExpiry;
  }

  /**
   * Make HTTP request with retry logic and comprehensive error handling
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    retries: number = this.config.retryAttempts
  ): Promise<T> {
    return MotivationErrorHandler.retryWithBackoff(async () => {
      try {
        // Check if online first
        const isOnline = await MotivationErrorHandler.isOnline();
        if (!isOnline) {
          throw MotivationErrorHandler.createError(
            MotivationErrorType.OFFLINE_ERROR,
            'Device is offline'
          );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        const motivationError = MotivationErrorHandler.classifyError(error as Error);
        await MotivationErrorHandler.logError(motivationError);
        throw motivationError;
      }
    }, retries);
  }

  /**
   * Predict motivation level with comprehensive error handling and offline fallbacks
   */
  async predictMotivation(
    walkingData: WalkingSession | null,
    journalData: JournalEntry[],
    contextData: any,
    userId?: string
  ): Promise<MotivationPredictionResponse> {
    try {
      // Use the most recent journal entry if available
      const latestJournal = journalData[journalData.length - 1];
      if (!latestJournal) {
        throw new Error('No journal data available for prediction');
      }

      // Transform data for ML model
      const request: MotivationPredictionRequest = {
        walking: walkingData ? this.transformWalkingData(walkingData) : {
          steps: 0,
          distance: 0,
          duration: 0,
          calories: 0,
          pace: 0
        },
        context: this.transformContextData(
          walkingData ? new Date(walkingData.start_time).getTime() : Date.now(),
          contextData?.weeklyStats?.distance || 0,
          contextData?.monthlyStats?.distance || 0
        ),
        journal: this.transformJournalData(latestJournal)
      };

      // Check cache first (if userId is provided)
      if (userId) {
        const cacheKey = this.generateCacheKey(request);
        const cached = await this.cacheManager.getCachedPrediction(userId, cacheKey);
        if (cached) {
          console.log('Using cached motivation prediction');
          return cached.prediction;
        }
      }

      // Make API request
      const result = await this.makeRequest<MotivationPredictionResponse>(
        `${this.config.apiBaseUrl}/predict`,
        {
          method: 'POST',
          body: JSON.stringify(request)
        }
      );
      
      // Add timestamp
      result.timestamp = Date.now();

      // Cache the result (if userId is provided)
      if (userId) {
        const cacheKey = this.generateCacheKey(request);
        await this.cacheManager.cachePrediction(userId, cacheKey, result);
      }

      // Store offline fallback
      await MotivationErrorHandler.storeOfflinePrediction(result);

      return result;
    } catch (error) {
      console.error('Motivation prediction failed:', error);
      
      // Try to get offline prediction first
      const offlinePrediction = await MotivationErrorHandler.getOfflinePrediction();
      if (offlinePrediction) {
        console.log('Using offline prediction fallback');
        return offlinePrediction;
      }

      // Generate fallback prediction
      const latestJournal = journalData[journalData.length - 1];
      const fallbackPrediction = MotivationErrorHandler.generateFallbackPrediction(
        latestJournal?.motivation,
        walkingData ? { steps: walkingData.steps, distance: walkingData.distance } : undefined
      );
      
      // Cache fallback prediction if userId is provided
      if (userId) {
        const request: MotivationPredictionRequest = {
          walking: walkingData ? this.transformWalkingData(walkingData) : {
            steps: 0,
            distance: 0,
            duration: 0,
            calories: 0,
            pace: 0
          },
          context: this.transformContextData(
            walkingData ? new Date(walkingData.start_time).getTime() : Date.now(),
            contextData?.weeklyStats?.distance || 0,
            contextData?.monthlyStats?.distance || 0
          ),
          journal: latestJournal ? this.transformJournalData(latestJournal) : {
            mood: 'neutral',
            energyLevel: 3,
            motivation: 50
          }
        };
        
        try {
          const cacheKey = this.generateCacheKey(request);
          await this.cacheManager.cachePrediction(userId, cacheKey, fallbackPrediction);
        } catch (cacheError) {
          console.warn('Failed to cache fallback prediction:', cacheError);
        }
      }
      
      return fallbackPrediction;
    }
  }

  /**
   * Generate fallback prediction when API is unavailable
   */
  private generateFallbackPrediction(
    session: WalkingSession,
    journalEntry: JournalEntry
  ): MotivationPredictionResponse {
    // Simple heuristic-based prediction
    const motivationScore = journalEntry.motivation;
    const energyScore = journalEntry.energyLevel * 20; // Convert 1-5 to 0-100
    const moodScore = journalEntry.mood === 'happy' ? 80 : journalEntry.mood === 'neutral' ? 50 : 20;
    
    const averageScore = (motivationScore + energyScore + moodScore) / 3;
    const motivationState = averageScore >= 60 ? 'high' : 'low';

    return {
      motivation_state: motivationState,
      confidence: 0.6, // Lower confidence for fallback
      suggestion: motivationState === 'high' 
        ? "Great energy! Keep up the momentum with your walking routine."
        : "Consider walking during your most energetic time of day to boost motivation.",
      insights: {
        primaryFactors: ['Energy Level', 'Mood', 'Self-reported Motivation'],
        recommendations: [
          motivationState === 'low' 
            ? "Try shorter, more frequent walks to build consistency"
            : "Challenge yourself with slightly longer distances",
          "Reflect on what makes your walks most enjoyable"
        ]
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get motivation trend data for visualization with comprehensive error handling
   */
  async getMotivationTrend(
    predictions: MotivationPredictionResponse[],
    userId?: string
  ): Promise<MotivationTrendData[]> {
    try {
      // Check cache first if userId is provided
      if (userId) {
        const cached = await this.cacheManager.getCachedTrend(userId);
        if (cached) {
          console.log('Using cached motivation trend data');
          return cached.trendData;
        }
      }

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      const trendData = last7Days.map((day, index) => {
        const prediction = predictions[index];
        return {
          day,
          value: prediction ? (prediction.motivation_state === 'high' ? 80 : 40) : 60,
          prediction: prediction?.motivation_state,
          confidence: prediction?.confidence
        };
      });

      // Cache the trend data if userId is provided
      if (userId) {
        await this.cacheManager.cacheTrend(userId, trendData);
      }

      // Store offline fallback
      await MotivationErrorHandler.storeOfflineTrend(trendData);

      return trendData;
    } catch (error) {
      console.error('Failed to generate motivation trend:', error);
      
      // Try to get offline trend data first
      const offlineTrend = await MotivationErrorHandler.getOfflineTrend();
      if (offlineTrend) {
        console.log('Using offline trend data fallback');
        return offlineTrend;
      }

      // Return fallback trend data
      const fallbackTrend = MotivationErrorHandler.generateFallbackTrend();
      
      // Cache fallback if userId is provided
      if (userId) {
        try {
          await this.cacheManager.cacheTrend(userId, fallbackTrend);
        } catch (cacheError) {
          console.warn('Failed to cache fallback trend:', cacheError);
        }
      }

      return fallbackTrend;
    }
  }

  /**
   * Clear cache and stored predictions
   */
  async clearCache(userId?: string): Promise<void> {
    if (userId) {
      // Clear cache for specific user
      await this.cacheManager.clearUserCache(userId);
    } else {
      // Clear all cache
      await this.cacheManager.clearAllCache();
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    await this.cacheManager.clearExpiredCache();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await this.cacheManager.getCacheStats();
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<MotivationServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const motivationService = new MotivationService();
export default motivationService;