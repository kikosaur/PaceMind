import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';

const OnboardingComplete = () => {
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(0.8), []);

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleGetStarted = () => {
    router.replace('/(tabs)/home');
  };

  const handleViewProfile = () => {
    router.replace('/(tabs)/settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>

        {/* Celebration Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>You&apos;re All Set!</Text>
          <Text style={styles.subtitle}>
            Welcome to AmiOkiks! Your walking journey starts now.
          </Text>
          
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>What&apos;s Next?</Text>
            
            <View style={styles.nextSteps}>
              <View style={styles.nextStep}>
                <Text style={styles.nextStepIcon}>🏠</Text>
                <View style={styles.nextStepContent}>
                  <Text style={styles.nextStepTitle}>Explore Your Dashboard</Text>
                  <Text style={styles.nextStepDescription}>
                    View your daily progress and walking statistics
                  </Text>
                </View>
              </View>
              
              <View style={styles.nextStep}>
                <Text style={styles.nextStepIcon}>🎯</Text>
                <View style={styles.nextStepContent}>
                  <Text style={styles.nextStepTitle}>Start Walking</Text>
                  <Text style={styles.nextStepDescription}>
                    Begin tracking your steps and working towards your goals
                  </Text>
                </View>
              </View>
              
              <View style={styles.nextStep}>
                <Text style={styles.nextStepIcon}>📊</Text>
                <View style={styles.nextStepContent}>
                  <Text style={styles.nextStepTitle}>Track Your Progress</Text>
                  <Text style={styles.nextStepDescription}>
                    Monitor your achievements and celebrate milestones
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.primaryButtonText}>Start Walking</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewProfile}
          >
            <Text style={styles.secondaryButtonText}>View My Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            &quot;Every step counts towards a healthier you!&quot;
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing['4xl'],
  },
  successIcon: {
    width: 120,
    height: 120,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkmark: {
    fontSize: 48,
    color: Colors.white,
    fontWeight: 'bold',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  title: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
    marginBottom: Spacing['3xl'],
  },
  summaryContainer: {
    width: '100%',
  },
  summaryTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  nextSteps: {
    gap: Spacing.lg,
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nextStepIcon: {
    fontSize: Typography.fontSize.xl,
    marginRight: Spacing.base,
    width: 32,
  },
  nextStepContent: {
    flex: 1,
  },
  nextStepTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  nextStepDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  actions: {
    width: '100%',
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary,
  },
  motivationContainer: {
    paddingHorizontal: Spacing.base,
  },
  motivationText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
});

export default OnboardingComplete;