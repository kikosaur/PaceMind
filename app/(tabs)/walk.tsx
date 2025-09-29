import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
// Replace lucide-react-native with Expo vector icons
import { Map as MapIcon, Locate, Footprints, Target, TrendingUp, Zap, Save, Trash, Play, Pause, StopCircle } from 'lucide-react-native';
import { useWalking } from '@/contexts/WalkingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Pedometer } from 'expo-sensors';



interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

// Simple Map Placeholder Component
const MapPlaceholder = ({ 
  currentLocation, 
  routeCoordinates 
}: { 
  currentLocation: LocationCoordinate | null;
  routeCoordinates: LocationCoordinate[];
}) => {
  return (
    <View style={styles.mapPlaceholder}>
      <View style={styles.mapIcon}>
        <MapIcon color="#4CAF50" size={48} />
      </View>
      <Text style={styles.mapTitle}>Walking Map</Text>
      <Text style={styles.mapSubtitle}>
        {Platform.OS === 'web' ? 'Map view available on mobile' : 'GPS tracking active'}
      </Text>
      
      {currentLocation && (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Locate color="#4CAF50" size={20} />
            <Text style={styles.locationTitle}>Current Location</Text>
          </View>
          <Text style={styles.locationCoords}>
            {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
          {routeCoordinates.length > 0 && (
            <Text style={styles.routeInfo}>
              📍 {routeCoordinates.length} points tracked
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function WalkScreen() {
  const { 
    isWalking, 
    currentWalk, 
    startWalk, 
    pauseWalk, 
    stopWalk,
    resumeWalk,
    updateDistance,
    updateSteps,
    // New Strava-like tracking from context
    routePoints,
    splits,
    addRoutePoint,
    resetRoute,
    saveCurrentWalk,
  } = useWalking();
  const { lastCompletedWalk } = useWalking();
  
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinate | null>(null);
  // Remove local routeCoordinates in favor of context routePoints
  // const [routeCoordinates, setRouteCoordinates] = useState<LocationCoordinate[]>([]);

  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [currentPace, setCurrentPace] = useState<string>('0:00');
  

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const stepSubscriptionRef = useRef<any | null>(null);
  const lastStepCountRef = useRef<number>(0);
  const pedometerActiveRef = useRef<boolean>(false);
  const AVERAGE_STEP_LENGTH_M = 0.78; // fallback estimation when pedometer not available
  const mapRef = useRef<any | null>(null);
  const insets = useSafeAreaInsets();
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const mapInitializedRef = useRef<boolean>(false);
  const lastMapUpdateRef = useRef<number>(0);

  // Auto-open summary modal when a walk ends and we have a snapshot
  useEffect(() => {
    if (!isWalking && lastCompletedWalk) {
      setShowSummaryModal(true);
    }
  }, [isWalking, lastCompletedWalk]);

  // Derived distance from routePoints to align stats with map movement
  const routeDistanceKm = useMemo(() => {
    if (routePoints.length < 2) return 0;
    let metersTotal = 0;
    for (let i = 1; i < routePoints.length; i++) {
      metersTotal += haversineDistance(
        { latitude: routePoints[i - 1].lat, longitude: routePoints[i - 1].lon },
        { latitude: routePoints[i].lat, longitude: routePoints[i].lon }
      );
    }
    return metersTotal / 1000;
  }, [routePoints]);

  // Request location permissions on mount
  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isWalking && currentWalk && !currentWalk.isPaused) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - currentWalk.startTime) / 1000);
        setElapsedTime(elapsed);
        
        // Calculate pace (minutes per km) based on map-aligned distance
        if (routeDistanceKm > 0) {
          const paceMinutes = elapsed / 60 / routeDistanceKm;
          const minutes = Math.floor(paceMinutes);
          const seconds = Math.floor((paceMinutes - minutes) * 60);
          setCurrentPace(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setCurrentPace('0:00');
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWalking, currentWalk, routeDistanceKm]);

  // Pedometer subscription to update steps
  useEffect(() => {
    const subscribeSteps = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        pedometerActiveRef.current = false;
        console.warn('Pedometer not available on this device.');
        return;
      }

      // Request runtime permission for step counting (Android 10+ and iOS Motion & Fitness)
      try {
        const perm = await (Pedometer as any).requestPermissionAsync?.();
        if (perm && perm.status && perm.status !== 'granted') {
          pedometerActiveRef.current = false;
          console.warn('Pedometer permission not granted:', perm.status);
          Alert.alert('Motion Permission', 'Enable Motion/Fitness permission to count steps.');
          return;
        }
      } catch (err) {
        // Some platforms may not require permission; continue silently
      }

      pedometerActiveRef.current = true;
      lastStepCountRef.current = 0;
      stepSubscriptionRef.current = Pedometer.watchStepCount((result) => {
        if (isWalking && currentWalk && !currentWalk.isPaused) {
          const delta = Math.max(0, result.steps - lastStepCountRef.current);
          if (delta > 0) {
            updateSteps(delta);
            lastStepCountRef.current = result.steps;
          }
        }
      });
    };

    subscribeSteps();
    return () => {
      if (stepSubscriptionRef.current) {
        stepSubscriptionRef.current.remove();
        stepSubscriptionRef.current = null;
      }
      pedometerActiveRef.current = false;
    };
  }, [isWalking, currentWalk]);

  // Location tracking effect
  useEffect(() => {
    if (isWalking && locationPermission && !currentWalk?.isPaused) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isWalking, locationPermission, currentWalk?.isPaused]);

  // Build Leaflet HTML once; subsequent updates injected via JS APIs
  const leafletHtml = useMemo(() => {
    return buildLeafletHtmlStatic();
  }, []);

  // Request foreground permission and set initial location
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        // Enable network provider for better real-time accuracy (Android only, if available)
        if (Platform.OS === 'android' && (Location as any).enableNetworkProviderAsync) {
          try { await (Location as any).enableNetworkProviderAsync(); } catch {}
        }
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'ios' ? Location.Accuracy.BestForNavigation : Location.Accuracy.Highest,
          mayShowUserSettingsDialog: true,
        });
        const coordinate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(coordinate);
      } else {
        Alert.alert(
          'Location Permission',
          'Location access is required to track your walking route.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Platform.OS === 'ios' ? Location.Accuracy.BestForNavigation : Location.Accuracy.Highest,
          timeInterval: 1000, // Update every 1 second
          distanceInterval: 0.75, // finer route updates, filtered below
        },
        (location) => {
          const coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setCurrentLocation(coordinate);

          // Compute incremental distance from last point to current
          const last = routePoints[routePoints.length - 1];
          const nowTs = Date.now();
          if (last) {
            const meters = haversineDistance({ latitude: last.lat, longitude: last.lon }, coordinate);
            const dtSec = Math.max(0.1, (nowTs - (last.timestamp || nowTs)) / 1000);
            const speed = meters / dtSec; // m/s
            // Filter: reject tiny jitter and unrealistic jumps (> 2.5 m/s typical fast walk)
            if (meters >= 0.6 && speed <= 2.5) {
              updateDistance(meters);

              // Fallback step estimation if pedometer is not active/available
              if (!pedometerActiveRef.current && isWalking && currentWalk && !currentWalk.isPaused) {
                const estimatedSteps = Math.round(meters / AVERAGE_STEP_LENGTH_M);
                if (estimatedSteps > 0) {
                  updateSteps(estimatedSteps);
                }
              }

              const point = { lat: coordinate.latitude, lon: coordinate.longitude, timestamp: nowTs };
              addRoutePoint(point);

              // Push incremental updates to WebView with throttle
              if (mapInitializedRef.current && Date.now() - lastMapUpdateRef.current >= 500) {
                const js = `
                  try {
                    if (window.addPoint) { window.addPoint([${coordinate.latitude}, ${coordinate.longitude}]); }
                    if (window.updateLocation) { window.updateLocation([${coordinate.latitude}, ${coordinate.longitude}]); }
                  } catch (e) {}
                  true;
                `;
                mapRef.current?.injectJavaScript(js);
                lastMapUpdateRef.current = Date.now();
              }
            }
          } else {
            // First point
            const point = { lat: coordinate.latitude, lon: coordinate.longitude, timestamp: nowTs };
            addRoutePoint(point);
            if (mapInitializedRef.current) {
              const js = `
                try {
                  if (window.setRoutePoints) { window.setRoutePoints([[${coordinate.latitude}, ${coordinate.longitude}]]); }
                  if (window.updateLocation) { window.updateLocation([${coordinate.latitude}, ${coordinate.longitude}]); }
                } catch (e) {}
                true;
              `;
              mapRef.current?.injectJavaScript(js);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPaceFrom = (durationSec: number, distanceKm: number) => {
    if (!distanceKm || distanceKm <= 0) return '0:00';
    const paceMin = (durationSec / 60) / distanceKm;
    const min = Math.floor(paceMin);
    const sec = Math.floor((paceMin - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStartWalk = () => {
    if (!locationPermission) {
      Alert.alert(
        'Location Required',
        'Please enable location access to start tracking your walk.',
        [{ text: 'OK' }]
      );
      return;
    }
    // Route is reset by startWalk; no need to clear locally
    startWalk();
  };

  const handlePauseWalk = () => {
    pauseWalk();
  };

  const handleResumeWalk = () => {
    resumeWalk();
  };

  const handleStopWalk = () => {
    Alert.alert(
      'End Walk',
      'Are you sure you want to end this walk?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Walk', 
          style: 'destructive',
          onPress: () => {
            console.log('Ending walk...');
            // Do not clear route here; allow user to Save/Discard after stop
            stopWalk();
          }
        }
      ]
    );
  };

  const handleSaveSummary = async () => {
    if (!lastCompletedWalk) return;
    try {
      setSaving(true);
      const ok = await saveCurrentWalk();
      if (ok) {
        Alert.alert('Saved', 'Your walk has been saved successfully.');
        setShowSummaryModal(false);
      } else {
        Alert.alert('Save failed', 'Could not save your walk. Please try again.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardSummary = () => {
    setShowSummaryModal(false);
    resetRoute();
  };



  return (
    <View style={styles.container}>
      {/* Map Area */}
      {Platform.OS === 'web' ? (
        <MapPlaceholder 
          currentLocation={currentLocation}
          // routeCoordinates replaced with context points
          routeCoordinates={routePoints.map((p) => ({ latitude: p.lat, longitude: p.lon }))}
        />
      ) : (
        <WebView
          ref={mapRef}
          style={styles.map}
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          onLoadEnd={() => {
            // Initialize map with existing points without re-rendering WebView
            mapInitializedRef.current = true;
            const pts = routePoints.map(p => `[${p.lat}, ${p.lon}]`).join(',');
            const initJs = `
              try {
                if (window.setRoutePoints) { window.setRoutePoints([${pts}]); }
                ${currentLocation ? `if (window.updateLocation) { window.updateLocation([${currentLocation.latitude}, ${currentLocation.longitude}]); }` : ''}
              } catch (e) { console.log('init map error', e); }
              true;
            `;
            // Inject initial route and marker
            mapRef.current?.injectJavaScript(initJs);
          }}
        />
      )}

      {/* Bottom Container with Stats and Controls */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* Status Data */}
        <View style={styles.statsContainer}>
          <Text style={styles.statusTitle}>
            {isWalking ? (currentWalk?.isPaused ? 'Paused' : 'Walking') : 'Ready to Walk'}
          </Text>
          
          {/* Main Time Display */}
          <Text style={styles.mainTime}>{formatTime(elapsedTime)}</Text>
          
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Footprints color="#4CAF50" size={20} />
              <Text style={styles.statValue}>
                {String(currentWalk?.steps ?? 0)}
              </Text>
              <Text style={styles.statLabel}>Steps</Text>
            </View>
            <View style={styles.statItem}>
              <Target color="#2196F3" size={20} />
              <Text style={styles.statValue}>
                {routeDistanceKm.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Distance (km)</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp color="#FF9800" size={20} />
              <Text style={styles.statValue}>
                {Math.round(routeDistanceKm * 60)}
              </Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Zap color="#9C27B0" size={20} />
              <Text style={styles.statValue}>{currentPace}</Text>
              <Text style={styles.statLabel}>Pace (/km)</Text>
            </View>
          </View>

          {/* Splits */}
          {splits.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>Splits</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {splits.map((s) => (
                  <View key={s.kmIndex} style={{ backgroundColor: '#f1f3f5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text style={{ color: '#333', fontWeight: '600' }}>KM {s.kmIndex}</Text>
                    <Text style={{ color: '#666' }}>{formatTime(s.durationSec)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {!isWalking ? (
            routePoints.length > 1 ? (
              // Show Save/Discard when a completed route exists
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: '#2196F3' }]}
                  onPress={saveCurrentWalk}
                >
                  <Save color="white" size={24} />
                  <Text style={styles.startButtonText}>Save Walk</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: '#9E9E9E' }]}
                  onPress={resetRoute}
                >
                  <Trash color="white" size={24} />
                  <Text style={styles.startButtonText}>Discard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.startButton, styles.startActivityButton]}
                onPress={handleStartWalk}
              >
                <Play color="white" size={28} />
                <Text style={styles.startButtonText}>Start Activity</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.walkingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={currentWalk?.isPaused ? handleResumeWalk : handlePauseWalk}
              >
                {currentWalk?.isPaused ? (
                  <Play color="white" size={24} />
                ) : (
                  <Pause color="white" size={24} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStopWalk}
              >
                <StopCircle color="white" size={24} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Permission Warning */}
      {!locationPermission && (
        <View style={[styles.permissionWarning, { top: insets.top + 20 }]}> 
          <Text style={styles.permissionText}> 
            Location access required for route tracking 
          </Text> 
          <TouchableOpacity  
            style={styles.permissionButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.permissionButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Post-walk Summary Modal */}
      <Modal
        visible={showSummaryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' }}>
          <View style={styles.summarySheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Activity Summary</Text>

            {lastCompletedWalk ? (
              <View>
                {/* Stats grid styled like the screen card */}
                <View style={styles.sheetStatRow}>
                  <View style={styles.sheetStatItem}>
                    <Text style={styles.sheetStatLabel}>Time</Text>
                    <Text style={styles.sheetStatValue}>{formatTime(lastCompletedWalk.durationSec)}</Text>
                  </View>
                  <View style={styles.sheetStatItem}>
                    <Text style={styles.sheetStatLabel}>Distance</Text>
                    <Text style={styles.sheetStatValue}>{lastCompletedWalk.distanceKm.toFixed(2)} km</Text>
                  </View>
                </View>
                <View style={styles.sheetStatRow}>
                  <View style={styles.sheetStatItem}>
                    <Text style={styles.sheetStatLabel}>Steps</Text>
                    <Text style={styles.sheetStatValue}>{String(lastCompletedWalk.steps)}</Text>
                  </View>
                  <View style={styles.sheetStatItem}>
                    <Text style={styles.sheetStatLabel}>Calories</Text>
                    <Text style={styles.sheetStatValue}>{Math.round(lastCompletedWalk.calories)} kcal</Text>
                  </View>
                </View>
                <View style={styles.sheetStatRow}>
                  <View style={styles.sheetStatItem}>
                    <Text style={styles.sheetStatLabel}>Pace</Text>
                    <Text style={styles.sheetStatValue}>{formatPaceFrom(lastCompletedWalk.durationSec, lastCompletedWalk.distanceKm)} /km</Text>
                  </View>
                  <View style={[styles.sheetStatItem, { opacity: 0 }]}>
                    <Text style={styles.sheetStatLabel}> </Text>
                    <Text style={styles.sheetStatValue}> </Text>
                  </View>
                </View>

                <View style={styles.sheetDivider} />

                {/* Actions */}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={[styles.primaryAction, { opacity: saving ? 0.8 : 1 }]}
                    onPress={handleSaveSummary}
                    disabled={saving}
                  >
                    <Save color="white" size={22} />
                    <Text style={styles.primaryActionText}>{saving ? 'Saving...' : 'Save Activity'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={handleDiscardSummary}
                  >
                    <Trash color="#2E7D32" size={22} />
                    <Text style={styles.secondaryActionText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ textAlign:'center', color:'#666' }}>No summary available.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  mapIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationCoords: {
    fontSize: 14,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  routeInfo: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  bottomContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  mainTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startActivityButton: {
    alignSelf: 'center',
    width: '90%',
    marginTop: -20,
    marginBottom: 0,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  walkingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  permissionWarning: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  permissionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  permissionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  summarySheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  sheetStatRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sheetStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sheetStatLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  sheetStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  sheetActions: {
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Haversine distance in meters between two coordinates
const haversineDistance = (a: LocationCoordinate, b: LocationCoordinate) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon),
    Math.sqrt(1 - (sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon))
  );
  return R * c;
};

// Static Leaflet HTML with JS APIs for incremental updates from React Native
const buildLeafletHtmlStatic = () => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #f8f9fa; }
    /* Hide watermark/attribution */
    .leaflet-control-attribution, .leaflet-control-logo { display: none !important; }
    .leaflet-touch .leaflet-bar a { color: #333; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true, attributionControl: false });
    // Default view
    map.setView([0, 0], 2);

    // Light theme tile layer (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    let routePoints = [];
    let polyline = null;
    let locationMarker = null;

    function rebuildPolyline() {
      if (polyline) {
        try { map.removeLayer(polyline); } catch (e) {}
        polyline = null;
      }
      if (routePoints.length > 1) {
        polyline = L.polyline(routePoints, { color: '#2E7D32', weight: 5 }).addTo(map);
        try {
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } catch (e) {}
      } else if (routePoints.length === 1) {
        map.setView(routePoints[0], 16);
      }
    }

    // Set all points at once (used on WebView load)
    window.setRoutePoints = function(points) {
      routePoints = points;
      rebuildPolyline();
    };

    // Add a single point incrementally
    window.addPoint = function(point) {
      routePoints.push(point);
      if (polyline && polyline.addLatLng) {
        try { polyline.addLatLng(point); } catch (e) { rebuildPolyline(); }
      } else {
        rebuildPolyline();
      }
    };

    // Update current location marker without changing the route
    window.updateLocation = function(point) {
      if (!locationMarker) {
        locationMarker = L.circleMarker(point, { radius: 8, color: '#FFFFFF', weight: 3, fillColor: '#2E7D32', fillOpacity: 1 }).addTo(map);
      } else {
        locationMarker.setLatLng(point);
      }
    };
  </script>
</body>
</html>`;
};