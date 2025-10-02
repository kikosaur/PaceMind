// Performance monitoring utilities for tracking app performance
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private memorySnapshots: { timestamp: number; used: number; total: number }[] = [];
  private isMonitoring = false;
  private monitoringInterval: any = null;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureMemorySnapshot();
      this.cleanupOldData();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  // Track execution time of operations
  trackExecutionTime(operationName: string, executionTimeMs: number): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    
    const times = this.metrics.get(operationName)!;
    times.push(executionTimeMs);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  // Measure and track a function's execution time
  measureAsync<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return fn().finally(() => {
      const endTime = performance.now();
      this.trackExecutionTime(operationName, endTime - startTime);
    });
  }

  measureSync<T>(operationName: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      return fn();
    } finally {
      const endTime = performance.now();
      this.trackExecutionTime(operationName, endTime - startTime);
    }
  }

  private captureMemorySnapshot(): void {
    // Note: React Native doesn't have performance.memory, so we'll simulate
    // In a real implementation, you'd use platform-specific memory APIs
    const timestamp = Date.now();
    
    // Simulate memory usage (in a real app, use actual memory APIs)
    const simulatedUsed = Math.random() * 100 + 50; // 50-150 MB
    const simulatedTotal = 512; // 512 MB total
    
    this.memorySnapshots.push({
      timestamp,
      used: simulatedUsed,
      total: simulatedTotal
    });

    // Keep only last 100 snapshots (about 50 minutes at 30s intervals)
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }
  }

  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean up old memory snapshots
    this.memorySnapshots = this.memorySnapshots.filter(
      snapshot => snapshot.timestamp > oneHourAgo
    );
    
    // Clean up old metrics (keep only recent data)
    this.metrics.forEach((times, operationName) => {
      if (times.length > 50) {
        this.metrics.set(operationName, times.slice(-50));
      }
    });
  }

  // Get performance statistics
  getStats(): {
    operations: Record<string, { avg: number; min: number; max: number; count: number }>;
    memory: { current?: number; average: number; peak: number };
  } {
    const operations: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((times, operationName) => {
      if (times.length > 0) {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        operations[operationName] = {
          avg: Math.round(avg * 100) / 100,
          min: Math.round(min * 100) / 100,
          max: Math.round(max * 100) / 100,
          count: times.length
        };
      }
    });

    let memoryStats = { average: 0, peak: 0 };
    if (this.memorySnapshots.length > 0) {
      const memoryValues = this.memorySnapshots.map(s => s.used);
      memoryStats = {
        average: Math.round((memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length) * 100) / 100,
        peak: Math.round(Math.max(...memoryValues) * 100) / 100
      };
    }

    return {
      operations,
      memory: {
        current: this.memorySnapshots.length > 0 ? 
          Math.round(this.memorySnapshots[this.memorySnapshots.length - 1].used * 100) / 100 : 
          undefined,
        ...memoryStats
      }
    };
  }

  // Log performance warnings
  checkPerformanceThresholds(): string[] {
    const warnings: string[] = [];
    const stats = this.getStats();

    // Check for slow operations (>100ms average)
    Object.entries(stats.operations).forEach(([operation, metrics]) => {
      if (metrics.avg > 100) {
        warnings.push(`Slow operation detected: ${operation} averaging ${metrics.avg}ms`);
      }
    });

    // Check for high memory usage (>80% of total)
    if (stats.memory.current && stats.memory.current > 400) { // >400MB
      warnings.push(`High memory usage detected: ${stats.memory.current}MB`);
    }

    return warnings;
  }

  // Reset all metrics
  reset(): void {
    this.metrics.clear();
    this.memorySnapshots = [];
  }
}

// Utility function to create a performance-monitored version of a function
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  operationName: string,
  fn: T
): T {
  const monitor = PerformanceMonitor.getInstance();
  
  return ((...args: Parameters<T>) => {
    return monitor.measureSync(operationName, () => fn(...args));
  }) as T;
}

// Utility function for async functions
export function withAsyncPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  operationName: string,
  fn: T
): T {
  const monitor = PerformanceMonitor.getInstance();
  
  return ((...args: Parameters<T>) => {
    return monitor.measureAsync(operationName, () => fn(...args));
  }) as T;
}