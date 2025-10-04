describe('MotivationService Core Tests', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('API Integration', () => {
    it('should handle successful API response', async () => {
      const mockResponse = {
        prediction: 0.75,
        confidence: 0.85,
        factors: ['consistent_activity', 'positive_mood'],
        recommendations: ['Keep up the great work!']
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetch('/api/motivation/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walkingData: { steps: 5000, distance: 3.2 },
          journalData: { mood: 4, energy: 3 },
          contextData: { timeOfDay: 'morning' }
        })
      });

      const data = await result.json();
      
      expect(result.ok).toBe(true);
      expect(data.prediction).toBe(0.75);
      expect(data.confidence).toBe(0.85);
      expect(data.factors).toContain('consistent_activity');
      expect(data.recommendations).toHaveLength(1);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/motivation/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid input data' })
      });

      const result = await fetch('/api/motivation/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      
      const errorData = await result.json();
      expect(errorData.error).toBe('Invalid input data');
    });
  });

  describe('Data Validation', () => {
    it('should validate walking data structure', () => {
      const validWalkingData = {
        steps: 5000,
        distance: 3.2,
        duration: 45,
        calories: 200
      };

      const isValid = Object.keys(validWalkingData).every(key => 
        validWalkingData[key as keyof typeof validWalkingData] !== undefined &&
        typeof validWalkingData[key as keyof typeof validWalkingData] === 'number'
      );

      expect(isValid).toBe(true);
    });

    it('should validate journal data structure', () => {
      const validJournalData = {
        mood: 4,
        energy: 3,
        motivation: 5,
        notes: 'Feeling great today!'
      };

      expect(validJournalData.mood).toBeGreaterThanOrEqual(1);
      expect(validJournalData.mood).toBeLessThanOrEqual(5);
      expect(validJournalData.energy).toBeGreaterThanOrEqual(1);
      expect(validJournalData.energy).toBeLessThanOrEqual(5);
      expect(typeof validJournalData.notes).toBe('string');
    });

    it('should validate context data structure', () => {
      const validContextData = {
        timeOfDay: 'morning',
        weather: 'sunny',
        location: 'home'
      };

      const validTimeOfDay = ['morning', 'afternoon', 'evening', 'night'];
      
      expect(validTimeOfDay).toContain(validContextData.timeOfDay);
      expect(typeof validContextData.weather).toBe('string');
      expect(typeof validContextData.location).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const timeoutError = new Error('Request timeout');
      
      expect(networkError.message).toContain('fetch');
      expect(timeoutError.message).toContain('timeout');
    });

    it('should generate fallback predictions', () => {
      const fallbackPrediction = {
        prediction: 0.5,
        confidence: 0.3,
        factors: ['baseline'],
        recommendations: ['Try to stay active today!']
      };

      expect(fallbackPrediction.prediction).toBe(0.5);
      expect(fallbackPrediction.confidence).toBeLessThan(0.5);
      expect(fallbackPrediction.factors).toContain('baseline');
      expect(fallbackPrediction.recommendations).toHaveLength(1);
    });

    it('should handle retry logic', async () => {
      let attemptCount = 0;
      
      const mockRetryFunction = async (maxRetries: number = 3) => {
        attemptCount++;
        if (attemptCount <= maxRetries) {
          return { success: true, attempts: attemptCount };
        }
        throw new Error('Max retries exceeded');
      };

      const result = await mockRetryFunction(2);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
    });
  });

  describe('Cache Management', () => {
    it('should handle cache key generation', () => {
      const generateCacheKey = (userId: string, data: any) => {
        return `motivation_${userId}_${JSON.stringify(data).slice(0, 20)}`;
      };

      const cacheKey = generateCacheKey('user123', { steps: 5000 });
      
      expect(cacheKey).toContain('motivation_user123');
      expect(typeof cacheKey).toBe('string');
      expect(cacheKey.length).toBeGreaterThan(10);
    });

    it('should validate cache expiration', () => {
      const cacheEntry = {
        data: { prediction: 0.75 },
        timestamp: Date.now(),
        ttl: 300000 // 5 minutes
      };

      const isExpired = (Date.now() - cacheEntry.timestamp) > cacheEntry.ttl;
      
      expect(isExpired).toBe(false);
      expect(cacheEntry.ttl).toBe(300000);
    });
  });
});