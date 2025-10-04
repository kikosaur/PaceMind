import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedMotivationPrediction {
  prediction: any;
  timestamp: number;
  userId: string;
  dataHash: string; // Hash of input data to detect changes
}

export interface CachedMotivationTrend {
  trendData: any;
  timestamp: number;
  userId: string;
}

export interface CacheConfig {
  predictionTTL: number; // Time to live in milliseconds
  trendTTL: number;
  maxCacheSize: number; // Maximum number of cached items
  compressionEnabled: boolean;
}

export class MotivationCacheManager {
  private static instance: MotivationCacheManager;
  private config: CacheConfig;
  
  private readonly PREDICTION_CACHE_KEY = 'motivation_predictions_cache';
  private readonly TREND_CACHE_KEY = 'motivation_trends_cache';
  private readonly CACHE_METADATA_KEY = 'motivation_cache_metadata';

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      predictionTTL: 30 * 60 * 1000, // 30 minutes
      trendTTL: 60 * 60 * 1000, // 1 hour
      maxCacheSize: 50,
      compressionEnabled: true,
      ...config,
    };
  }

  public static getInstance(config?: Partial<CacheConfig>): MotivationCacheManager {
    if (!MotivationCacheManager.instance) {
      MotivationCacheManager.instance = new MotivationCacheManager(config);
    }
    return MotivationCacheManager.instance;
  }

  /**
   * Generate a hash for input data to detect changes
   */
  private generateDataHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Compress data if compression is enabled
   */
  private compressData(data: any): string {
    const jsonString = JSON.stringify(data);
    if (!this.config.compressionEnabled) {
      return jsonString;
    }
    
    // Simple compression: remove whitespace and use shorter keys
    return jsonString
      .replace(/\s+/g, '')
      .replace(/"timestamp":/g, '"ts":')
      .replace(/"prediction":/g, '"pred":')
      .replace(/"confidence":/g, '"conf":')
      .replace(/"factors":/g, '"fact":');
  }

  /**
   * Decompress data if compression was enabled
   */
  private decompressData(compressedData: string): any {
    if (!this.config.compressionEnabled) {
      return JSON.parse(compressedData);
    }
    
    // Reverse compression
    const decompressed = compressedData
      .replace(/"ts":/g, '"timestamp":')
      .replace(/"pred":/g, '"prediction":')
      .replace(/"conf":/g, '"confidence":')
      .replace(/"fact":/g, '"factors":');
    
    return JSON.parse(decompressed);
  }

  /**
   * Cache a motivation prediction
   */
  async cachePrediction(
    userId: string,
    inputData: any,
    prediction: any
  ): Promise<void> {
    try {
      const dataHash = this.generateDataHash(inputData);
      const cacheEntry: CachedMotivationPrediction = {
        prediction,
        timestamp: Date.now(),
        userId,
        dataHash,
      };

      const cacheKey = `${this.PREDICTION_CACHE_KEY}_${userId}_${dataHash}`;
      const compressedData = this.compressData(cacheEntry);
      
      await AsyncStorage.setItem(cacheKey, compressedData);
      await this.updateCacheMetadata('prediction', cacheKey);
      
      console.log(`Cached motivation prediction for user ${userId}`);
    } catch (error) {
      console.error('Failed to cache motivation prediction:', error);
    }
  }

  /**
   * Retrieve a cached motivation prediction
   */
  async getCachedPrediction(
    userId: string,
    inputData: any
  ): Promise<CachedMotivationPrediction | null> {
    try {
      const dataHash = this.generateDataHash(inputData);
      const cacheKey = `${this.PREDICTION_CACHE_KEY}_${userId}_${dataHash}`;
      
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (!cachedData) {
        return null;
      }

      const cacheEntry = this.decompressData(cachedData) as CachedMotivationPrediction;
      
      // Check if cache is still valid
      const isExpired = Date.now() - cacheEntry.timestamp > this.config.predictionTTL;
      if (isExpired) {
        await AsyncStorage.removeItem(cacheKey);
        await this.removeCacheMetadata('prediction', cacheKey);
        return null;
      }

      console.log(`Retrieved cached motivation prediction for user ${userId}`);
      return cacheEntry;
    } catch (error) {
      console.error('Failed to retrieve cached motivation prediction:', error);
      return null;
    }
  }

  /**
   * Cache motivation trend data
   */
  async cacheTrend(userId: string, trendData: any): Promise<void> {
    try {
      const cacheEntry: CachedMotivationTrend = {
        trendData,
        timestamp: Date.now(),
        userId,
      };

      const cacheKey = `${this.TREND_CACHE_KEY}_${userId}`;
      const compressedData = this.compressData(cacheEntry);
      
      await AsyncStorage.setItem(cacheKey, compressedData);
      await this.updateCacheMetadata('trend', cacheKey);
      
      console.log(`Cached motivation trend for user ${userId}`);
    } catch (error) {
      console.error('Failed to cache motivation trend:', error);
    }
  }

  /**
   * Retrieve cached motivation trend data
   */
  async getCachedTrend(userId: string): Promise<CachedMotivationTrend | null> {
    try {
      const cacheKey = `${this.TREND_CACHE_KEY}_${userId}`;
      
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (!cachedData) {
        return null;
      }

      const cacheEntry = this.decompressData(cachedData) as CachedMotivationTrend;
      
      // Check if cache is still valid
      const isExpired = Date.now() - cacheEntry.timestamp > this.config.trendTTL;
      if (isExpired) {
        await AsyncStorage.removeItem(cacheKey);
        await this.removeCacheMetadata('trend', cacheKey);
        return null;
      }

      console.log(`Retrieved cached motivation trend for user ${userId}`);
      return cacheEntry;
    } catch (error) {
      console.error('Failed to retrieve cached motivation trend:', error);
      return null;
    }
  }

  /**
   * Clear all cached predictions for a user
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      const keysToRemove: string[] = [];

      // Find all cache keys for this user
      for (const key of metadata.predictionKeys) {
        if (key.includes(`_${userId}_`)) {
          keysToRemove.push(key);
        }
      }

      for (const key of metadata.trendKeys) {
        if (key.includes(`_${userId}`)) {
          keysToRemove.push(key);
        }
      }

      // Remove the cache entries
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Update metadata
      metadata.predictionKeys = metadata.predictionKeys.filter(
        key => !key.includes(`_${userId}_`)
      );
      metadata.trendKeys = metadata.trendKeys.filter(
        key => !key.includes(`_${userId}`)
      );
      
      await this.saveCacheMetadata(metadata);
      
      console.log(`Cleared cache for user ${userId}, removed ${keysToRemove.length} entries`);
    } catch (error) {
      console.error('Failed to clear user cache:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      const keysToRemove: string[] = [];
      const now = Date.now();

      // Check prediction cache
      for (const key of metadata.predictionKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            const cacheEntry = this.decompressData(cachedData);
            if (now - cacheEntry.timestamp > this.config.predictionTTL) {
              keysToRemove.push(key);
            }
          } else {
            keysToRemove.push(key); // Remove metadata for non-existent keys
          }
        } catch (error) {
          keysToRemove.push(key); // Remove corrupted entries
        }
      }

      // Check trend cache
      for (const key of metadata.trendKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            const cacheEntry = this.decompressData(cachedData);
            if (now - cacheEntry.timestamp > this.config.trendTTL) {
              keysToRemove.push(key);
            }
          } else {
            keysToRemove.push(key);
          }
        } catch (error) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        
        // Update metadata
        metadata.predictionKeys = metadata.predictionKeys.filter(
          key => !keysToRemove.includes(key)
        );
        metadata.trendKeys = metadata.trendKeys.filter(
          key => !keysToRemove.includes(key)
        );
        
        await this.saveCacheMetadata(metadata);
        
        console.log(`Cleared ${keysToRemove.length} expired cache entries`);
      }
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    predictionCount: number;
    trendCount: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    try {
      const metadata = await this.getCacheMetadata();
      let totalSize = 0;
      let oldestEntry: number | null = null;
      let newestEntry: number | null = null;

      // Calculate size and timestamps
      const allKeys = [...metadata.predictionKeys, ...metadata.trendKeys];
      
      for (const key of allKeys) {
        try {
          const cachedData = await AsyncStorage.getItem(key);
          if (cachedData) {
            totalSize += cachedData.length;
            const cacheEntry = this.decompressData(cachedData);
            
            if (!oldestEntry || cacheEntry.timestamp < oldestEntry) {
              oldestEntry = cacheEntry.timestamp;
            }
            if (!newestEntry || cacheEntry.timestamp > newestEntry) {
              newestEntry = cacheEntry.timestamp;
            }
          }
        } catch (error) {
          // Skip corrupted entries
        }
      }

      return {
        predictionCount: metadata.predictionKeys.length,
        trendCount: metadata.trendKeys.length,
        totalSize,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        predictionCount: 0,
        trendCount: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMetadata(type: 'prediction' | 'trend', key: string): Promise<void> {
    const metadata = await this.getCacheMetadata();
    
    if (type === 'prediction') {
      if (!metadata.predictionKeys.includes(key)) {
        metadata.predictionKeys.push(key);
      }
    } else {
      if (!metadata.trendKeys.includes(key)) {
        metadata.trendKeys.push(key);
      }
    }

    // Enforce max cache size
    if (metadata.predictionKeys.length > this.config.maxCacheSize) {
      const oldestKey = metadata.predictionKeys.shift();
      if (oldestKey) {
        await AsyncStorage.removeItem(oldestKey);
      }
    }

    await this.saveCacheMetadata(metadata);
  }

  /**
   * Remove key from cache metadata
   */
  private async removeCacheMetadata(type: 'prediction' | 'trend', key: string): Promise<void> {
    const metadata = await this.getCacheMetadata();
    
    if (type === 'prediction') {
      metadata.predictionKeys = metadata.predictionKeys.filter(k => k !== key);
    } else {
      metadata.trendKeys = metadata.trendKeys.filter(k => k !== key);
    }

    await this.saveCacheMetadata(metadata);
  }

  /**
   * Get cache metadata
   */
  private async getCacheMetadata(): Promise<{
    predictionKeys: string[];
    trendKeys: string[];
  }> {
    try {
      const metadata = await AsyncStorage.getItem(this.CACHE_METADATA_KEY);
      if (metadata) {
        return JSON.parse(metadata);
      }
    } catch (error) {
      console.error('Failed to get cache metadata:', error);
    }
    
    return {
      predictionKeys: [],
      trendKeys: [],
    };
  }

  /**
   * Save cache metadata
   */
  private async saveCacheMetadata(metadata: {
    predictionKeys: string[];
    trendKeys: string[];
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save cache metadata:', error);
    }
  }

  /**
   * Clear all cache data
   */
  async clearAllCache(): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();
      const allKeys = [
        ...metadata.predictionKeys,
        ...metadata.trendKeys,
        this.CACHE_METADATA_KEY,
      ];

      await AsyncStorage.multiRemove(allKeys);
      console.log('Cleared all motivation cache data');
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }
}