import { DataValidationSystem, ValidationResult } from './data-validation';
import { SensorCalibrationSystem, CalibrationStatus } from './sensor-calibration';
import { StatisticalAnomalyDetector, AnomalyResult } from './anomaly-detection';
import { PerformanceKPISystem, WalkingKPIs } from './performance-kpis';
import { DataQualityMonitor, QualityReport } from './data-quality-monitor';
import { RoutePoint, WalkingSession, BasicStats } from '../contexts/WalkingContext';

// Enhanced metrics interfaces
export interface EnhancedMetrics {
  // Core metrics (existing)
  steps: number;
  distance: number;
  duration: number;
  calories: number;
  averagePace: number;
  speed: number;
  
  // Enhanced accuracy metrics
  gpsAccuracy: number;
  stepAccuracy: number;
  distanceAccuracy: number;
  speedAccuracy: number;
  
  // Data quality metrics
  dataQuality: number; // 0-1 overall quality score
  validationResults: ValidationResult[];
  anomalies: AnomalyResult[];
  calibrationStatus: CalibrationStatus;
  
  // KPI metrics
  kpis: WalkingKPIs;
  
  // Confidence intervals
  confidenceIntervals: {
    distance: { lower: number; upper: number; confidence: number };
    speed: { lower: number; upper: number; confidence: number };
    pace: { lower: number; upper: number; confidence: number };
    calories: { lower: number; upper: number; confidence: number };
  };
  
  // Quality indicators
  qualityIndicators: {
    excellent: string[];
    good: string[];
    warnings: string[];
    critical: string[];
  };
}

export interface EnhancedWalkingSession extends WalkingSession {
  enhancedMetrics: EnhancedMetrics;
  qualityReport?: QualityReport;
  lastValidation: number;
  lastCalibration: number;
}

// Configuration for enhanced metrics
export interface EnhancedMetricsConfig {
  enableRealTimeValidation: boolean;
  enableAnomalyDetection: boolean;
  enableAutoCalibration: boolean;
  enableQualityMonitoring: boolean;
  validationInterval: number; // milliseconds
  calibrationInterval: number; // milliseconds
  qualityReportInterval: number; // milliseconds
  confidenceLevel: number; // 0-1
}

const DEFAULT_CONFIG: EnhancedMetricsConfig = {
  enableRealTimeValidation: true,
  enableAnomalyDetection: true,
  enableAutoCalibration: true,
  enableQualityMonitoring: true,
  validationInterval: 5000, // 5 seconds
  calibrationInterval: 300000, // 5 minutes
  qualityReportInterval: 60000, // 1 minute
  confidenceLevel: 0.95
};

// Enhanced Walking Context Manager
export class EnhancedWalkingContextManager {
  private config: EnhancedMetricsConfig;
  private validationSystem: DataValidationSystem;
  private calibrationSystem: SensorCalibrationSystem;
  private anomalyDetector: StatisticalAnomalyDetector;
  private kpiSystem: PerformanceKPISystem;
  private qualityMonitor: DataQualityMonitor;
  
  private isInitialized = false;
  private validationInterval: any = null;
  private calibrationInterval: any = null;
  private qualityInterval: any = null;
  
  // Metrics history for trend analysis
  private metricsHistory: EnhancedMetrics[] = [];
  private routeHistory: RoutePoint[] = [];
  
  constructor(config: Partial<EnhancedMetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize all systems
    this.validationSystem = new DataValidationSystem();
    this.calibrationSystem = new SensorCalibrationSystem();
    this.anomalyDetector = new StatisticalAnomalyDetector();
    this.kpiSystem = new PerformanceKPISystem();
    this.qualityMonitor = new DataQualityMonitor({
      enableRealTimeAlerts: true,
      enableAutomaticReporting: this.config.enableQualityMonitoring
    });
  }

  // Initialize the enhanced metrics system
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Start quality monitoring
      if (this.config.enableQualityMonitoring) {
        await this.qualityMonitor.startMonitoring();
      }
      
      // Start periodic processes
      this.startPeriodicProcesses();
      
      this.isInitialized = true;
      console.log('Enhanced Walking Context Manager initialized');
      
    } catch (error) {
      console.error('Failed to initialize Enhanced Walking Context Manager:', error);
      throw error;
    }
  }

  // Shutdown the enhanced metrics system
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;
    
    // Stop periodic processes
    this.stopPeriodicProcesses();
    
    // Stop quality monitoring
    this.qualityMonitor.stopMonitoring();
    
    this.isInitialized = false;
    console.log('Enhanced Walking Context Manager shutdown');
  }

  // Process and enhance walking session data
  async enhanceWalkingSession(
    session: WalkingSession,
    routePoints: RoutePoint[],
    rawSensorData?: any
  ): Promise<EnhancedWalkingSession> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      // Validate input data
      const validationResults = await this.validateSessionData(session, routePoints, rawSensorData);
      
      // Detect anomalies
      const anomalies = this.config.enableAnomalyDetection 
        ? await this.detectAnomalies(session, routePoints)
        : [];
      
      // Get calibration status
      const calibrationStatus = this.calibrationSystem.getCalibrationStatus();
      
      // Calculate KPIs
      const kpis = this.kpiSystem.calculateKPIs({
        sessions: [{
          distance: session.distance,
          duration: session.duration,
          steps: session.steps,
          calories: session.calories,
          avgSpeed: session.metrics.speed || 0,
          avgPace: session.metrics.averagePace || 0,
          timestamp: session.startTime || Date.now(),
          gpsAccuracy: routePoints.length > 0 ? routePoints[0].accuracy : undefined
        }],
        timeframe: 'daily'
      });
      
      // Calculate enhanced accuracy metrics
      const accuracyMetrics = this.calculateAccuracyMetrics(validationResults, calibrationStatus);
      
      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(session, validationResults);
      
      // Generate quality indicators
      const qualityIndicators = this.generateQualityIndicators(
        validationResults,
        anomalies,
        calibrationStatus,
        accuracyMetrics
      );
      
      // Calculate overall data quality
      const dataQuality = this.calculateOverallDataQuality(
        validationResults,
        anomalies,
        calibrationStatus
      );
      
      // Create enhanced metrics
      const enhancedMetrics: EnhancedMetrics = {
        // Core metrics
        steps: session.steps,
        distance: session.distance,
        duration: session.duration,
        calories: session.calories,
        averagePace: session.metrics.averagePace,
        speed: session.metrics.speed,
        
        // Enhanced accuracy metrics
        gpsAccuracy: accuracyMetrics.gpsAccuracy,
        stepAccuracy: accuracyMetrics.stepAccuracy,
        distanceAccuracy: accuracyMetrics.distanceAccuracy,
        speedAccuracy: accuracyMetrics.speedAccuracy,
        
        // Data quality metrics
        dataQuality,
        validationResults,
        anomalies,
        calibrationStatus,
        
        // KPI metrics
        kpis,
        
        // Confidence intervals
        confidenceIntervals,
        
        // Quality indicators
        qualityIndicators
      };
      
      // Store metrics history
      this.metricsHistory.push(enhancedMetrics);
      this.maintainHistorySize();
      
      // Record performance
      const processingTime = Date.now() - startTime;
      this.qualityMonitor.recordResponseTime(processingTime);
      this.qualityMonitor.recordSuccess();
      
      // Create enhanced session
      const enhancedSession: EnhancedWalkingSession = {
        ...session,
        enhancedMetrics,
        lastValidation: Date.now(),
        lastCalibration: calibrationStatus.lastCalibration.getTime()
      };
      
      return enhancedSession;
      
    } catch (error) {
      console.error('Error enhancing walking session:', error);
      this.qualityMonitor.recordError();
      
      // Return session with minimal enhancement on error
      return {
        ...session,
        enhancedMetrics: this.createFallbackMetrics(session),
        lastValidation: Date.now(),
        lastCalibration: 0
      };
    }
  }

  // Validate session data
  private async validateSessionData(
    session: WalkingSession,
    routePoints: RoutePoint[],
    rawSensorData?: any
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    if (!this.config.enableRealTimeValidation) {
      return results;
    }
    
    try {
      // Validate GPS data
      if (routePoints.length > 0) {
        const lastPoint = routePoints[routePoints.length - 1];
        const gpsResult = this.validationSystem.validateActivityData({
          location: {
            coords: {
              latitude: lastPoint.lat,
              longitude: lastPoint.lon,
              accuracy: lastPoint.accuracy || 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });
        results.push(gpsResult);
      }
      
      // Validate step data
      if (session.steps > 0) {
        const stepResult = this.validationSystem.validateActivityData({
          stepCount: session.steps,
          timestamp: Date.now()
        });
        results.push(stepResult);
      }
      
      // Validate distance and speed
      if (session.distance > 0 && session.duration > 0) {
        const movementResult = this.validationSystem.validateActivityData({
          distance: session.distance * 1000, // Convert to meters
          duration: session.duration,
          timestamp: Date.now()
        });
        results.push(movementResult);
      }
      
      // Validate calories
      if (session.calories > 0) {
        const calorieResult = this.validationSystem.validateActivityData({
          calories: session.calories,
          distance: session.distance,
          duration: session.duration,
          timestamp: Date.now()
        });
        results.push(calorieResult);
      }
      
    } catch (error) {
      console.error('Error validating session data:', error);
    }
    
    return results;
  }

  // Detect anomalies in session data
  private async detectAnomalies(
    session: WalkingSession,
    routePoints: RoutePoint[]
  ): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];
    
    try {
      // Detect speed anomalies
      if (this.metricsHistory.length > 5) {
        const recentSpeeds = this.metricsHistory.slice(-10).map(m => m.speed);
        const speedAnomaly = this.anomalyDetector.detectAnomalies({
          timestamp: Date.now(),
          value: session.metrics.speed
        }, 'temporal');
        if (speedAnomaly.length > 0 && speedAnomaly[0].isAnomaly) {
          anomalies.push(...speedAnomaly);
        }
      }
      
      // Detect distance anomalies
      if (routePoints.length > 1) {
        const distances = [];
        for (let i = 1; i < routePoints.length; i++) {
          const dist = this.calculateDistance(routePoints[i-1], routePoints[i]);
          distances.push(dist);
        }
        
        if (distances.length > 0) {
          const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
          const distanceAnomaly = this.anomalyDetector.detectAnomalies({
            timestamp: Date.now(),
            value: avgDistance
          }, 'temporal');
          if (distanceAnomaly.length > 0 && distanceAnomaly[0].isAnomaly) {
            anomalies.push(...distanceAnomaly);
          }
        }
      }
      
      // Detect temporal anomalies
      if (routePoints.length > 2) {
        const timeDeltas = [];
        for (let i = 1; i < routePoints.length; i++) {
          timeDeltas.push(routePoints[i].timestamp - routePoints[i-1].timestamp);
        }
        
        const avgTimeDelta = timeDeltas.reduce((sum, t) => sum + t, 0) / timeDeltas.length;
        const temporalAnomaly = this.anomalyDetector.detectAnomalies({
          timestamp: Date.now(),
          value: avgTimeDelta
        }, 'temporal');
        if (temporalAnomaly.length > 0 && temporalAnomaly[0].isAnomaly) {
          anomalies.push(...temporalAnomaly);
        }
      }
      
    } catch (error) {
      console.error('Error detecting anomalies:', error);
    }
    
    return anomalies;
  }

  // Calculate accuracy metrics
  private calculateAccuracyMetrics(
    validationResults: ValidationResult[],
    calibrationStatus: CalibrationStatus
  ): {
    gpsAccuracy: number;
    stepAccuracy: number;
    distanceAccuracy: number;
    speedAccuracy: number;
  } {
    const gpsResult = validationResults.find(r => r.errors.some(e => e.includes('GPS')));
    const stepResult = validationResults.find(r => r.errors.some(e => e.includes('step')));
    const movementResult = validationResults.find(r => r.errors.some(e => e.includes('movement')));
    
    return {
      gpsAccuracy: gpsResult ? gpsResult.confidence : calibrationStatus.quality,
      stepAccuracy: stepResult ? stepResult.confidence : 0.8,
      distanceAccuracy: movementResult ? movementResult.confidence : 0.85,
      speedAccuracy: movementResult ? movementResult.confidence * 0.9 : 0.8
    };
  }

  // Calculate confidence intervals
  private calculateConfidenceIntervals(
    session: WalkingSession,
    validationResults: ValidationResult[]
  ): EnhancedMetrics['confidenceIntervals'] {
    const confidence = this.config.confidenceLevel;
    const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.58 : 1.64;
    
    // Calculate standard errors based on validation results
    const distanceError = session.distance * 0.05; // 5% error estimate
    const speedError = session.metrics.speed * 0.08; // 8% error estimate
    const paceError = session.metrics.averagePace * 0.1; // 10% error estimate
    const calorieError = session.calories * 0.15; // 15% error estimate
    
    return {
      distance: {
        lower: Math.max(0, session.distance - zScore * distanceError),
        upper: session.distance + zScore * distanceError,
        confidence
      },
      speed: {
        lower: Math.max(0, session.metrics.speed - zScore * speedError),
        upper: session.metrics.speed + zScore * speedError,
        confidence
      },
      pace: {
        lower: Math.max(0, session.metrics.averagePace - zScore * paceError),
        upper: session.metrics.averagePace + zScore * paceError,
        confidence
      },
      calories: {
        lower: Math.max(0, session.calories - zScore * calorieError),
        upper: session.calories + zScore * calorieError,
        confidence
      }
    };
  }

  // Generate quality indicators
  private generateQualityIndicators(
    validationResults: ValidationResult[],
    anomalies: AnomalyResult[],
    calibrationStatus: CalibrationStatus,
    accuracyMetrics: any
  ): EnhancedMetrics['qualityIndicators'] {
    const excellent: string[] = [];
    const good: string[] = [];
    const warnings: string[] = [];
    const critical: string[] = [];
    
    // GPS quality
    if (accuracyMetrics.gpsAccuracy >= 0.9) {
      excellent.push('Excellent GPS accuracy');
    } else if (accuracyMetrics.gpsAccuracy >= 0.7) {
      good.push('Good GPS accuracy');
    } else if (accuracyMetrics.gpsAccuracy >= 0.5) {
      warnings.push('GPS accuracy could be improved');
    } else {
      critical.push('Poor GPS accuracy detected');
    }
    
    // Calibration status
    if (calibrationStatus.quality >= 0.9) {
      excellent.push('Sensors well calibrated');
    } else if (calibrationStatus.quality >= 0.7) {
      good.push('Sensors adequately calibrated');
    } else {
      warnings.push('Sensor calibration recommended');
    }
    
    // Anomaly detection
    const criticalAnomalies = anomalies.filter(a => a.severity === 'high').length;
    const moderateAnomalies = anomalies.filter(a => a.severity === 'medium').length;
    
    if (criticalAnomalies === 0 && moderateAnomalies === 0) {
      excellent.push('No data anomalies detected');
    } else if (criticalAnomalies === 0) {
      good.push(`${moderateAnomalies} minor anomalies detected`);
    } else {
      warnings.push(`${criticalAnomalies} significant anomalies detected`);
    }
    
    // Validation results
    const failedValidations = validationResults.filter(r => !r.isValid).length;
    if (failedValidations === 0) {
      excellent.push('All data validation checks passed');
    } else if (failedValidations <= 2) {
      warnings.push(`${failedValidations} validation checks failed`);
    } else {
      critical.push(`${failedValidations} validation checks failed`);
    }
    
    return { excellent, good, warnings, critical };
  }

  // Calculate overall data quality score
  private calculateOverallDataQuality(
    validationResults: ValidationResult[],
    anomalies: AnomalyResult[],
    calibrationStatus: CalibrationStatus
  ): number {
    let score = 1.0;
    
    // Validation score (40% weight)
    const validationScore = validationResults.length > 0
      ? validationResults.reduce((sum, r) => sum + (r.isValid ? r.confidence : 0), 0) / validationResults.length
      : 0.8;
    score *= (0.4 * validationScore + 0.6);
    
    // Anomaly score (30% weight)
    const criticalAnomalies = anomalies.filter(a => a.severity === 'high').length;
    const moderateAnomalies = anomalies.filter(a => a.severity === 'medium').length;
    const anomalyPenalty = (criticalAnomalies * 0.2) + (moderateAnomalies * 0.1);
    score *= Math.max(0.3, 1 - anomalyPenalty);
    
    // Calibration score (30% weight)
    score *= (0.3 * calibrationStatus.quality + 0.7);
    
    return Math.max(0, Math.min(1, score));
  }

  // Create fallback metrics on error
  private createFallbackMetrics(session: WalkingSession): EnhancedMetrics {
    const fallbackKpis = this.kpiSystem.calculateKPIs({
      sessions: [{
        distance: session.distance,
        duration: session.duration,
        steps: session.steps,
        calories: session.calories,
        avgSpeed: session.metrics.speed || 0,
        avgPace: session.metrics.averagePace || 0,
        timestamp: session.startTime || Date.now()
      }],
      timeframe: 'daily'
    });

    return {
      steps: session.steps,
      distance: session.distance,
      duration: session.duration,
      calories: session.calories,
      averagePace: session.metrics.averagePace,
      speed: session.metrics.speed,
      gpsAccuracy: 0.5,
      stepAccuracy: 0.5,
      distanceAccuracy: 0.5,
      speedAccuracy: 0.5,
      dataQuality: 0.5,
      validationResults: [],
      anomalies: [],
      calibrationStatus: {
          isCalibrated: false,
          quality: 0.5,
          lastCalibration: new Date(0),
          needsRecalibration: true,
          recommendations: ['System error - calibration needed']
        },
      kpis: fallbackKpis,
      confidenceIntervals: {
        distance: { lower: session.distance * 0.9, upper: session.distance * 1.1, confidence: 0.8 },
        speed: { lower: session.metrics.speed * 0.9, upper: session.metrics.speed * 1.1, confidence: 0.8 },
        pace: { lower: session.metrics.averagePace * 0.9, upper: session.metrics.averagePace * 1.1, confidence: 0.8 },
        calories: { lower: session.calories * 0.85, upper: session.calories * 1.15, confidence: 0.8 }
      },
      qualityIndicators: {
        excellent: [],
        good: [],
        warnings: ['System error occurred'],
        critical: ['Enhanced metrics temporarily unavailable']
      }
    };
  }

  // Start periodic processes
  private startPeriodicProcesses(): void {
    // Validation interval
    if (this.config.enableRealTimeValidation) {
      this.validationInterval = setInterval(() => {
        // Periodic validation logic here
      }, this.config.validationInterval) as any;
    }
    
    // Calibration interval
    if (this.config.enableAutoCalibration) {
      this.calibrationInterval = setInterval(async () => {
        try {
          await this.calibrationSystem.startCalibration();
        } catch (error) {
          console.error('Auto-calibration failed:', error);
        }
      }, this.config.calibrationInterval) as any;
    }
    
    // Quality reporting interval
    if (this.config.enableQualityMonitoring) {
      this.qualityInterval = setInterval(async () => {
        try {
          await this.qualityMonitor.generateQualityReport();
        } catch (error) {
          console.error('Quality monitoring failed:', error);
        }
      }, this.config.qualityReportInterval) as any;
    }
  }

  // Stop periodic processes
  private stopPeriodicProcesses(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    
    if (this.calibrationInterval) {
      clearInterval(this.calibrationInterval);
      this.calibrationInterval = null;
    }
    
    if (this.qualityInterval) {
      clearInterval(this.qualityInterval);
      this.qualityInterval = null;
    }
  }

  // Utility methods
  private calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lon - point1.lon) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private maintainHistorySize(): void {
    const maxHistory = 100;
    if (this.metricsHistory.length > maxHistory) {
      this.metricsHistory = this.metricsHistory.slice(-maxHistory);
    }
  }

  // Public API methods
  getLatestQualityReport(): QualityReport | null {
    return this.qualityMonitor.getLatestReport();
  }

  getMetricsHistory(): EnhancedMetrics[] {
    return [...this.metricsHistory];
  }

  async performManualCalibration(): Promise<CalibrationStatus> {
    return new Promise((resolve) => {
      this.calibrationSystem.startCalibration(
        (progress, message) => {
          console.log(`Calibration progress: ${progress}% - ${message}`);
        },
        (success, data) => {
          resolve(this.calibrationSystem.getCalibrationStatus());
        }
      );
    });
  }

  getCalibrationStatus(): CalibrationStatus {
    return this.calibrationSystem.getCalibrationStatus();
  }

  updateConfig(newConfig: Partial<EnhancedMetricsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart periodic processes if needed
    if (this.isInitialized) {
      this.stopPeriodicProcesses();
      this.startPeriodicProcesses();
    }
  }

  getConfig(): EnhancedMetricsConfig {
    return { ...this.config };
  }

  reset(): void {
    this.metricsHistory = [];
    this.routeHistory = [];
    this.anomalyDetector.reset();
    this.qualityMonitor.reset();
  }
}

// Singleton instance
let enhancedWalkingManager: EnhancedWalkingContextManager | null = null;

export const getEnhancedWalkingManager = (config?: Partial<EnhancedMetricsConfig>): EnhancedWalkingContextManager => {
  if (!enhancedWalkingManager) {
    enhancedWalkingManager = new EnhancedWalkingContextManager(config);
  }
  return enhancedWalkingManager;
};

export const resetEnhancedWalkingManager = (): void => {
  if (enhancedWalkingManager) {
    enhancedWalkingManager.shutdown();
    enhancedWalkingManager = null;
  }
};