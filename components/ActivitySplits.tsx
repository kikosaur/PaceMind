import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ActivitySplit } from '@/contexts/WalkingContext';

interface ActivitySplitsProps {
  splits: ActivitySplit[];
}

const formatPace = (paceSecondsPerKm: number): string => {
  if (paceSecondsPerKm === 0 || !isFinite(paceSecondsPerKm)) return '--:--';
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const getPaceColor = (pace: number, averagePace: number): string => {
  if (pace === 0 || !isFinite(pace)) return '#999';
  const diff = pace - averagePace;
  const threshold = averagePace * 0.1; // 10% threshold
  
  if (diff < -threshold) return '#4CAF50'; // Faster than average - green
  if (diff > threshold) return '#FF5722'; // Slower than average - red
  return '#FFC107'; // Close to average - yellow
};

export const ActivitySplits: React.FC<ActivitySplitsProps> = ({ splits }) => {
  if (splits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Splits</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Complete your first kilometer to see splits</Text>
        </View>
      </View>
    );
  }

  const averagePace = splits.reduce((sum, split) => sum + split.pace, 0) / splits.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Splits</Text>
      <ScrollView style={styles.splitsContainer} showsVerticalScrollIndicator={false}>
        {splits.map((split, index) => (
          <View key={split.kmIndex} style={styles.splitRow}>
            <View style={styles.splitInfo}>
              <Text style={styles.splitKm}>KM {split.kmIndex}</Text>
              <Text style={styles.splitTime}>{formatTime(split.duration)}</Text>
            </View>
            <View style={styles.splitPace}>
              <Text 
                style={[
                  styles.paceValue, 
                  { color: getPaceColor(split.pace, averagePace) }
                ]}
              >
                {formatPace(split.pace)}
              </Text>
              <Text style={styles.paceLabel}>min/km</Text>
            </View>
          </View>
        ))}
        
        {/* Average split */}
        <View style={[styles.splitRow, styles.averageRow]}>
          <View style={styles.splitInfo}>
            <Text style={styles.averageLabel}>Average</Text>
            <Text style={styles.splitTime}>
              {formatTime(splits.reduce((sum, split) => sum + split.duration, 0) / splits.length)}
            </Text>
          </View>
          <View style={styles.splitPace}>
            <Text style={[styles.paceValue, styles.averagePace]}>
              {formatPace(averagePace)}
            </Text>
            <Text style={styles.paceLabel}>min/km</Text>
          </View>
        </View>
      </ScrollView>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  splitsContainer: {
    maxHeight: 200,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  averageRow: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    marginTop: 8,
  },
  splitInfo: {
    flex: 1,
  },
  splitKm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  averageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFC107',
    marginBottom: 2,
  },
  splitTime: {
    fontSize: 12,
    color: '#999',
  },
  splitPace: {
    alignItems: 'flex-end',
  },
  paceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  averagePace: {
    color: '#FFC107',
  },
  paceLabel: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});