import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useWalking } from '@/contexts/WalkingContext';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Footprints, Target, TrendingUp, Award, Play, Sun } from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuth();
  const { todayStats, weeklyGoal, motivationLevel } = useWalking();
  const [greeting, setGreeting] = useState('');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const progressPercentage = weeklyGoal?.dailySteps
    ? ((todayStats?.steps ?? 0) / weeklyGoal.dailySteps) * 100
    : 0;

  const safeMotivation = typeof motivationLevel === 'number' ? motivationLevel : 0;
  
  const getMotivationColor = () => {
    if (safeMotivation >= 80) return '#4CAF50';
    if (safeMotivation >= 60) return '#FF9800';
    return '#F44336';
  };
  
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
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Walker')}</Text>
            </View>
            <View style={styles.weatherContainer}>
              <Sun color="white" size={24} />
              <Text style={styles.weatherText}>22°C</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today&apos;s Progress</Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { width: (width - 52) / 2 }]}>
              <View style={styles.statIcon}>
                <Footprints color="#4CAF50" size={24} />
              </View>
              <Text style={styles.statValue}>{String(todayStats.steps)}</Text>
              <Text style={styles.statLabel}>Steps</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(progressPercentage, 100)}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={[styles.statCard, { width: (width - 52) / 2 }]}>
              <View style={styles.statIcon}>
                <Target color="#2196F3" size={24} />
              </View>
              <Text style={styles.statValue}>{Number(todayStats?.distance ?? 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>

            <View style={[styles.statCard, { width: (width - 52) / 2 }]}>
              <View style={styles.statIcon}>
                <Target color="#FF9800" size={24} />
              </View>
              <Text style={styles.statValue}>{String(todayStats?.duration ?? 0)}</Text>
              <Text style={styles.statLabel}>minutes</Text>
            </View>

            <View style={[styles.statCard, { width: (width - 52) / 2 }]}>
              <View style={styles.statIcon}>
                <TrendingUp color="#9C27B0" size={24} />
              </View>
              <Text style={styles.statValue}>{String(todayStats?.calories ?? 0)}</Text>
              <Text style={styles.statLabel}>calories</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Motivation Level</Text>
          <View style={styles.motivationCard}>
            <View style={styles.motivationHeader}>
              <Award color={getMotivationColor()} size={24} />
              <Text style={[styles.motivationLevel, { color: getMotivationColor() }]}>
                {safeMotivation}%
              </Text>
            </View>
            <Text style={styles.motivationMessage}>{getMotivationMessage()}</Text>
            <View style={styles.motivationBar}>
              <View 
                style={[
                  styles.motivationFill, 
                  { 
                    width: `${safeMotivation}%`,
                    backgroundColor: getMotivationColor()
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/walk')}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.actionButtonGradient}
            >
              <Play color="white" size={24} />
              <Text style={styles.actionButtonText}>Start Walking</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryActionButton}
            onPress={() => router.push('/(tabs)/journal')}
          >
            <Text style={styles.secondaryActionText}>Log Mood</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              Based on your recent activity, I recommend a 15-minute walk around your neighborhood. 
              The weather is perfect, and you tend to feel more motivated in the afternoon! 🌟
            </Text>
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 8,
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
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  motivationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  motivationLevel: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  motivationMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  motivationBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
  },
  motivationFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionButton: {
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  secondaryActionText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  insightText: {
    fontSize: 16,
    color: '#2E7D32',
    lineHeight: 24,
  },
});