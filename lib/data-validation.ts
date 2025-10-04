import * as Location from 'expo-location';

// Data validation types and interfaces
export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1
  errors: string[];
  warnings: string[];
  correctedValue?: any;
}

export interface DataQualityMetrics {
  gpsAccuracy: number;
  dataCompleteness: number;
  temporalConsistency: number;
  spatialConsistency: number;
  sensorReliability: number;
  overallQuality: number;
}

export interface SensorCalibration {
  accelerometerBias: { x: number; y: number; z: number };
  gyroscopeBias: { x: number; y: number; z: number };
  magnetometerBias: { x: number; y: number; z: number };
  stepCounterAccuracy: number;
  gpsAccuracyFactor: number;
  lastCalibrationTime: number;
}

// Validation thresholds and constants
export const VALIDATION_THRESHOLDS = {
  // GPS validation
  MIN_GPS_ACCURACY: 15, // meters
  MAX_GPS_ACCURACY: 3, // meters for excellent accuracy
  MAX_SPEED_JUMP: 5, // m/s maximum speed change between readings
  MAX_DISTANCE_JUMP: 50, // meters maximum distance jump
  MIN_TIME_BETWEEN_READINGS: 500, // ms
  
  // Movement validation
  MAX_HUMAN_SPEED: 15, // m/s (54 km/h)
  MIN_WALKING_SPEED: 0.1, // m/s
  MAX_WALKING_SPEED: 3.5, // m/s
  STATIONARY_THRESHOLD: 0.2, // m/s
  
  // Step counting validation
  MIN_STEPS_PER_MINUTE: 0,
  MAX_STEPS_PER_MINUTE: 200,
  TYPICAL_STEP_LENGTH: 0.7, // meters
  MIN_STEP_LENGTH: 0.3, // meters
  MAX_STEP_LENGTH: 1.2, // meters
  
  // Calorie validation
  MIN_CALORIES_PER_KM: 30, // kcal/km
  MAX_CALORIES_PER_KM: 100, // kcal/km
  
  // Data quality thresholds
  MIN_DATA_QUALITY: 0.6, // 60% minimum quality score
  EXCELLENT_DATA_QUALITY: 0.9, // 90% excellent quality score
};

// Statistical analysis for anomaly detection
export class StatisticalAnalyzer {
  private dataHistory: number[] = [];
  private readonly maxHistorySize = 100;

  addDataPoint(value: number): void {
    this.dataHistory.push(value);
    if (this.dataHistory.length > this.maxHistorySize) {
      this.dataHistory.shift();
    }
  }

  calculateMean(): number {
    if (this.dataHistory.length === 0) return 0;
    return this.dataHistory.reduce((sum, val) => sum + val, 0) / this.dataHistory.length;
  }

  calculateStandardDeviation(): number {
    if (this.dataHistory.length < 2) return 0;
    const mean = this.calculateMean();
    const variance = this.dataHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (this.dataHistory.length - 1);
    return Math.sqrt(variance);
  }

  detectOutlier(value: number, zScoreThreshold: number = 2.5): boolean {
    if (this.dataHistory.length < 10) return false; // Need sufficient data
    
    const mean = this.calculateMean();
    const stdDev = this.calculateStandardDeviation();
    
    if (stdDev === 0) return false;
    
    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > zScoreThreshold;
  }

  getPercentile(percentile: number): number {
    if (this.dataHistory.length === 0) return 0;
    
    const sorted = [...this.dataHistory].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  reset(): void {
    this.dataHistory = [];
  }
}

// GPS data validator
export class GPSValidator {
  private lastLocation: Location.LocationObject | null = null;
  private lastValidLocation: Location.LocationObject | null = null;
  private speedAnalyzer = new StatisticalAnalyzer();
  private accuracyAnalyzer = new StatisticalAnalyzer();

  validateGPSReading(location: Location.LocationObject): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Accuracy validation
    if (location.coords.accuracy !== null) {
      if (location.coords.accuracy > VALIDATION_THRESHOLDS.MIN_GPS_ACCURACY) {
        errors.push(`GPS accuracy too low: ${location.coords.accuracy}m`);
        confidence *= 0.5;
      } else if (location.coords.accuracy > VALIDATION_THRESHOLDS.MAX_GPS_ACCURACY * 2) {
        warnings.push(`GPS accuracy could be better: ${location.coords.accuracy}m`);
        confidence *= 0.8;
      }
    } else {
      warnings.push('GPS accuracy not available');
      confidence *= 0.7;
    }

    // Speed validation
    if (location.coords.speed !== null) {
      if (location.coords.speed > VALIDATION_THRESHOLDS.MAX_HUMAN_SPEED) {
        errors.push(`Unrealistic speed: ${location.coords.speed} m/s`);
        confidence *= 0.3;
      }

      // Check for speed outliers
      if (this.speedAnalyzer.detectOutlier(location.coords.speed)) {
        warnings.push(`Speed outlier detected: ${location.coords.speed} m/s`);
        confidence *= 0.9;
      }

      this.speedAnalyzer.addDataPoint(location.coords.speed);
    }

    // Distance jump validation
    if (this.lastLocation) {
      const distance = this.calculateDistance(this.lastLocation, location);
      const timeDiff = location.timestamp - this.lastLocation.timestamp;
      
      if (timeDiff < VALIDATION_THRESHOLDS.MIN_TIME_BETWEEN_READINGS) {
        warnings.push(`GPS readings too frequent: ${timeDiff}ms`);
        confidence *= 0.9;
      }

      if (distance > VALIDATION_THRESHOLDS.MAX_DISTANCE_JUMP) {
        errors.push(`Unrealistic distance jump: ${distance}m`);
        confidence *= 0.2;
      }

      // Speed consistency check
      if (timeDiff > 0) {
        const calculatedSpeed = distance / (timeDiff / 1000);
        if (calculatedSpeed > VALIDATION_THRESHOLDS.MAX_HUMAN_SPEED) {
          errors.push(`Calculated speed too high: ${calculatedSpeed} m/s`);
          confidence *= 0.3;
        }
      }
    }

    this.accuracyAnalyzer.addDataPoint(location.coords.accuracy ?? 0);
    this.lastLocation = location;

    if (errors.length === 0) {
      this.lastValidLocation = location;
    }

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings,
      correctedValue: errors.length > 0 ? this.lastValidLocation : location
    };
  }

  private calculateDistance(loc1: Location.LocationObject, loc2: Location.LocationObject): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = loc1.coords.latitude * Math.PI / 180;
    const lat2Rad = loc2.coords.latitude * Math.PI / 180;
    const deltaLatRad = (loc2.coords.latitude - loc1.coords.latitude) * Math.PI / 180;
    const deltaLonRad = (loc2.coords.longitude - loc1.coords.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  getDataQuality(): DataQualityMetrics {
    const avgAccuracy = this.accuracyAnalyzer.calculateMean();
    const gpsAccuracy = Math.max(0, 1 - (avgAccuracy / VALIDATION_THRESHOLDS.MIN_GPS_ACCURACY));
    
    return {
      gpsAccuracy,
      dataCompleteness: 1.0, // Will be calculated based on missing readings
      temporalConsistency: 1.0, // Will be calculated based on timing consistency
      spatialConsistency: 1.0, // Will be calculated based on movement patterns
      sensorReliability: gpsAccuracy,
      overallQuality: gpsAccuracy
    };
  }

  reset(): void {
    this.lastLocation = null;
    this.lastValidLocation = null;
    this.speedAnalyzer.reset();
    this.accuracyAnalyzer.reset();
  }
}

// Step counting validator
export class StepValidator {
  private stepAnalyzer = new StatisticalAnalyzer();
  private lastStepCount = 0;
  private lastStepTime = 0;

  validateStepCount(stepCount: number, timestamp: number, distance: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Step rate validation
    if (this.lastStepTime > 0) {
      const timeDiff = (timestamp - this.lastStepTime) / 1000 / 60; // minutes
      const stepDiff = stepCount - this.lastStepCount;
      
      if (timeDiff > 0) {
        const stepsPerMinute = stepDiff / timeDiff;
        
        if (stepsPerMinute > VALIDATION_THRESHOLDS.MAX_STEPS_PER_MINUTE) {
          errors.push(`Step rate too high: ${stepsPerMinute} steps/min`);
          confidence *= 0.4;
        }

        if (this.stepAnalyzer.detectOutlier(stepsPerMinute)) {
          warnings.push(`Step rate outlier: ${stepsPerMinute} steps/min`);
          confidence *= 0.9;
        }

        this.stepAnalyzer.addDataPoint(stepsPerMinute);
      }
    }

    // Step length validation (if distance is available)
    if (distance > 0 && stepCount > 0) {
      const avgStepLength = distance / stepCount;
      
      if (avgStepLength < VALIDATION_THRESHOLDS.MIN_STEP_LENGTH) {
        warnings.push(`Step length too short: ${avgStepLength}m`);
        confidence *= 0.8;
      } else if (avgStepLength > VALIDATION_THRESHOLDS.MAX_STEP_LENGTH) {
        warnings.push(`Step length too long: ${avgStepLength}m`);
        confidence *= 0.8;
      }
    }

    this.lastStepCount = stepCount;
    this.lastStepTime = timestamp;

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings
    };
  }

  reset(): void {
    this.stepAnalyzer.reset();
    this.lastStepCount = 0;
    this.lastStepTime = 0;
  }
}

// Calorie calculation validator
export class CalorieValidator {
  private calorieAnalyzer = new StatisticalAnalyzer();

  validateCalories(calories: number, distance: number, duration: number, weight: number = 70): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    if (distance > 0) {
      const caloriesPerKm = calories / distance;
      
      if (caloriesPerKm < VALIDATION_THRESHOLDS.MIN_CALORIES_PER_KM) {
        warnings.push(`Calories per km too low: ${caloriesPerKm} kcal/km`);
        confidence *= 0.8;
      } else if (caloriesPerKm > VALIDATION_THRESHOLDS.MAX_CALORIES_PER_KM) {
        warnings.push(`Calories per km too high: ${caloriesPerKm} kcal/km`);
        confidence *= 0.8;
      }

      if (this.calorieAnalyzer.detectOutlier(caloriesPerKm)) {
        warnings.push(`Calorie rate outlier: ${caloriesPerKm} kcal/km`);
        confidence *= 0.9;
      }

      this.calorieAnalyzer.addDataPoint(caloriesPerKm);
    }

    // Calculate expected calories for validation
    const expectedCalories = this.calculateExpectedCalories(distance, duration, weight);
    const deviation = Math.abs(calories - expectedCalories) / expectedCalories;
    
    if (deviation > 0.5) { // 50% deviation threshold
      warnings.push(`Calorie calculation deviation: ${(deviation * 100).toFixed(1)}%`);
      confidence *= 0.7;
    }

    return {
      isValid: errors.length === 0,
      confidence,
      errors,
      warnings,
      correctedValue: expectedCalories
    };
  }

  private calculateExpectedCalories(distance: number, duration: number, weight: number): number {
    // MET-based calculation
    const speed = distance / (duration / 3600); // km/h
    let met = 2.8; // base walking MET
    
    if (speed > 6.5) {
      met = 7.0 + (speed - 6.5) * 0.5; // jogging/running
    } else {
      met = 2.8 + speed * 0.12; // walking
    }
    
    return met * weight * (duration / 3600);
  }

  reset(): void {
    this.calorieAnalyzer.reset();
  }
}

// Main data validation orchestrator
export class DataValidationSystem {
  private gpsValidator = new GPSValidator();
  private stepValidator = new StepValidator();
  private calorieValidator = new CalorieValidator();
  private validationHistory: ValidationResult[] = [];

  validateActivityData(data: {
    location?: Location.LocationObject;
    stepCount?: number;
    calories?: number;
    distance?: number;
    duration?: number;
    timestamp: number;
  }): ValidationResult {
    const results: ValidationResult[] = [];

    // Validate GPS data
    if (data.location) {
      results.push(this.gpsValidator.validateGPSReading(data.location));
    }

    // Validate step count
    if (data.stepCount !== undefined) {
      results.push(this.stepValidator.validateStepCount(
        data.stepCount, 
        data.timestamp, 
        data.distance || 0
      ));
    }

    // Validate calories
    if (data.calories !== undefined && data.distance !== undefined && data.duration !== undefined) {
      results.push(this.calorieValidator.validateCalories(
        data.calories, 
        data.distance, 
        data.duration
      ));
    }

    // Combine results
    const combinedResult = this.combineValidationResults(results);
    this.validationHistory.push(combinedResult);

    // Keep only recent history
    if (this.validationHistory.length > 100) {
      this.validationHistory.shift();
    }

    return combinedResult;
  }

  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    if (results.length === 0) {
      return { isValid: true, confidence: 1.0, errors: [], warnings: [] };
    }

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const isValid = results.every(r => r.isValid);

    return {
      isValid,
      confidence: avgConfidence,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  getOverallDataQuality(): DataQualityMetrics {
    const gpsQuality = this.gpsValidator.getDataQuality();
    
    // Calculate data completeness based on validation history
    const recentValidations = this.validationHistory.slice(-50);
    const validCount = recentValidations.filter(v => v.isValid).length;
    const dataCompleteness = recentValidations.length > 0 ? validCount / recentValidations.length : 1.0;
    
    // Calculate average confidence as reliability metric
    const avgConfidence = recentValidations.length > 0 
      ? recentValidations.reduce((sum, v) => sum + v.confidence, 0) / recentValidations.length 
      : 1.0;

    return {
      gpsAccuracy: gpsQuality.gpsAccuracy,
      dataCompleteness,
      temporalConsistency: avgConfidence,
      spatialConsistency: gpsQuality.spatialConsistency,
      sensorReliability: avgConfidence,
      overallQuality: (gpsQuality.gpsAccuracy + dataCompleteness + avgConfidence) / 3
    };
  }

  reset(): void {
    this.gpsValidator.reset();
    this.stepValidator.reset();
    this.calorieValidator.reset();
    this.validationHistory = [];
  }
}