import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { useWalking } from '@/contexts/WalkingContext';
import { useWalkingSettings } from '@/contexts/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';
import { useResponsive } from '../hooks/useResponsive';
import { StatCard, Button } from '../components';

type TimeRange = 'week' | 'month' | 'year';

export default function ProgressScreen() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');
  const { weeklyStats, monthlyStats, yearlyStats, motivationTrend } = useWalking();
  const { dailyStepGoal } = useWalkingSettings();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();

  const timeRanges = [
    { key: 'week' as TimeRange, label: 'Week' },
    { key: 'month' as TimeRange, label: 'Month' },
    { key: 'year' as TimeRange, label: 'Year' },
  ];

  const getCurrentStats = () => {
    switch (selectedRange) {
      case 'week':
        return weeklyStats;
      case 'month':
        return monthlyStats;
      case 'year':
        return yearlyStats;
      default:
        return weeklyStats;
    }
  };

  const stats = getCurrentStats();

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {timeRanges.map((range) => (
        <Button
          key={range.key}
          variant={selectedRange === range.key ? 'primary' : 'outline'}
          size="sm"
          onPress={() => setSelectedRange(range.key)}
          style={styles.timeRangeButton}
        >
          {range.label}
        </Button>
      ))}
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Progress Overview</Text>
      <View style={{
        ...styles.statsGrid,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      } as ViewStyle}>
        <StatCard
          icon={<FontAwesome5 name="walking" color={Colors.primary} size={24} />}
          value={String(stats.steps)}
          label="Total Steps"
          variant="primary"
          style={{
            ...styles.statCardGrid,
            width: responsive.isSmall ? '48%' : '48%',
            marginBottom: Spacing.md,
          } as ViewStyle}
        />

        <StatCard
          icon={<Ionicons name="flag" color={Colors.success} size={24} />}
          value={stats.distance.toFixed(1)}
          label="km Walked"
          variant="success"
          style={{
            ...styles.statCardGrid,
            width: responsive.isSmall ? '48%' : '48%',
            marginBottom: Spacing.md,
          } as ViewStyle}
        />

        <StatCard
          icon={<Ionicons name="time" color={Colors.info} size={24} />}
          value={String(stats.duration)}
          label="Minutes"
          variant="default"
          style={{
            ...styles.statCardGrid,
            width: responsive.isSmall ? '48%' : '48%',
            marginBottom: Spacing.md,
          } as ViewStyle}
        />

        <StatCard
          icon={<Ionicons name="trending-up" color={Colors.warning} size={24} />}
          value={String(stats.walks)}
          label="Walks"
          variant="warning"
          style={{
            ...styles.statCardGrid,
            width: responsive.isSmall ? '48%' : '48%',
            marginBottom: Spacing.md,
          } as ViewStyle}
        />
      </View>
    </View>
  );

  const renderMotivationTrend = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Motivation Trend</Text>
      <View style={styles.trendContainer}>
        <View style={styles.trendChart}>
          {motivationTrend.map((point, index) => (
            <View key={`trend-${point.day}-${index}`} style={styles.trendPoint}>
              <View 
                style={[
                  styles.trendBar,
                  { 
                    height: `${point.value}%`,
                    backgroundColor: point.value >= 70 ? '#4CAF50' : 
                                   point.value >= 40 ? '#66BB6A' : '#2E7D32'
                  }
                ]} 
              />
              <Text style={styles.trendLabel}>{point.day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.trendLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>High (70%+)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#66BB6A' }]} />
            <Text style={styles.legendText}>Medium (40-69%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.legendText}>Low (0-39%)</Text>
          </View>
        </View>
      </View>
    </View>
  );



  const renderGoalProgress = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Weekly Goal Progress</Text>
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>Daily Steps Goal</Text>
          <Text style={styles.goalTarget}>{dailyStepGoal.toLocaleString()} steps</Text>
        </View>
        <View style={styles.goalProgress}>
          <View style={styles.goalProgressBar}>
            <View 
              style={[
                styles.goalProgressFill,
                { width: `${Math.min((stats.steps / (dailyStepGoal * 7)) * 100, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.goalProgressText}>
            {Math.round((stats.steps / (dailyStepGoal * 7)) * 100)}% of weekly goal
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerSubtitle}>Track your walking journey</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTimeRangeSelector()}
        {renderStatsCards()}
        {renderGoalProgress()}
        {renderMotivationTrend()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="flash" color="#4CAF50" size={24} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Great Progress!</Text>
              <Text style={styles.insightText as TextStyle}>
                Your motivation has increased by 15% this week. You&apos;re most active on weekdays 
                between 2-4 PM. Consider scheduling walks during this time for best results.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    margin: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    justifyContent: 'space-between',
  },
  timeRangeButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  timeRangeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeRangeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
    color: Colors.textSecondary,
  },
  timeRangeTextActive: {
    color: Colors.white,
  },
  section: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  statCardGrid: {
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  trendContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 16,
  },
  trendPoint: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  trendBar: {
    width: '80%',
    borderRadius: 2,
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 12,
    color: '#666',
  },
  trendLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },

  goalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  goalTarget: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  goalProgress: {
    gap: 8,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  goalProgressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});