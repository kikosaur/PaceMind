// Data cleanup utilities for managing accumulated tracking data
export class DataCleanupManager {
  private static instance: DataCleanupManager;
  private cleanupInterval: any = null;
  private isRunning = false;
  private cleanupCallbacks: Map<string, () => void> = new Map();

  static getInstance(): DataCleanupManager {
    if (!DataCleanupManager.instance) {
      DataCleanupManager.instance = new DataCleanupManager();
    }
    return DataCleanupManager.instance;
  }

  // Start periodic cleanup with specified interval
  startPeriodicCleanup(intervalMs: number = 300000): void { // Default: 5 minutes
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.cleanupInterval = setInterval(() => {
      this.executeCleanup();
    }, intervalMs);
    
    console.log(`Data cleanup started with ${intervalMs}ms interval`);
  }

  // Stop periodic cleanup
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Data cleanup stopped');
  }

  // Register a cleanup callback
  registerCleanupCallback(name: string, callback: () => void): void {
    this.cleanupCallbacks.set(name, callback);
  }

  // Unregister a cleanup callback
  unregisterCleanupCallback(name: string): void {
    this.cleanupCallbacks.delete(name);
  }

  // Execute all registered cleanup callbacks
  private executeCleanup(): void {
    console.log(`Executing data cleanup for ${this.cleanupCallbacks.size} registered callbacks`);
    
    this.cleanupCallbacks.forEach((callback, name) => {
      try {
        callback();
        console.log(`Cleanup completed for: ${name}`);
      } catch (error) {
        console.error(`Cleanup failed for ${name}:`, error);
      }
    });
  }

  // Manual cleanup trigger
  triggerCleanup(): void {
    this.executeCleanup();
  }

  // Get cleanup status
  getStatus(): { isRunning: boolean; registeredCallbacks: string[] } {
    return {
      isRunning: this.isRunning,
      registeredCallbacks: Array.from(this.cleanupCallbacks.keys())
    };
  }
}

// Utility functions for common cleanup operations

// Clean up array by keeping only recent items
export function cleanupArray<T>(
  array: T[], 
  maxItems: number, 
  keepRecentRatio: number = 0.7
): T[] {
  if (array.length <= maxItems) return array;
  
  const keepRecent = Math.floor(maxItems * keepRecentRatio);
  const keepOld = maxItems - keepRecent;
  
  // Keep some old items (evenly spaced) and all recent items
  const oldItems = array.slice(0, array.length - keepRecent);
  const recentItems = array.slice(-keepRecent);
  
  const step = Math.max(1, Math.floor(oldItems.length / keepOld));
  const sampledOldItems = oldItems.filter((_, index) => index % step === 0).slice(0, keepOld);
  
  return [...sampledOldItems, ...recentItems];
}

// Clean up object properties that are arrays
export function cleanupObjectArrays<T extends Record<string, any>>(
  obj: T,
  arrayConfigs: Record<keyof T, { maxItems: number; keepRecentRatio?: number }>
): T {
  const cleaned = { ...obj } as any;
  
  Object.entries(arrayConfigs).forEach(([key, config]) => {
    if (Array.isArray(cleaned[key])) {
      cleaned[key] = cleanupArray(
        cleaned[key], 
        config.maxItems, 
        config.keepRecentRatio
      );
    }
  });
  
  return cleaned;
}

// Clean up time-based data (remove items older than specified time)
export function cleanupByAge<T extends { timestamp: number }>(
  array: T[], 
  maxAgeMs: number
): T[] {
  const cutoffTime = Date.now() - maxAgeMs;
  return array.filter(item => item.timestamp > cutoffTime);
}

// Memory-efficient buffer management
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  getSize(): number {
    return this.size;
  }

  getCapacity(): number {
    return this.capacity;
  }

  isFull(): boolean {
    return this.size === this.capacity;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }
}

// Cleanup configuration for different data types
export const CLEANUP_CONFIGS = {
  ROUTE_POINTS: {
    maxItems: 1000,
    maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    keepRecentRatio: 0.8
  },
  SENSOR_DATA: {
    maxItems: 500,
    maxAgeMs: 60 * 60 * 1000, // 1 hour
    keepRecentRatio: 0.9
  },
  PERFORMANCE_METRICS: {
    maxItems: 100,
    maxAgeMs: 2 * 60 * 60 * 1000, // 2 hours
    keepRecentRatio: 0.7
  },
  SPLITS: {
    maxItems: 100,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    keepRecentRatio: 1.0 // Keep all recent splits
  }
};

// Helper to create cleanup callbacks for common scenarios
export function createArrayCleanupCallback<T>(
  getArray: () => T[],
  setArray: (array: T[]) => void,
  config: { maxItems: number; keepRecentRatio?: number }
): () => void {
  return () => {
    const currentArray = getArray();
    if (currentArray.length > config.maxItems) {
      const cleanedArray = cleanupArray(currentArray, config.maxItems, config.keepRecentRatio);
      setArray(cleanedArray);
    }
  };
}

export function createTimeBasedCleanupCallback<T extends { timestamp: number }>(
  getArray: () => T[],
  setArray: (array: T[]) => void,
  maxAgeMs: number
): () => void {
  return () => {
    const currentArray = getArray();
    const cleanedArray = cleanupByAge(currentArray, maxAgeMs);
    if (cleanedArray.length !== currentArray.length) {
      setArray(cleanedArray);
    }
  };
}