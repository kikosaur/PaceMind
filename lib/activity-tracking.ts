import * as Location from 'expo-location';

// Enhanced activity tracking types
export interface ActivityMetrics {
  distance: number; // meters
  duration: number; // seconds
  pace: number; // seconds per km
  speed: number; // m/s
  averagePace: number; // seconds per km
  calories: number;
  elevation: {
    gain: number; // meters
    loss: number; // meters
    current: number; // meters
  };
}

export interface ActivitySplit {
  kmIndex: number;
  distance: number; // meters (should be ~1000 for full km)
  duration: number; // seconds
  pace: number; // seconds per km
  timestamp: number;
}

export interface ActivityPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy: number;
  speed?: number;
}

// Add missing LocationPoint interface
interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy: number;
  speed?: number;
}

// Enhanced GPS configuration for improved accuracy
export const ACTIVITY_CONFIG = {
  // Distance and movement - more precise thresholds
  MIN_MOVEMENT_THRESHOLD: 0.3, // meters - reduced for better sensitivity
  MAX_WALKING_SPEED: 2.8, // m/s - more realistic maximum walking speed
  MIN_WALKING_SPEED: 0.05, // m/s - lower minimum for slow walking
  MIN_MOVEMENT_DISTANCE: 0.5, // meters
  MAX_REALISTIC_SPEED: 15, // m/s
  MIN_REALISTIC_SPEED: 0.01, // m/s
  MIN_UPDATE_INTERVAL: 0.5, // seconds
  
  // GPS accuracy - stricter requirements
  MIN_GPS_ACCURACY: 12, // meters - improved from 15m
  EXCELLENT_GPS_ACCURACY: 3, // meters - excellent accuracy threshold
  GOOD_GPS_ACCURACY: 8, // meters - good accuracy threshold
  
  // Enhanced smoothing and filtering
  KALMAN_PROCESS_NOISE: 0.008, // reduced noise for better filtering
  KALMAN_MEASUREMENT_NOISE: 0.1, // measurement noise factor
  SPEED_SMOOTHING_FACTOR: 0.25, // improved exponential smoothing
  PACE_SMOOTHING_WINDOW: 7, // increased window for better pace smoothing
  DISTANCE_SMOOTHING_WINDOW: 5, // window for distance smoothing
  
  // Add SMOOTHING object
  SMOOTHING: {
    SPEED_WINDOW: 10,
    PACE_WINDOW: 7,
    DISTANCE_WINDOW: 5
  },
  
  // Enhanced activity detection
  STATIONARY_THRESHOLD: 0.15, // m/s - more sensitive stationary detection
  ACTIVITY_TIMEOUT: 25000, // ms - reduced timeout for better responsiveness
  GPS_OUTLIER_THRESHOLD: 50, // meters - maximum jump distance
  
  // Calories calculation (METs based) - more accurate
  WALKING_MET_BASE: 2.8, // base MET for slow walking
  WALKING_MET_PER_KMH: 0.12, // increased MET per km/h for accuracy
  JOGGING_THRESHOLD_KMH: 6.5, // km/h threshold for jogging
  JOGGING_MET_BASE: 7.0, // base MET for jogging
  AVERAGE_WEIGHT_KG: 70, // default weight for calorie calculation
  
  // Distance validation
  MAX_DISTANCE_JUMP: 25, // meters - maximum allowed distance jump
  MIN_TIME_BETWEEN_POINTS: 500, // ms - minimum time between valid points
};

// Haversine distance calculation with enhanced precision
export function calculateDistance(point1: ActivityPoint, point2: ActivityPoint): number {
  const R = 6371000; // Earth's radius in meters (more precise value)
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const lat1 = point1.latitude * Math.PI / 180;
  const lat2 = point2.latitude * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Enhanced Kalman filter with improved accuracy
export class ActivityKalmanFilter {
  private state: {
    lat: number;
    lon: number;
    latVelocity: number;
    lonVelocity: number;
  } = { lat: 0, lon: 0, latVelocity: 0, lonVelocity: 0 };
  
  private covariance: number[][] = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
  
  private initialized = false;
  private lastTimestamp = 0;
  private processNoise = ACTIVITY_CONFIG.KALMAN_PROCESS_NOISE;
  private measurementNoise = ACTIVITY_CONFIG.KALMAN_MEASUREMENT_NOISE;

  process(point: ActivityPoint): ActivityPoint {
    if (!this.initialized) {
      this.state = {
        lat: point.latitude,
        lon: point.longitude,
        latVelocity: 0,
        lonVelocity: 0
      };
      this.initialized = true;
      this.lastTimestamp = point.timestamp;
      return point;
    }

    const dt = Math.max(0.1, (point.timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = point.timestamp;

    // Adjust process noise based on GPS accuracy
    const accuracyFactor = Math.min(1, point.accuracy / ACTIVITY_CONFIG.EXCELLENT_GPS_ACCURACY);
    const adaptiveProcessNoise = this.processNoise * (1 + accuracyFactor);

    // Prediction step with enhanced state transition
    const predictedState = {
      lat: this.state.lat + this.state.latVelocity * dt,
      lon: this.state.lon + this.state.lonVelocity * dt,
      latVelocity: this.state.latVelocity * 0.95, // slight velocity decay
      lonVelocity: this.state.lonVelocity * 0.95
    };

    // Enhanced Kalman gain calculation based on accuracy
    const K = Math.min(0.3, adaptiveProcessNoise / (adaptiveProcessNoise + this.measurementNoise * accuracyFactor));

    // Update state with adaptive filtering
    this.state.lat = predictedState.lat + K * (point.latitude - predictedState.lat);
    this.state.lon = predictedState.lon + K * (point.longitude - predictedState.lon);
    
    // Update velocity estimates
    const latVelUpdate = (point.latitude - this.state.lat) / dt;
    const lonVelUpdate = (point.longitude - this.state.lon) / dt;
    this.state.latVelocity = this.state.latVelocity + K * (latVelUpdate - this.state.latVelocity);
    this.state.lonVelocity = this.state.lonVelocity + K * (lonVelUpdate - this.state.lonVelocity);

    return {
      ...point,
      latitude: this.state.lat,
      longitude: this.state.lon
    };
  }

  reset(): void {
    this.initialized = false;
    this.lastTimestamp = 0;
    this.covariance = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }
}

// Enhanced activity tracker with improved distance accuracy
export class ActivityTracker {
  private kalmanFilter: ActivityKalmanFilter;
  private lastLocation: LocationPoint | null = null;
  private lastUpdateTime: number = 0;
  private totalDistance: number = 0;
  private totalElevationGain: number = 0;
  private totalElevationLoss: number = 0;
  private startTime: number;
  private lastValidLocation: LocationPoint | null = null;
  private locationBuffer: LocationPoint[] = [];
  private speedBuffer: number[] = [];
  private paceBuffer: number[] = [];
  private distanceBuffer: number[] = [];
  
  // Performance optimization: Use circular buffers for better memory management
  private readonly MAX_BUFFER_SIZE = 50;
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.kalmanFilter = new ActivityKalmanFilter();
    this.startTime = Date.now();
    
    // Start periodic cleanup for memory management
    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private performMemoryCleanup(): void {
    // Keep only recent data in buffers
    if (this.locationBuffer.length > this.MAX_BUFFER_SIZE) {
      this.locationBuffer = this.locationBuffer.slice(-this.MAX_BUFFER_SIZE);
    }
    if (this.speedBuffer.length > this.MAX_BUFFER_SIZE) {
      this.speedBuffer = this.speedBuffer.slice(-this.MAX_BUFFER_SIZE);
    }
    if (this.paceBuffer.length > this.MAX_BUFFER_SIZE) {
      this.paceBuffer = this.paceBuffer.slice(-this.MAX_BUFFER_SIZE);
    }
    if (this.distanceBuffer.length > this.MAX_BUFFER_SIZE) {
      this.distanceBuffer = this.distanceBuffer.slice(-this.MAX_BUFFER_SIZE);
    }
    
    console.log('ActivityTracker memory cleanup performed');
  }

  // Enhanced GPS location validation
  private isValidGPSLocation(location: LocationPoint): boolean {
    return location.accuracy <= ACTIVITY_CONFIG.MIN_GPS_ACCURACY &&
           location.latitude !== 0 && location.longitude !== 0;
  }

  // Enhanced distance calculation using Haversine formula
  private calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Enhanced calorie calculation
  private calculateCalories(distanceKm: number, duration: number, speed: number): number {
    const kmh = speed * 3.6; // Convert m/s to km/h
    
    // Enhanced MET calculation based on speed
    let met = ACTIVITY_CONFIG.WALKING_MET_BASE;
    
    if (kmh > ACTIVITY_CONFIG.JOGGING_THRESHOLD_KMH) {
      // Jogging/running MET calculation
      met = ACTIVITY_CONFIG.JOGGING_MET_BASE + ((kmh - ACTIVITY_CONFIG.JOGGING_THRESHOLD_KMH) * 0.2);
    } else {
      // Walking MET calculation with improved formula
      met = ACTIVITY_CONFIG.WALKING_MET_BASE + (kmh * ACTIVITY_CONFIG.WALKING_MET_PER_KMH);
    }
    
    // Add elevation bonus (10% increase per 100m elevation gain)
    const elevationBonus = (this.totalElevationGain / 100) * 0.1;
    met *= (1 + elevationBonus);
    
    const hours = duration / 3600;
    return met * ACTIVITY_CONFIG.AVERAGE_WEIGHT_KG * hours;
  }

  // Enhanced addLocation with performance optimizations
  addLocation(location: LocationPoint): ActivityMetrics {
    const currentTime = Date.now();
    
    // Enhanced GPS accuracy validation with performance considerations
    if (!this.isValidGPSLocation(location)) {
      return this.getCurrentMetrics();
    }

    // Apply Kalman filtering for smoother tracking
    const filteredLocation = this.kalmanFilter.process(location);
    
    // Add to location buffer for analysis
    this.locationBuffer.push(filteredLocation);
    
    // Enhanced movement validation with performance optimizations
    if (this.lastLocation && this.isValidMovement(this.lastLocation, filteredLocation, currentTime)) {
      const segmentDistance = this.calculateDistance(this.lastLocation, filteredLocation);
      
      // Outlier detection with performance considerations
      if (!this.isOutlier(segmentDistance, currentTime)) {
        this.totalDistance += segmentDistance;
        this.distanceBuffer.push(segmentDistance);
        
        // Calculate elevation changes
        if (this.lastLocation.altitude && filteredLocation.altitude) {
          const elevationChange = filteredLocation.altitude - this.lastLocation.altitude;
          if (elevationChange > 0) {
            this.totalElevationGain += elevationChange;
          } else {
            this.totalElevationLoss += Math.abs(elevationChange);
          }
        }
        
        this.lastValidLocation = filteredLocation;
      }
    }

    this.lastLocation = filteredLocation;
    this.lastUpdateTime = currentTime;
    
    return this.getCurrentMetrics();
  }

  // Enhanced getCurrentMetrics with performance optimizations
  getCurrentMetrics(): ActivityMetrics {
    const currentTime = Date.now();
    const duration = Math.max(1, (currentTime - this.startTime) / 1000); // seconds
    const distanceKm = this.totalDistance / 1000;
    
    // Enhanced speed calculation with exponential smoothing
    let speed = 0;
    if (this.speedBuffer.length > 0) {
      // Use weighted average for recent speeds
      const weights = this.speedBuffer.map((_, i) => Math.pow(0.9, this.speedBuffer.length - 1 - i));
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      speed = this.speedBuffer.reduce((sum, s, i) => sum + s * weights[i], 0) / weightSum;
    } else if (distanceKm > 0 && duration > 0) {
      speed = (distanceKm / (duration / 3600)); // km/h
    }
    
    // Enhanced pace calculation with smoothing
    let pace = 0;
    if (this.paceBuffer.length > 0) {
      // Use median for more stable pace calculation
      const sortedPaces = [...this.paceBuffer].sort((a, b) => a - b);
      const mid = Math.floor(sortedPaces.length / 2);
      pace = sortedPaces.length % 2 === 0 
        ? (sortedPaces[mid - 1] + sortedPaces[mid]) / 2
        : sortedPaces[mid];
    } else if (speed > 0) {
      pace = 60 / speed; // minutes per km
    }
    
    // Add current values to buffers for smoothing
    if (speed > 0) {
      this.speedBuffer.push(speed);
      if (this.speedBuffer.length > ACTIVITY_CONFIG.SMOOTHING.SPEED_WINDOW) {
        this.speedBuffer.shift();
      }
    }
    
    if (pace > 0 && pace < 30) { // Filter out unrealistic pace values
      this.paceBuffer.push(pace);
      if (this.paceBuffer.length > ACTIVITY_CONFIG.SMOOTHING.PACE_WINDOW) {
        this.paceBuffer.shift();
      }
    }

    // Enhanced calorie calculation
    const calories = this.calculateCalories(distanceKm, duration, speed);

    return {
      distance: distanceKm,
      duration,
      pace,
      speed,
      averagePace: pace,
      calories,
      elevation: {
        gain: this.totalElevationGain,
        loss: this.totalElevationLoss,
        current: this.lastLocation?.altitude || 0
      }
    };
  }

  // Enhanced isValidMovement with performance optimizations
  private isValidMovement(prev: LocationPoint, curr: LocationPoint, currentTime: number): boolean {
    const timeDelta = (currentTime - this.lastUpdateTime) / 1000; // seconds
    
    // Skip if update is too frequent (performance optimization)
    if (timeDelta < ACTIVITY_CONFIG.MIN_UPDATE_INTERVAL) {
      return false;
    }
    
    const distance = this.calculateDistance(prev, curr);
    const speed = distance / timeDelta; // m/s
    
    // Enhanced movement validation
    return distance >= ACTIVITY_CONFIG.MIN_MOVEMENT_DISTANCE && 
           speed <= ACTIVITY_CONFIG.MAX_REALISTIC_SPEED &&
           speed >= ACTIVITY_CONFIG.MIN_REALISTIC_SPEED;
  }

  // Enhanced outlier detection with performance considerations
  private isOutlier(distance: number, currentTime: number): boolean {
    if (this.distanceBuffer.length < 5) return false;
    
    // Use recent data for outlier detection (performance optimization)
    const recentDistances = this.distanceBuffer.slice(-10);
    const mean = recentDistances.reduce((sum, d) => sum + d, 0) / recentDistances.length;
    const variance = recentDistances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / recentDistances.length;
    const stdDev = Math.sqrt(variance);
    
    // Consider it an outlier if it's more than 2.5 standard deviations from the mean
    return Math.abs(distance - mean) > (2.5 * stdDev);
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Clear all buffers
    this.locationBuffer = [];
    this.speedBuffer = [];
    this.paceBuffer = [];
    this.distanceBuffer = [];
    
    console.log('ActivityTracker cleaned up');
  }

  // Static utility methods for formatting
  static formatPace(paceSeconds: number): string {
    if (!paceSeconds || paceSeconds === 0 || !isFinite(paceSeconds)) return '0:00';
    
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static formatSpeed(speedMs: number): string {
    const kmh = speedMs * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  }

  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}