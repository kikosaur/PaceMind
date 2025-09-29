import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalking } from '@/contexts/WalkingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Footprints, Target, TrendingUp, Award, Zap } from 'lucide-react-native';

type TimeRange = 'week' | 'month' | 'year';

export default function ProgressScreen() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');
  const { weeklyStats, monthlyStats, achievements, motivationTrend } = useWalking();
  const insets = useSafeAreaInsets();

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
        return { steps: 45000, distance: 32.5, duration: 420, walks: 28 };
      default:
        return weeklyStats;
    }
  };

  const stats = getCurrentStats();

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {timeRanges.map((range) => (
        <TouchableOpacity
          key={range.key}
          style={[
            styles.timeRangeButton,
            selectedRange === range.key && styles.timeRangeButtonActive
          ]}
          onPress={() => setSelectedRange(range.key)}
        >
          <Text style={[
            styles.timeRangeText,
            selectedRange === range.key && styles.timeRangeTextActive
          ]}>
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Footprints color="#4CAF50" size={24} />
          </View>
          <Text style={styles.statValue}>{String(stats.steps)}</Text>
          <Text style={styles.statLabel}>Total Steps</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Target color="#2196F3" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.distance.toFixed(1)}</Text>
          <Text style={styles.statLabel}>km Walked</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Target color="#FF9800" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.duration}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp color="#9C27B0" size={24} />
          </View>
          <Text style={styles.statValue}>{stats.walks}</Text>
          <Text style={styles.statLabel}>Walks</Text>
        </View>
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
                                   point.value >= 40 ? '#FF9800' : '#F44336'
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
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Medium (40-69%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Low (0-39%)</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Achievements</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.achievementsContainer}>
          {achievements.map((achievement, index) => (
            <View key={`achievement-${achievement.title}-${index}`} style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
                <Award color="white" size={24} />
              </View>
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDescription}>{achievement.description}</Text>
              <Text style={styles.achievementDate}>
                {new Date(achievement.date).toDateString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderGoalProgress = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Weekly Goal Progress</Text>
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>Daily Steps Goal</Text>
          <Text style={styles.goalTarget}>10,000 steps</Text>
        </View>
        <View style={styles.goalProgress}>
          <View style={styles.goalProgressBar}>
            <View 
              style={[
                styles.goalProgressFill,
                { width: `${Math.min((stats.steps / 70000) * 100, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.goalProgressText}>
            {Math.round((stats.steps / 70000) * 100)}% of weekly goal
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerSubtitle}>Track your walking journey</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTimeRangeSelector()}
        {renderStatsCards()}
        {renderGoalProgress()}
        {renderMotivationTrend()}
        {renderAchievements()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            <Zap color="#4CAF50" size={24} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Great Progress!</Text>
              <Text style={styles.insightText}>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeRangeTextActive: {
    color: 'white',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsContainer: {
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  achievementsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 20,
  },
  achievementCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDate: {
    fontSize: 10,
    color: '#999',
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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