import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityMetrics as ActivityMetricsType } from '../contexts/WalkingContext';

interface ActivityMetricsProps {
  metrics: ActivityMetricsType;
  isActive: boolean;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatPace = (paceSecondsPerKm: number): string => {
  if (paceSecondsPerKm === 0 || !isFinite(paceSecondsPerKm)) return '--:--';
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};

const formatSpeed = (metersPerSecond: number): string => {
  const kmh = metersPerSecond * 3.6;
  return `${kmh.toFixed(1)} km/h`;
};

export const ActivityMetrics: React.FC<ActivityMetricsProps> = ({ metrics, isActive }) => {
  return (
    <View style={styles.container}>
      {/* Active indicator */}
      <View style={[styles.statusIndicator, isActive && styles.activeIndicator]}>
        <View style={[styles.statusDot, isActive && styles.activeDot]} />
        <Text style={[styles.statusText, isActive && styles.activeStatusText]}>
          {isActive ? 'WALKING ACTIVE' : 'PAUSED'}
        </Text>
      </View>

      {/* Primary metrics */}
      <View style={styles.primaryMetrics}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatDistance(metrics.distance)}</Text>
          <Text style={styles.metricLabel}>Distance</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatTime(metrics.duration)}</Text>
          <Text style={styles.metricLabel}>Duration</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatPace(metrics.pace)}</Text>
          <Text style={styles.metricLabel}>Current Pace</Text>
        </View>
      </View>

      {/* Secondary metrics */}
      <View style={styles.secondaryMetrics}>
        <View style={styles.smallMetric}>
          <Text style={styles.smallMetricValue}>{formatPace(metrics.averagePace)}</Text>
          <Text style={styles.smallMetricLabel}>Avg Pace</Text>
        </View>
        
        <View style={styles.smallMetric}>
          <Text style={styles.smallMetricValue}>{formatSpeed(metrics.speed)}</Text>
          <Text style={styles.smallMetricLabel}>Speed</Text>
        </View>
        
        <View style={styles.smallMetric}>
          <Text style={styles.smallMetricValue}>{Math.round(metrics.calories)}</Text>
          <Text style={styles.smallMetricLabel}>Calories</Text>
        </View>
        
        <View style={styles.smallMetric}>
          <Text style={styles.smallMetricValue}>{Math.round(metrics.elevation.current)}m</Text>
          <Text style={styles.smallMetricLabel}>Elevation</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  activeIndicator: {
    backgroundColor: '#2d5a2d',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 8,
  },
  activeDot: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
  },
  activeStatusText: {
    color: '#4CAF50',
  },
  primaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    backgroundColor: '#252525',
    borderRadius: 8,
  },
  smallMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  smallMetricLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});