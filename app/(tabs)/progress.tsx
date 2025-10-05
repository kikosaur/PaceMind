import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextStyle,
  ViewStyle,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useWalking } from '@/contexts/WalkingContext';
import { useWalkingSettings } from '@/contexts/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';
import { useResponsive } from '../hooks/useResponsive';
import { StatCard, Button } from '../components';
import { AIInsightsContentGenerator, AIInsightContent, InsightGenerationContext } from '../../services/ai-insights-content-generator';
import { MotivationService } from '../../lib/motivation-service';

type TimeRange = 'week' | 'month' | 'year';

export default function ProgressScreen() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');
  const [aiInsight, setAiInsight] = useState<AIInsightContent | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const { user } = useAuth();
  const { 
    weeklyStats, 
    monthlyStats, 
    yearlyStats, 
    lastCompletedWalk,
    todayStats,
    journalEntries,
    motivationTrendData,
    motivationTrend,
    motivationTrendLoading,
    motivationTrendError,
    refreshMotivationTrend
  } = useWalking();
  const { dailyStepGoal } = useWalkingSettings();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();

  // Initialize AI insights generator and motivation service with useMemo
  const insightsGenerator = useMemo(() => new AIInsightsContentGenerator(), []);
  const motivationService = useMemo(() => new MotivationService(), []);

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

  // Generate AI insights for progress screen
  const generateProgressInsights = useCallback(async () => {
    if (!todayStats) return;
    
    setIsLoadingInsight(true);
    try {
      const hour = new Date().getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17) timeOfDay = 'evening';

      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

      // Get motivation data if available
      let motivationData;
      try {
        if (lastCompletedWalk) {
          // Convert CompletedWalk to database WalkingSession format for motivation service
          const sessionForMotivation = {
            id: 'temp-' + Date.now(),
            user_id: user?.id || 'unknown',
            created_at: new Date(lastCompletedWalk.startTime).toISOString(),
            start_time: new Date(lastCompletedWalk.startTime).toISOString(),
            end_time: new Date(lastCompletedWalk.endTime).toISOString(),
            duration: lastCompletedWalk.durationSec,
            steps: lastCompletedWalk.steps,
            distance: lastCompletedWalk.distanceKm,
            calories_burned: lastCompletedWalk.calories,
            status: 'completed' as const
          };
          
          motivationData = await motivationService.predictMotivation(
            sessionForMotivation,
            journalEntries || [],
            todayStats
          );
        }
      } catch (error) {
        console.log('Could not fetch motivation data:', error);
      }

      const context: InsightGenerationContext = {
        recentSessions: lastCompletedWalk ? [{
          startTime: lastCompletedWalk.startTime,
          duration: lastCompletedWalk.durationSec,
          distance: lastCompletedWalk.distanceKm,
          steps: lastCompletedWalk.steps,
          calories: lastCompletedWalk.calories,
          isPaused: false,
          metrics: {
            averagePace: lastCompletedWalk.durationSec / 60 / lastCompletedWalk.distanceKm,
            speed: lastCompletedWalk.distanceKm * 1000 / lastCompletedWalk.durationSec
          }
        }] : [],
        basicStats: todayStats,
        motivationData,
        motivationTrends: motivationTrendData || undefined,
        journalEntries: journalEntries || [],
        timeOfDay,
        dayOfWeek,
        isWeekend
      };

      const insight = await insightsGenerator.generateProgressInsights(context);
      setAiInsight(insight);
    } catch (error) {
      console.error('Error generating progress insights:', error);
      // Set fallback insight
      setAiInsight({
        id: 'fallback-progress',
        title: 'Your Journey Continues',
        content: 'Track your progress and celebrate every milestone on your path to better health.',
        icon: 'trending-up',
        priority: 'medium',
        type: 'motivation',
        timestamp: Date.now(),
        confidence: 0.5
      });
    } finally {
      setIsLoadingInsight(false);
    }
  }, [todayStats, lastCompletedWalk, journalEntries, motivationTrendData, insightsGenerator, motivationService, user]);

  useEffect(() => {
    generateProgressInsights();
  }, [generateProgressInsights, selectedRange]); // Regenerate when time range changes

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {timeRanges.map((range: { key: TimeRange; label: string }) => (
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
      <View style={styles.trendHeader}>
        <Text style={styles.sectionTitle}>Motivation Trend</Text>
        <TouchableOpacity 
          onPress={refreshMotivationTrend}
          style={styles.refreshButton}
          disabled={motivationTrendLoading}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={motivationTrendLoading ? Colors.textSecondary : Colors.primary} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.trendContainer}>
        {motivationTrendLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading motivation trends...</Text>
          </View>
        ) : motivationTrendError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
            <Text style={styles.errorTitle}>Unable to Load Trends</Text>
            <Text style={styles.errorText}>
              {motivationTrendError.includes('offline') 
                ? 'You appear to be offline. Showing cached data when available.'
                : 'There was an issue loading your motivation trends. Please try again.'}
            </Text>
            <TouchableOpacity 
              onPress={refreshMotivationTrend}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : motivationTrend.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Trend Data</Text>
            <Text style={styles.emptyText}>
              Start logging your walks and journal entries to see your motivation trends.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.trendChart}>
              {motivationTrend.map((point: { day: string; value: number; prediction?: 'high' | 'low'; confidence?: number }, index: number) => (
                <View key={`trend-${point.day}-${index}`} style={styles.trendPoint}>
                  <View 
                    style={[
                      styles.trendBar,
                      { 
                        height: `${Math.max(point.value, 5)}%`,
                        backgroundColor: point.value >= 70 ? '#4CAF50' : 
                                       point.value >= 40 ? '#66BB6A' : '#2E7D32'
                      }
                    ]} 
                  />
                  <Text style={styles.trendLabel}>{point.day}</Text>
                  <Text style={styles.trendValue}>{Math.round(point.value)}%</Text>
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
            <View style={styles.trendSummary}>
              <Text style={styles.summaryText}>
                Average: {Math.round(motivationTrend.reduce((sum: number, point: { day: string; value: number; prediction?: 'high' | 'low'; confidence?: number }) => sum + point.value, 0) / motivationTrend.length)}%
              </Text>
              <Text style={styles.summaryText}>
                Trend: {motivationTrend.length > 1 && motivationTrend[motivationTrend.length - 1].value > motivationTrend[0].value ? '📈 Improving' : '📊 Stable'}
              </Text>
            </View>
          </>
        )}
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
            {isLoadingInsight ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Ionicons 
                name={aiInsight?.icon as any || "flash"} 
                color="#4CAF50" 
                size={24} 
              />
            )}
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>
                {isLoadingInsight ? 'Analyzing your progress...' : (aiInsight?.title || 'AI Insights')}
              </Text>
              <Text style={styles.insightText as TextStyle}>
                {isLoadingInsight 
                  ? 'Generating personalized insights based on your walking patterns...'
                  : (aiInsight?.content || 'Your personalized insights will appear here.')
                }
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
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.error,
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  trendValue: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
    marginTop: 2,
  },
  trendSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  summaryText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
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