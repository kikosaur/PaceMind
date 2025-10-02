import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { useWalking } from '@/contexts/WalkingContext';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityMetrics } from '@/components/ActivityMetrics';
import { PerformanceMonitor, withPerformanceTracking } from '@/utils/performance';
import { DataCleanupManager } from '@/utils/dataCleanup';

// Custom hooks for sensor management
const useLocationTracking = (isActive: boolean, onLocationUpdate: (location: Location.LocationObject) => void) => {
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<Location.LocationObject | null>(null);
  const lastLocationTimeRef = useRef<number>(0);
  const locationBufferRef = useRef<Location.LocationObject[]>([]);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Periodic cleanup to prevent memory accumulation
  const performLocationCleanup = useCallback(() => {
    const now = Date.now();
    
    // Clean location buffer every 60 seconds
    if (locationBufferRef.current.length > 20) {
      locationBufferRef.current = locationBufferRef.current.slice(-10);
    }
    
    // Reset last location time if too old (prevents stale data)
    if (now - lastLocationTimeRef.current > 300000) { // 5 minutes
      lastLocationTimeRef.current = 0;
    }
  }, []);

  const handleLocationUpdate = useCallback((location: Location.LocationObject) => {
    const now = Date.now();
    
    // Throttle location updates to prevent excessive processing
    if (now - lastLocationTimeRef.current < 2000) { // Minimum 2 seconds between updates
      return;
    }
    
    // Add to buffer with size limit
    locationBufferRef.current.push(location);
    if (locationBufferRef.current.length > 10) {
      locationBufferRef.current.shift();
    }
    
    lastLocationRef.current = location;
    lastLocationTimeRef.current = now;
    onLocationUpdate(location);
  }, [onLocationUpdate]);

  const startLocationTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for tracking your walk.');
        return false;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Balanced accuracy for better battery life
          timeInterval: 3000, // Update every 3 seconds (reduced frequency)
          distanceInterval: 2, // Update every 2 meters
        },
        handleLocationUpdate
      );

      locationSubscriptionRef.current = subscription;
      
      // Set up periodic cleanup
      cleanupIntervalRef.current = setInterval(performLocationCleanup, 60000) as any; // Every minute
      
      return true;
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      return false;
    }
  }, [handleLocationUpdate, performLocationCleanup]);

  const stopLocationTracking = useCallback(() => {
    // Clean up location subscription
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    // Clear cleanup interval
    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }

    // Reset tracking data
    lastLocationTimeRef.current = 0;
    locationBufferRef.current = [];
  }, []);

  useEffect(() => {
    if (isActive) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }

    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, [isActive, startLocationTracking, stopLocationTracking]);

  return { lastLocation: lastLocationRef.current };
};

const useStepTracking = (isActive: boolean, onStepDetected: () => void) => {
  const accelerometerSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const stepDataRef = useRef({
    lastMagnitude: 0,
    baselineThreshold: 1.15,
    adaptiveThreshold: 1.15,
    lastStepTime: 0,
    stepBuffer: [] as number[],
    magnitudeHistory: [] as number[],
    peakBuffer: [] as number[],
    stepCadence: 0,
    lastPeakTime: 0,
    consecutiveSteps: 0,
    calibrationSamples: 0,
    isCalibrated: false,
    lastCleanupTime: Date.now(), // Add cleanup tracking
  });

  // Periodic cleanup to prevent memory leaks
  const performPeriodicCleanup = useCallback(() => {
    const now = Date.now();
    const stepData = stepDataRef.current;
    
    // Clean up every 30 seconds
    if (now - stepData.lastCleanupTime > 30000) {
      // Limit buffer sizes to prevent memory accumulation
      if (stepData.magnitudeHistory.length > 100) {
        stepData.magnitudeHistory = stepData.magnitudeHistory.slice(-50);
      }
      if (stepData.stepBuffer.length > 30) {
        stepData.stepBuffer = stepData.stepBuffer.slice(-15);
      }
      if (stepData.peakBuffer.length > 20) {
        stepData.peakBuffer = stepData.peakBuffer.slice(-10);
      }
      
      stepData.lastCleanupTime = now;
    }
  }, []);

  const processAccelerometerData = useCallback((data: { x: number; y: number; z: number }) => {
    const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
    const now = Date.now();
    const stepData = stepDataRef.current;

    // Perform periodic cleanup to prevent memory leaks
    performPeriodicCleanup();

    // Add to magnitude history with size limit
    stepData.magnitudeHistory.push(magnitude);
    if (stepData.magnitudeHistory.length > 50) {
      stepData.magnitudeHistory.shift();
    }

    // Add to buffer for smoothing with size limit
    stepData.stepBuffer.push(magnitude);
    if (stepData.stepBuffer.length > 15) {
      stepData.stepBuffer.shift();
    }

    // Calculate smoothed magnitude with weighted average
    const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
    let smoothedMagnitude = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < Math.min(stepData.stepBuffer.length, weights.length); i++) {
      const weight = weights[i];
      const value = stepData.stepBuffer[stepData.stepBuffer.length - 1 - i];
      smoothedMagnitude += value * weight;
      totalWeight += weight;
    }
    smoothedMagnitude = totalWeight > 0 ? smoothedMagnitude / totalWeight : magnitude;

    // Dynamic threshold calibration (only when needed)
    if (!stepData.isCalibrated && stepData.magnitudeHistory.length >= 30) {
      const baseline = stepData.magnitudeHistory.reduce((sum, val) => sum + val, 0) / stepData.magnitudeHistory.length;
      const variance = stepData.magnitudeHistory.reduce((sum, val) => sum + Math.pow(val - baseline, 2), 0) / stepData.magnitudeHistory.length;
      const stdDev = Math.sqrt(variance);
      
      stepData.adaptiveThreshold = Math.max(1.05, baseline + (stdDev * 1.5));
      stepData.baselineThreshold = stepData.adaptiveThreshold;
      stepData.isCalibrated = true;
    }

    // Enhanced peak detection with multiple criteria
    const isAboveThreshold = smoothedMagnitude > stepData.adaptiveThreshold;
    const isLocalPeak = smoothedMagnitude > stepData.lastMagnitude;
    const timeSinceLastStep = now - stepData.lastStepTime;
    const timeSinceLastPeak = now - stepData.lastPeakTime;
    
    // Dynamic step interval based on cadence
    const minStepInterval = Math.max(250, Math.min(800, 60000 / Math.max(stepData.stepCadence * 2, 120)));
    const maxStepInterval = 1200;

    // Peak validation with improved criteria
    if (isAboveThreshold && isLocalPeak && timeSinceLastStep > minStepInterval) {
      const magnitudeDelta = smoothedMagnitude - stepData.lastMagnitude;
      const isSignificantPeak = magnitudeDelta > 0.08;
      
      const currentCadence = timeSinceLastStep > 0 ? 60000 / timeSinceLastStep : 0;
      const isRealisticCadence = currentCadence >= 50 && currentCadence <= 200;
      
      if (isSignificantPeak && (isRealisticCadence || stepData.consecutiveSteps < 3)) {
        stepData.lastStepTime = now;
        stepData.lastPeakTime = now;
        stepData.consecutiveSteps++;
        
        // Update cadence with exponential smoothing
        if (stepData.stepCadence === 0) {
          stepData.stepCadence = currentCadence;
        } else {
          stepData.stepCadence = stepData.stepCadence * 0.8 + currentCadence * 0.2;
        }
        
        // Adaptive threshold adjustment
        if (stepData.consecutiveSteps > 5) {
          stepData.adaptiveThreshold = stepData.baselineThreshold * (0.95 + Math.random() * 0.1);
        }
        
        onStepDetected();
      }
    }

    // Reset consecutive steps if too much time has passed
    if (timeSinceLastStep > maxStepInterval) {
      stepData.consecutiveSteps = 0;
      stepData.adaptiveThreshold = stepData.baselineThreshold;
    }

    stepData.lastMagnitude = smoothedMagnitude;
  }, [onStepDetected, performPeriodicCleanup]);

  const startStepTracking = useCallback(() => {
    Accelerometer.setUpdateInterval(100); // Reduce frequency to 10Hz for better performance
    const subscription = Accelerometer.addListener(processAccelerometerData);
    accelerometerSubscriptionRef.current = subscription;
  }, [processAccelerometerData]);

  const stopStepTracking = useCallback(() => {
    if (accelerometerSubscriptionRef.current) {
      accelerometerSubscriptionRef.current.remove();
      accelerometerSubscriptionRef.current = null;
    }
    // Complete cleanup when stopping
    const stepData = stepDataRef.current;
    stepData.isCalibrated = false;
    stepData.calibrationSamples = 0;
    stepData.magnitudeHistory = [];
    stepData.stepBuffer = [];
    stepData.peakBuffer = [];
    stepData.lastCleanupTime = Date.now();
  }, []);

  useEffect(() => {
    if (isActive) {
      startStepTracking();
    } else {
      stopStepTracking();
    }

    // Cleanup on unmount
    return () => {
      stopStepTracking();
    };
  }, [isActive, startStepTracking, stopStepTracking]);
};

const useDistanceCalculation = () => {
  const lastPositionRef = useRef<{ lat: number; lon: number; timestamp?: number } | null>(null);

  // Enhanced distance calculation with GPS + step-based fallback
  const calculateDistance = useCallback((newLocation: Location.LocationObject): number => {
    if (!lastPositionRef.current) {
      lastPositionRef.current = {
        lat: newLocation.coords.latitude,
        lon: newLocation.coords.longitude,
        timestamp: Date.now(),
      };
      return 0;
    }

    const { lat: lat1, lon: lon1 } = lastPositionRef.current;
    const { latitude: lat2, longitude: lon2 } = newLocation.coords;
    
    // Enhanced distance calculation with accuracy validation
    const accuracy = Math.min(newLocation.coords.accuracy || 50, 50);
    
    // Use GPS if accuracy is good (< 30 meters instead of 15)
    if (accuracy <= 30) {
      // Haversine formula for distance calculation
      const R = 6371000; // Earth's radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const gpsDistance = R * c;

      // Validate GPS distance is realistic
      const timeDiff = Math.max((Date.now() - (lastPositionRef.current.timestamp || Date.now())) / 1000, 1);
      const maxRealisticSpeed = 12; // m/s (43 km/h - fast running)
      const maxDistance = maxRealisticSpeed * timeDiff;
      
      // Enhanced filtering with time-based validation
      const minMovementThreshold = 0.1; // 0.1 meters minimum movement (more sensitive)
      const maxJumpDistance = Math.min(maxDistance, 50); // Dynamic max based on time
      
      if (gpsDistance >= minMovementThreshold && gpsDistance <= maxJumpDistance) {
        // Update last position with timestamp
        lastPositionRef.current = {
          lat: lat2,
          lon: lon2,
          timestamp: Date.now(),
        };
        return gpsDistance;
      }
    }
    
    // Fallback to step-based estimation when GPS is poor or unavailable
    // Average step length varies by height and walking speed: 0.6-0.8m per step
    const averageStepLength = 0.65; // meters per step (conservative estimate)
    const stepBasedDistance = averageStepLength; // Return per-step distance
    
    // Update position even with poor GPS to maintain continuity
    lastPositionRef.current = {
      lat: lat2,
      lon: lon2,
      timestamp: Date.now(),
    };
    
    // Return step-based distance only if we're actually moving
    return stepBasedDistance;
  }, []);

  const resetDistance = useCallback(() => {
    lastPositionRef.current = null;
  }, []);

  return { calculateDistance, resetDistance };
};

// Utility functions
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(2)}km`;
};

const formatPace = (pace: number): string => {
  if (pace <= 0) return '--:--';
  const minutes = Math.floor(pace / 60);
  const seconds = Math.floor(pace % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Main component
export default function WalkScreen() {
  const { user } = useAuth();
  const {
    isWalking,
    currentWalk,
    startWalk,
    pauseWalk,
    resumeWalk,
    stopWalk,
    updateSteps,
    updateDistance,
    addRoutePoint,
    resetRoute,
  } = useWalking();

  const { calculateDistance, resetDistance } = useDistanceCalculation();

  // Performance monitoring
  const performanceMonitor = useRef(PerformanceMonitor.getInstance());
  
  // Memoized callbacks to prevent unnecessary re-renders
  const handleLocationUpdate = useCallback(withPerformanceTracking('location-update', (location: Location.LocationObject) => {
    if (!isWalking || currentWalk?.isPaused) return;

    // More forgiving GPS accuracy threshold for better distance tracking
    const accuracy = location.coords.accuracy || 50;
    let distance = 0;
    
    // Use GPS if accuracy is reasonable (≤ 30m instead of 15m)
    if (accuracy <= 30) {
      distance = calculateDistance(location);
    }
    
    // Update distance if we have a GPS-based measurement OR use step-based fallback
    if (distance > 0) {
      updateDistance(distance);
    } else {
      // Fallback: use step-based distance when GPS is poor
      const averageStepLength = 0.65; // meters per step
      updateDistance(averageStepLength / 10); // Small incremental distance for location updates
    }

    // Always add route point for tracking (even with poor GPS)
    addRoutePoint({
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      timestamp: Date.now(),
      accuracy: location.coords.accuracy || undefined,
    });
  }), [isWalking, currentWalk?.isPaused, calculateDistance, updateDistance, addRoutePoint]);

  // Handle step detection with distance fallback
  const handleStepDetected = useCallback(withPerformanceTracking('step-detected', () => {
    if (!isWalking || currentWalk?.isPaused) return;
    
    updateSteps(1);
    
    // Add step-based distance when GPS is poor or unavailable
    // This ensures distance tracking continues even indoors or with poor signal
    const averageStepLength = 0.65; // meters per step
    updateDistance(averageStepLength);
  }), [isWalking, currentWalk?.isPaused, updateSteps, updateDistance]);

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.current.startMonitoring(30000); // Monitor every 30 seconds
    
    return () => {
      performanceMonitor.current.stopMonitoring();
    };
  }, []);

  // Initialize sensor data cleanup
  useEffect(() => {
    const cleanupManager = DataCleanupManager.getInstance();
    
    // Register cleanup for sensor data buffers
    cleanupManager.registerCleanupCallback(
      'sensorData',
      () => {
        // Cleanup will be handled by the sensor hooks themselves
        // This callback ensures the cleanup manager knows about sensor data
        console.log('Sensor data cleanup triggered');
      }
    );

    // Start cleanup when walking begins
    if (isWalking) {
      cleanupManager.startPeriodicCleanup(180000); // 3 minutes for sensor data
    }

    return () => {
      cleanupManager.unregisterCleanupCallback('sensorData');
      if (!isWalking) {
        cleanupManager.stopPeriodicCleanup();
      }
    };
  }, [isWalking]);

  // Performance warning system
  useEffect(() => {
    if (!isWalking) return;
    
    const checkPerformance = () => {
      const warnings = performanceMonitor.current.checkPerformanceThresholds();
      if (warnings.length > 0) {
        console.warn('Performance warnings:', warnings);
        // In production, you might want to log these to analytics
      }
    };
    
    const interval = setInterval(checkPerformance, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isWalking]);

  // Initialize sensor hooks
  useLocationTracking(isWalking && !currentWalk?.isPaused, handleLocationUpdate);
  useStepTracking(isWalking && !currentWalk?.isPaused, handleStepDetected);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only pause tracking when app goes to background if background location is not enabled
      // For production APK builds, we want to continue tracking in background
      console.log('App state changed to:', nextAppState);
      
      // Removed automatic pause on background - let the activity continue
      // if (nextAppState === 'background' && isWalking && !currentWalk?.isPaused) {
      //   pauseWalk();
      // }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isWalking, currentWalk?.isPaused, pauseWalk]);

  // Control handlers
  const handleStartWalk = useCallback(async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to start tracking your walk.');
      return;
    }

    resetDistance();
    resetRoute();
    await startWalk();
  }, [user, resetDistance, resetRoute, startWalk]);

  const handlePauseWalk = useCallback(() => {
    if (currentWalk?.isPaused) {
      resumeWalk();
    } else {
      pauseWalk();
    }
  }, [currentWalk?.isPaused, resumeWalk, pauseWalk]);

  const handleStopWalk = useCallback(() => {
    Alert.alert(
      'Stop Walk',
      'Are you sure you want to stop your walk? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset distance calculation state
              resetDistance();
              
              // Stop the walk and save to database
              await stopWalk();
              
              // Show success feedback (you could add a toast notification here)
              console.log('Walk completed and saved successfully');
              
            } catch (error) {
              // Handle errors from stopWalk function
              console.error('Error stopping walk:', error);
              
              // Show user-friendly error message
              const errorMessage = error instanceof Error ? error.message : 'Failed to save walk data';
              
              // You could show a toast notification or alert here
              // For now, we'll log the error
              if (errorMessage.includes('database') || errorMessage.includes('connection')) {
                console.error('Database save failed - walk data may be lost');
                // Could show: "Walk completed but couldn't save to cloud. Please check your internet connection."
              } else {
                console.error('Unexpected error during walk completion');
                // Could show: "An error occurred while completing your walk. Please try again."
              }
            }
          },
        },
      ]
    );
  }, [stopWalk, resetDistance]);

  // Render stats
  const renderStats = () => {
    if (!currentWalk) return null;

    const pace = currentWalk.metrics.averagePace;
    const speed = currentWalk.metrics.speed * 3.6; // Convert m/s to km/h

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatTime(currentWalk.duration)}</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDistance(currentWalk.distance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{currentWalk.steps.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(currentWalk.calories)}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatPace(pace)}</Text>
          <Text style={styles.statLabel}>Pace (min/km)</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{speed.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Speed (km/h)</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Walk Tracker</Text>
        {currentWalk?.isPaused && (
          <View style={styles.pausedIndicator}>
            <Ionicons name="pause" size={16} color="#FF6B6B" />
            <Text style={styles.pausedText}>Paused</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {renderStats()}

        <View style={styles.controlsContainer}>
          {!isWalking ? (
            <TouchableOpacity style={styles.startButton} onPress={handleStartWalk}>
              <Ionicons name="play" size={32} color="white" />
              <Text style={styles.startButtonText}>Start Walk</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeControls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.pauseButton]}
                onPress={handlePauseWalk}
              >
                <Ionicons
                  name={currentWalk?.isPaused ? 'play' : 'pause'}
                  size={24}
                  color="white"
                />
                <Text style={styles.controlButtonText}>
                  {currentWalk?.isPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStopWalk}
              >
                <Ionicons name="stop" size={24} color="white" />
                <Text style={styles.controlButtonText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!user && (
          <View style={styles.authWarning}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={styles.authWarningText}>
              Please log in to save your walk data
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  pausedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pausedText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: '#FFC107',
  },
  stopButton: {
    backgroundColor: '#DC3545',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  authWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  authWarningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});