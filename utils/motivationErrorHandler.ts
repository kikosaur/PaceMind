import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotivationPredictionResponse, MotivationTrendData } from '../lib/motivation-service';

export enum MotivationErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  OFFLINE_ERROR = 'OFFLINE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface MotivationError {
  type: MotivationErrorType;
  message: string;
  originalError?: Error;
  timestamp: number;
  retryable: boolean;
}

export class MotivationErrorHandler {
  private static readonly ERROR_LOG_KEY = 'motivation_error_log';
  private static readonly MAX_ERROR_LOG_SIZE = 50;
  private static readonly OFFLINE_PREDICTION_KEY = 'offline_motivation_prediction';
  private static readonly OFFLINE_TREND_KEY = 'offline_motivation_trend';

  /**
   * Create a standardized error object
   */
  static createError(
    type: MotivationErrorType,
    message: string,
    originalError?: Error,
    retryable: boolean = true
  ): MotivationError {
    return {
      type,
      message,
      originalError,
      timestamp: Date.now(),
      retryable
    };
  }

  /**
   * Classify an error based on its characteristics
   */
  static classifyError(error: Error): MotivationError {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return this.createError(
        MotivationErrorType.NETWORK_ERROR,
        'Network connection failed. Please check your internet connection.',
        error
      );
    }
    
    if (message.includes('timeout')) {
      return this.createError(
        MotivationErrorType.TIMEOUT_ERROR,
        'Request timed out. Please try again.',
        error
      );
    }
    
    if (message.includes('400') || message.includes('validation') || message.includes('invalid')) {
      return this.createError(
        MotivationErrorType.VALIDATION_ERROR,
        'Invalid data provided. Please check your input.',
        error,
        false
      );
    }
    
    if (message.includes('401') || message.includes('403')) {
      return this.createError(
        MotivationErrorType.API_ERROR,
        'Authentication failed. Please log in again.',
        error,
        false
      );
    }
    
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return this.createError(
        MotivationErrorType.API_ERROR,
        'Server error. Please try again later.',
        error
      );
    }
    
    if (message.includes('cache') || message.includes('storage')) {
      return this.createError(
        MotivationErrorType.CACHE_ERROR,
        'Cache error occurred. Data may not be saved.',
        error
      );
    }
    
    return this.createError(
      MotivationErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred. Please try again.',
      error
    );
  }

  /**
   * Log error for debugging and analytics
   */
  static async logError(error: MotivationError): Promise<void> {
    try {
      const existingLogs = await AsyncStorage.getItem(this.ERROR_LOG_KEY);
      const logs: MotivationError[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Add new error to the beginning
      logs.unshift(error);
      
      // Keep only the most recent errors
      if (logs.length > this.MAX_ERROR_LOG_SIZE) {
        logs.splice(this.MAX_ERROR_LOG_SIZE);
      }
      
      await AsyncStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(logs));
      
      // Log to console for development
      console.error('Motivation Error:', {
        type: error.type,
        message: error.message,
        timestamp: new Date(error.timestamp).toISOString(),
        retryable: error.retryable
      });
    } catch (logError) {
      console.error('Failed to log motivation error:', logError);
    }
  }

  /**
   * Get error logs for debugging
   */
  static async getErrorLogs(): Promise<MotivationError[]> {
    try {
      const logs = await AsyncStorage.getItem(this.ERROR_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  /**
   * Clear error logs
   */
  static async clearErrorLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ERROR_LOG_KEY);
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  /**
   * Store offline fallback prediction
   */
  static async storeOfflinePrediction(prediction: MotivationPredictionResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.OFFLINE_PREDICTION_KEY,
        JSON.stringify({
          prediction,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error('Failed to store offline prediction:', error);
    }
  }

  /**
   * Get offline fallback prediction
   */
  static async getOfflinePrediction(): Promise<MotivationPredictionResponse | null> {
    try {
      const stored = await AsyncStorage.getItem(this.OFFLINE_PREDICTION_KEY);
      if (!stored) return null;
      
      const { prediction, timestamp } = JSON.parse(stored);
      
      // Check if prediction is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAge) {
        await AsyncStorage.removeItem(this.OFFLINE_PREDICTION_KEY);
        return null;
      }
      
      return prediction;
    } catch (error) {
      console.error('Failed to get offline prediction:', error);
      return null;
    }
  }

  /**
   * Store offline fallback trend data
   */
  static async storeOfflineTrend(trendData: MotivationTrendData[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.OFFLINE_TREND_KEY,
        JSON.stringify({
          trendData,
          timestamp: Date.now()
        })
      );
    } catch (error) {
      console.error('Failed to store offline trend:', error);
    }
  }

  /**
   * Get offline fallback trend data
   */
  static async getOfflineTrend(): Promise<MotivationTrendData[] | null> {
    try {
      const stored = await AsyncStorage.getItem(this.OFFLINE_TREND_KEY);
      if (!stored) return null;
      
      const { trendData, timestamp } = JSON.parse(stored);
      
      // Check if trend data is not too old (12 hours)
      const maxAge = 12 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAge) {
        await AsyncStorage.removeItem(this.OFFLINE_TREND_KEY);
        return null;
      }
      
      return trendData;
    } catch (error) {
      console.error('Failed to get offline trend:', error);
      return null;
    }
  }

  /**
   * Generate fallback prediction when offline or API fails
   */
  static generateFallbackPrediction(
    currentMotivation?: number,
    recentActivity?: { steps: number; distance: number }
  ): MotivationPredictionResponse {
    const baseMotivation = currentMotivation || 60;
    const activityBoost = recentActivity 
      ? Math.min(20, (recentActivity.steps / 1000) * 2 + (recentActivity.distance * 5))
      : 0;
    
    const predictedMotivation = Math.max(20, Math.min(100, baseMotivation + activityBoost));
    
    return {
      motivation_state: predictedMotivation > 70 ? 'high' : predictedMotivation > 40 ? 'medium' : 'low',
      confidence: 0.3, // Low confidence for fallback
      suggestion: 'Unable to connect to prediction service - using basic estimation',
      insights: {
        primaryFactors: ['Basic activity-based estimation'],
        recommendations: [
          'Unable to connect to prediction service',
          'Using basic activity-based estimation',
          'Try again when connection is restored'
        ]
      },
      timestamp: Date.now()
    };
  }

  /**
   * Generate fallback trend data
   */
  static generateFallbackTrend(): MotivationTrendData[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      value: 0.5 + Math.random() * 0.3, // Random values between 0.5-0.8
      prediction: undefined,
      confidence: undefined
    }));
  }

  /**
   * Check if device is online
   */
  static async isOnline(): Promise<boolean> {
    try {
      // Simple connectivity check using AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retry function with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: MotivationError): string {
    switch (error.type) {
      case MotivationErrorType.NETWORK_ERROR:
        return 'No internet connection. Using cached data.';
      case MotivationErrorType.TIMEOUT_ERROR:
        return 'Request timed out. Please try again.';
      case MotivationErrorType.API_ERROR:
        return 'Service temporarily unavailable. Using fallback data.';
      case MotivationErrorType.VALIDATION_ERROR:
        return 'Invalid data. Please check your input.';
      case MotivationErrorType.CACHE_ERROR:
        return 'Storage error. Some features may not work properly.';
      case MotivationErrorType.OFFLINE_ERROR:
        return 'You are offline. Using cached predictions.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}