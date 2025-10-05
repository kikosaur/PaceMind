import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWalking } from '@/contexts/WalkingContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';
import { useResponsive } from '../hooks/useResponsive';
import { StatCard, Button, Card } from '../components';
import { AIInsightsContentGenerator, AIInsightContent, InsightGenerationContext } from '../../services/ai-insights-content-generator';
import { MotivationService } from '../../lib/motivation-service';

export default function HomeScreen() {
  const { user } = useAuth();
  const { 
    todayStats, 
    lastCompletedWalk, 
    journalEntries,
    motivationTrendData,
    motivationLevel
  } = useWalking();
  const [greeting, setGreeting] = useState('');
  const [aiInsight, setAiInsight] = useState<AIInsightContent | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();

  // Initialize AI insights generator and motivation service with useMemo
  const insightsGenerator = useMemo(() => new AIInsightsContentGenerator(), []);
  const motivationService = useMemo(() => new MotivationService(), []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Generate AI insights for home screen
  const generateAIInsights = useCallback(async () => {
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

      const insight = await insightsGenerator.generateHomeInsights(context);
      setAiInsight(insight);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Set fallback insight
      setAiInsight({
        id: 'fallback-home',
        title: 'Welcome Back!',
        content: 'Ready to take on today\'s walking challenge? Every step counts towards your health goals.',
        icon: 'sunny',
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
    generateAIInsights();
  }, [generateAIInsights]);

  const safeMotivation = typeof motivationLevel === 'number' ? motivationLevel : 0;
  
  const getMotivationMessage = () => {
    if (safeMotivation >= 80) return "You're crushing it! 🔥";
    if (safeMotivation >= 60) return "Keep up the good work! 💪";
    return "Let's get moving today! 🚶‍♂️";
  };

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Walker')}</Text>
            </View>
            <View style={styles.weatherContainer}>
              <Ionicons name="sunny" color="#4CAF50" size={24} />
              <Text style={styles.weatherText}>22°C</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Progress</Text>
          <View style={{
            ...styles.statsGrid,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          } as ViewStyle}>
            <StatCard
              icon={<FontAwesome5 name="walking" color={Colors.primary} size={24} />}
              value={String(todayStats?.steps ?? 0)}
              label="Steps"
              variant="primary"
              style={{
                ...styles.statCardGrid,
                width: responsive.isSmall ? '48%' : '48%',
                marginBottom: Spacing.md,
              } as ViewStyle}
            />

            <StatCard
              icon={<Ionicons name="flag" color={Colors.success} size={24} />}
              value={Number(todayStats?.distance ?? 0).toFixed(1)}
              label="Kilometers"
              variant="success"
              style={{
                ...styles.statCardGrid,
                width: responsive.isSmall ? '48%' : '48%',
                marginBottom: Spacing.md,
              } as ViewStyle}
            />

            <StatCard
              icon={<Ionicons name="flash" color={Colors.warning} size={24} />}
              value={String(todayStats?.calories ?? 0)}
              label="Calories"
              variant="warning"
              style={{
                ...styles.statCardGrid,
                width: responsive.isSmall ? '48%' : '48%',
                marginBottom: Spacing.md,
              } as ViewStyle}
            />

            <StatCard
              icon={<Ionicons name="time" color={Colors.info} size={24} />}
              value={Math.round(todayStats?.duration ?? 0).toString()}
              label="Active Minutes"
              style={{
                ...styles.statCardGrid,
                width: responsive.isSmall ? '48%' : '48%',
                marginBottom: Spacing.md,
              } as ViewStyle}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            {isLoadingInsight ? (
              <ActivityIndicator color="#4CAF50" size="small" />
            ) : (
              <Ionicons 
                name={aiInsight?.icon as any || "flash"} 
                color="#4CAF50" 
                size={24} 
              />
            )}
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>
                {isLoadingInsight ? 'Generating insights...' : (aiInsight?.title || 'AI Insights')}
              </Text>
              <Text style={styles.insightText as TextStyle}>
                {isLoadingInsight 
                  ? 'Analyzing your walking patterns and motivation trends...'
                  : (aiInsight?.content || 'Your personalized insights will appear here.')
                }
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivation Level</Text>
          <Card variant="default" padding="lg">
            <View style={styles.motivationHeader}>
              <Text style={{
                ...styles.motivationLevel,
                color: Colors.primary
              } as TextStyle}>
                {motivationLevel}%
              </Text>
              <Ionicons name="trending-up" color={Colors.primary} size={24} />
            </View>
            <Text style={styles.motivationMessage}>
              {getMotivationMessage()}
            </Text>
            <View style={{
              ...styles.motivationBar,
              backgroundColor: Colors.gray200
            } as ViewStyle}>
              <View 
                style={{
                  ...styles.motivationFill,
                  width: `${motivationLevel}%`,
                  backgroundColor: Colors.primary 
                } as ViewStyle}
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <Button 
            variant="primary"
            size="lg"
            icon={<Ionicons name="play" color="white" size={24} />}
            onPress={() => router.push('/(tabs)/walk')}
            style={{
              ...styles.actionButton,
              marginBottom: Spacing.md,
            } as ViewStyle}
          >
            Start Walking
          </Button>

          <Button 
            variant="outline"
            size="md"
            onPress={() => router.push('/(tabs)/journal')}
            style={{
              ...styles.secondaryActionButton,
              marginBottom: Spacing.md,
            } as ViewStyle}
          >
            Log Mood
          </Button>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
  } as TextStyle,
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weatherText: {
    color: Colors.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: '500',
  } as TextStyle,
  section: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  } as TextStyle,
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
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  motivationLevel: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
  } as TextStyle,
  motivationMessage: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  motivationBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.sm,
  },
  motivationFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  actionButton: {
    marginBottom: Spacing.md,
  },
  secondaryActionButton: {
    marginBottom: Spacing.md,
  },
  insightText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
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
});