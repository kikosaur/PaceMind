import { MotivationErrorHandler, MotivationErrorType, MotivationError } from '../utils/motivationErrorHandler';
import { MotivationPredictionResponse } from '../lib/motivation-service';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('MotivationErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const result = MotivationErrorHandler.classifyError(networkError);
      
      expect(result.type).toBe(MotivationErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      const result = MotivationErrorHandler.classifyError(timeoutError);
      
      expect(result.type).toBe(MotivationErrorType.TIMEOUT_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should classify API errors correctly', () => {
      const apiError = new Error('API returned 500');
      const result = MotivationErrorHandler.classifyError(apiError);
      
      expect(result.type).toBe(MotivationErrorType.API_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Invalid input data');
      const result = MotivationErrorHandler.classifyError(validationError);
      
      expect(result.type).toBe(MotivationErrorType.VALIDATION_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should classify cache errors correctly', () => {
      const cacheError = new Error('Cache write failed');
      const result = MotivationErrorHandler.classifyError(cacheError);
      
      expect(result.type).toBe(MotivationErrorType.CACHE_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should classify unknown errors correctly', () => {
      const unknownError = new Error('Something went wrong');
      const result = MotivationErrorHandler.classifyError(unknownError);
      
      expect(result.type).toBe(MotivationErrorType.UNKNOWN_ERROR);
      expect(result.retryable).toBe(true);
    });
  });

  describe('Error Creation', () => {
    it('should create error with correct properties', () => {
      const originalError = new Error('Test error');
      const result = MotivationErrorHandler.createError(
        MotivationErrorType.NETWORK_ERROR,
        'Network failed',
        originalError,
        true
      );

      expect(result.type).toBe(MotivationErrorType.NETWORK_ERROR);
      expect(result.message).toBe('Network failed');
      expect(result.originalError).toBe(originalError);
      expect(result.retryable).toBe(true);
      expect(typeof result.timestamp).toBe('number');
    });
  });

  describe('User Friendly Messages', () => {
    it('should return appropriate message for network errors', () => {
      const error: MotivationError = {
        type: MotivationErrorType.NETWORK_ERROR,
        message: 'Network failed',
        timestamp: Date.now(),
        retryable: true
      };

      const message = MotivationErrorHandler.getUserFriendlyMessage(error);
      expect(message).toContain('connection');
    });

    it('should return appropriate message for API errors', () => {
      const error: MotivationError = {
        type: MotivationErrorType.API_ERROR,
        message: 'API failed',
        timestamp: Date.now(),
        retryable: true
      };

      const message = MotivationErrorHandler.getUserFriendlyMessage(error);
      expect(message).toContain('Service');
    });

    it('should return appropriate message for validation errors', () => {
      const error: MotivationError = {
        type: MotivationErrorType.VALIDATION_ERROR,
        message: 'Invalid data',
        timestamp: Date.now(),
        retryable: false
      };

      const message = MotivationErrorHandler.getUserFriendlyMessage(error);
      expect(message).toContain('data');
    });
  });

  describe('Fallback Prediction Generation', () => {
    it('should generate fallback prediction with default values', () => {
      const result = MotivationErrorHandler.generateFallbackPrediction();
      
      expect(result.motivation_state).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.suggestion).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.insights.recommendations).toBeInstanceOf(Array);
      expect(typeof result.timestamp).toBe('number');
    });

    it('should generate fallback prediction with activity data', () => {
      const activityData = { steps: 8000, distance: 5.2 };
      const result = MotivationErrorHandler.generateFallbackPrediction(undefined, activityData);
      const fallbackResult = MotivationErrorHandler.generateFallbackPrediction(0.7, activityData);
      
      expect(result.motivation_state).toBeDefined();
      expect(fallbackResult.motivation_state).toBeDefined();
    });
  });

  describe('Fallback Trend Data Generation', () => {
    it('should generate fallback trend data', () => {
      const result = MotivationErrorHandler.generateFallbackTrend();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((point: any) => {
        expect(point).toHaveProperty('day');
        expect(point).toHaveProperty('value');
      });
    });

    it('should generate consistent trend data structure', () => {
      const result = MotivationErrorHandler.generateFallbackTrend();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(7); // 7 days of data
      result.forEach((point: any, index: number) => {
        expect(typeof point.day).toBe('string');
        expect(typeof point.value).toBe('number');
        expect(point.value).toBeGreaterThanOrEqual(0);
        expect(point.value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Retry with Backoff', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success');
      });

      const result = await MotivationErrorHandler.retryWithBackoff(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        MotivationErrorHandler.retryWithBackoff(mockFn, 2, 10)
      ).rejects.toThrow('Persistent failure');
    });
  });

  describe('Offline Storage', () => {
    it('should store offline prediction', async () => {
      const prediction: MotivationPredictionResponse = {
        motivation_state: 'high',
        confidence: 0.8,
        suggestion: 'Keep it up!',
        insights: {
          primaryFactors: ['great_progress'],
          recommendations: ['Keep up the good work']
        },
        recommendations: ['Continue walking'],
        timestamp: Date.now()
      };

      await expect(
        MotivationErrorHandler.storeOfflinePrediction(prediction)
      ).resolves.not.toThrow();
    });

    it('should retrieve offline prediction', async () => {
      const mockPrediction = {
        motivation_state: 'medium',
        confidence: 0.6,
        suggestion: 'Good work',
        insights: {
          primaryFactors: ['Steady progress'],
          recommendations: ['Keep going']
        },
        timestamp: 1759540161310
      };

      const storedData = {
        prediction: mockPrediction,
        timestamp: 1759540161310
      };

      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedData));

      const result = await MotivationErrorHandler.getOfflinePrediction();

      expect(result).toEqual(mockPrediction);
    });

    it('should return null when no offline prediction exists', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await MotivationErrorHandler.getOfflinePrediction();
      expect(result).toBeNull();
    });
  });

  describe('Network Status', () => {
    it('should check online status', async () => {
      // Mock successful fetch
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const isOnline = await MotivationErrorHandler.isOnline();
      expect(typeof isOnline).toBe('boolean');
    });

    it('should handle offline status', async () => {
      // Mock failed fetch
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const isOnline = await MotivationErrorHandler.isOnline();
      expect(isOnline).toBe(false);
    });
  });

  describe('Error Logging', () => {
    it('should log errors correctly', async () => {
      const error: MotivationError = {
        type: MotivationErrorType.NETWORK_ERROR,
        message: 'Test error',
        timestamp: Date.now(),
        retryable: true
      };

      await expect(
        MotivationErrorHandler.logError(error)
      ).resolves.not.toThrow();
    });
  });
});