import { StatisticalAnalyzer } from './data-validation';

// Anomaly detection types and interfaces
export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  type: AnomalyType;
  description: string;
  suggestedCorrection?: any;
  metadata: Record<string, any>;
}

export type AnomalyType = 
  | 'outlier' 
  | 'drift' 
  | 'spike' 
  | 'missing_data' 
  | 'inconsistent_pattern' 
  | 'sensor_malfunction'
  | 'temporal_anomaly'
  | 'spatial_anomaly';

export interface AnomalyDetectionConfig {
  zScoreThreshold: number;
  iqrMultiplier: number;
  driftThreshold: number;
  spikeThreshold: number;
  missingDataThreshold: number;
  temporalWindowSize: number;
  spatialWindowSize: number;
  enableAutoCorrection: boolean;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface SpatialPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  value?: number;
  metadata?: Record<string, any>;
}

// Default configuration for anomaly detection
const DEFAULT_CONFIG: AnomalyDetectionConfig = {
  zScoreThreshold: 2.5,
  iqrMultiplier: 1.5,
  driftThreshold: 0.3,
  spikeThreshold: 3.0,
  missingDataThreshold: 0.1, // 10% missing data threshold
  temporalWindowSize: 50,
  spatialWindowSize: 20,
  enableAutoCorrection: true
};

// Statistical anomaly detection methods
export class StatisticalAnomalyDetector {
  private config: AnomalyDetectionConfig;
  private dataHistory: TimeSeriesPoint[] = [];
  private spatialHistory: SpatialPoint[] = [];
  private statisticalAnalyzer = new StatisticalAnalyzer();

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Main anomaly detection method
  detectAnomalies(
    data: TimeSeriesPoint | SpatialPoint,
    dataType: 'temporal' | 'spatial' = 'temporal'
  ): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    if (dataType === 'temporal') {
      const temporalData = data as TimeSeriesPoint;
      this.dataHistory.push(temporalData);
      this.maintainHistorySize();

      // Z-Score based outlier detection
      const outlierResult = this.detectOutlier(temporalData);
      if (outlierResult) anomalies.push(outlierResult);

      // IQR based outlier detection
      const iqrResult = this.detectIQROutlier(temporalData);
      if (iqrResult) anomalies.push(iqrResult);

      // Drift detection
      const driftResult = this.detectDrift(temporalData);
      if (driftResult) anomalies.push(driftResult);

      // Spike detection
      const spikeResult = this.detectSpike(temporalData);
      if (spikeResult) anomalies.push(spikeResult);

      // Pattern inconsistency detection
      const patternResult = this.detectPatternInconsistency(temporalData);
      if (patternResult) anomalies.push(patternResult);

    } else {
      const spatialData = data as SpatialPoint;
      this.spatialHistory.push(spatialData);
      this.maintainSpatialHistorySize();

      // Spatial anomaly detection
      const spatialResult = this.detectSpatialAnomaly(spatialData);
      if (spatialResult) anomalies.push(spatialResult);
    }

    // Missing data detection
    const missingDataResult = this.detectMissingData();
    if (missingDataResult) anomalies.push(missingDataResult);

    return anomalies;
  }

  // Z-Score based outlier detection
  private detectOutlier(data: TimeSeriesPoint): AnomalyResult | null {
    if (this.dataHistory.length < 10) return null;

    const values = this.dataHistory.map(d => d.value);
    this.statisticalAnalyzer.addDataPoint(data.value);

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    if (stdDev === 0) return null;

    const zScore = Math.abs((data.value - mean) / stdDev);

    if (zScore > this.config.zScoreThreshold) {
      const severity = this.calculateSeverity(zScore, this.config.zScoreThreshold);
      const suggestedCorrection = this.config.enableAutoCorrection ? mean : undefined;

      return {
        isAnomaly: true,
        severity,
        confidence: Math.min(1, zScore / this.config.zScoreThreshold),
        type: 'outlier',
        description: `Z-Score outlier detected: ${zScore.toFixed(2)} (threshold: ${this.config.zScoreThreshold})`,
        suggestedCorrection,
        metadata: {
          zScore,
          mean,
          stdDev,
          threshold: this.config.zScoreThreshold
        }
      };
    }

    return null;
  }

  // Interquartile Range (IQR) based outlier detection
  private detectIQROutlier(data: TimeSeriesPoint): AnomalyResult | null {
    if (this.dataHistory.length < 20) return null;

    const values = this.dataHistory.map(d => d.value).sort((a, b) => a - b);
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - this.config.iqrMultiplier * iqr;
    const upperBound = q3 + this.config.iqrMultiplier * iqr;

    if (data.value < lowerBound || data.value > upperBound) {
      const distance = Math.min(
        Math.abs(data.value - lowerBound),
        Math.abs(data.value - upperBound)
      );
      const severity = this.calculateSeverity(distance / iqr, 1);
      const suggestedCorrection = this.config.enableAutoCorrection ? 
        (data.value < lowerBound ? q1 : q3) : undefined;

      return {
        isAnomaly: true,
        severity,
        confidence: Math.min(1, distance / (iqr * this.config.iqrMultiplier)),
        type: 'outlier',
        description: `IQR outlier detected: value ${data.value.toFixed(2)} outside bounds [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
        suggestedCorrection,
        metadata: {
          q1,
          q3,
          iqr,
          lowerBound,
          upperBound,
          distance
        }
      };
    }

    return null;
  }

  // Drift detection using moving averages
  private detectDrift(data: TimeSeriesPoint): AnomalyResult | null {
    if (this.dataHistory.length < 30) return null;

    const windowSize = Math.min(10, Math.floor(this.dataHistory.length / 3));
    const recentValues = this.dataHistory.slice(-windowSize).map(d => d.value);
    const olderValues = this.dataHistory.slice(-windowSize * 2, -windowSize).map(d => d.value);

    if (olderValues.length === 0) return null;

    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const olderMean = olderValues.reduce((sum, val) => sum + val, 0) / olderValues.length;

    const driftRatio = Math.abs((recentMean - olderMean) / olderMean);

    if (driftRatio > this.config.driftThreshold) {
      const severity = this.calculateSeverity(driftRatio, this.config.driftThreshold);
      
      return {
        isAnomaly: true,
        severity,
        confidence: Math.min(1, driftRatio / this.config.driftThreshold),
        type: 'drift',
        description: `Data drift detected: ${(driftRatio * 100).toFixed(1)}% change in recent values`,
        metadata: {
          recentMean,
          olderMean,
          driftRatio,
          threshold: this.config.driftThreshold
        }
      };
    }

    return null;
  }

  // Spike detection using rate of change
  private detectSpike(data: TimeSeriesPoint): AnomalyResult | null {
    if (this.dataHistory.length < 2) return null;

    const previousData = this.dataHistory[this.dataHistory.length - 2];
    const timeDiff = data.timestamp - previousData.timestamp;
    
    if (timeDiff === 0) return null;

    const rateOfChange = Math.abs(data.value - previousData.value) / (timeDiff / 1000);
    
    // Calculate expected rate of change based on recent history
    const recentRates: number[] = [];
    for (let i = this.dataHistory.length - 1; i > 0 && recentRates.length < 10; i--) {
      const curr = this.dataHistory[i];
      const prev = this.dataHistory[i - 1];
      const dt = curr.timestamp - prev.timestamp;
      if (dt > 0) {
        recentRates.push(Math.abs(curr.value - prev.value) / (dt / 1000));
      }
    }

    if (recentRates.length < 3) return null;

    const avgRate = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
    const spikeRatio = avgRate > 0 ? rateOfChange / avgRate : 0;

    if (spikeRatio > this.config.spikeThreshold) {
      const severity = this.calculateSeverity(spikeRatio, this.config.spikeThreshold);
      const suggestedCorrection = this.config.enableAutoCorrection ? 
        previousData.value + (avgRate * timeDiff / 1000) : undefined;

      return {
        isAnomaly: true,
        severity,
        confidence: Math.min(1, spikeRatio / this.config.spikeThreshold),
        type: 'spike',
        description: `Spike detected: rate of change ${spikeRatio.toFixed(1)}x higher than average`,
        suggestedCorrection,
        metadata: {
          rateOfChange,
          avgRate,
          spikeRatio,
          threshold: this.config.spikeThreshold
        }
      };
    }

    return null;
  }

  // Pattern inconsistency detection using autocorrelation
  private detectPatternInconsistency(data: TimeSeriesPoint): AnomalyResult | null {
    if (this.dataHistory.length < 20) return null;

    const values = this.dataHistory.map(d => d.value);
    const autocorr = this.calculateAutocorrelation(values, 1);
    
    // Check if the current value breaks the established pattern
    if (Math.abs(autocorr) > 0.5) { // Strong correlation exists
      const expectedValue = this.predictNextValue(values);
      const deviation = Math.abs(data.value - expectedValue) / Math.abs(expectedValue);
      
      if (deviation > 0.3) { // 30% deviation from expected pattern
        const severity = this.calculateSeverity(deviation, 0.3);
        
        return {
          isAnomaly: true,
          severity,
          confidence: Math.min(1, deviation / 0.3),
          type: 'inconsistent_pattern',
          description: `Pattern inconsistency: ${(deviation * 100).toFixed(1)}% deviation from expected pattern`,
          suggestedCorrection: this.config.enableAutoCorrection ? expectedValue : undefined,
          metadata: {
            expectedValue,
            actualValue: data.value,
            deviation,
            autocorrelation: autocorr
          }
        };
      }
    }

    return null;
  }

  // Spatial anomaly detection
  private detectSpatialAnomaly(data: SpatialPoint): AnomalyResult | null {
    if (this.spatialHistory.length < 5) return null;

    const recentPoints = this.spatialHistory.slice(-this.config.spatialWindowSize);
    
    // Calculate distances from recent points
    const distances = recentPoints.map(point => 
      this.calculateDistance(data, point)
    );

    const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    const maxDistance = Math.max(...distances);

    // Check for sudden location jumps
    if (maxDistance > 1000) { // 1km jump threshold
      const severity = this.calculateSeverity(maxDistance / 1000, 1);
      
      return {
        isAnomaly: true,
        severity,
        confidence: Math.min(1, maxDistance / 5000), // Max confidence at 5km
        type: 'spatial_anomaly',
        description: `Spatial jump detected: ${(maxDistance / 1000).toFixed(1)}km from recent positions`,
        metadata: {
          maxDistance,
          avgDistance,
          coordinates: { lat: data.latitude, lon: data.longitude }
        }
      };
    }

    return null;
  }

  // Missing data detection
  private detectMissingData(): AnomalyResult | null {
    if (this.dataHistory.length < 10) return null;

    const now = Date.now();
    const recentWindow = 60000; // 1 minute window
    const recentData = this.dataHistory.filter(
      d => now - d.timestamp <= recentWindow
    );

    const expectedDataPoints = recentWindow / 1000; // Assuming 1 data point per second
    const actualDataPoints = recentData.length;
    const missingRatio = 1 - (actualDataPoints / expectedDataPoints);

    if (missingRatio > this.config.missingDataThreshold) {
      const severity = this.calculateSeverity(missingRatio, this.config.missingDataThreshold);
      
      return {
        isAnomaly: true,
        severity,
        confidence: Math.min(1, missingRatio / this.config.missingDataThreshold),
        type: 'missing_data',
        description: `Missing data detected: ${(missingRatio * 100).toFixed(1)}% of expected data points`,
        metadata: {
          expectedDataPoints,
          actualDataPoints,
          missingRatio,
          windowSize: recentWindow
        }
      };
    }

    return null;
  }

  // Helper methods
  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    if (ratio < 1.5) return 'low';
    if (ratio < 2.5) return 'medium';
    if (ratio < 4.0) return 'high';
    return 'critical';
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const n = values.length - lag;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private predictNextValue(values: number[]): number {
    if (values.length < 3) return values[values.length - 1];

    // Simple linear regression prediction
    const n = Math.min(values.length, 10); // Use last 10 points
    const recentValues = values.slice(-n);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentValues[i];
      sumXY += i * recentValues[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * n + intercept;
  }

  private calculateDistance(point1: SpatialPoint, point2: SpatialPoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = point1.latitude * Math.PI / 180;
    const lat2Rad = point2.latitude * Math.PI / 180;
    const deltaLatRad = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLonRad = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private maintainHistorySize(): void {
    if (this.dataHistory.length > this.config.temporalWindowSize) {
      this.dataHistory = this.dataHistory.slice(-this.config.temporalWindowSize);
    }
  }

  private maintainSpatialHistorySize(): void {
    if (this.spatialHistory.length > this.config.spatialWindowSize) {
      this.spatialHistory = this.spatialHistory.slice(-this.config.spatialWindowSize);
    }
  }

  // Public methods for configuration and management
  updateConfig(newConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AnomalyDetectionConfig {
    return { ...this.config };
  }

  reset(): void {
    this.dataHistory = [];
    this.spatialHistory = [];
    this.statisticalAnalyzer.reset();
  }

  getStatistics(): {
    dataPoints: number;
    spatialPoints: number;
    avgValue: number;
    stdDev: number;
  } {
    const values = this.dataHistory.map(d => d.value);
    const avgValue = values.length > 0 ? 
      values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    
    const stdDev = values.length > 1 ? 
      Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length) : 0;

    return {
      dataPoints: this.dataHistory.length,
      spatialPoints: this.spatialHistory.length,
      avgValue,
      stdDev
    };
  }
}