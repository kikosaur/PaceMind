import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';

const OnboardingWelcome = () => {
  const handleGetStarted = () => {
    router.push('/(onboarding)/profile-setup');
  };

  const handleSkip = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.activeStep]} />
          <View style={styles.progressStep} />
          <View style={styles.progressStep} />
        </View>
        <Text style={styles.progressText}>Step 1 of 3</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* App Icon/Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>🚶‍♂️</Text>
          </View>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Welcome to PaceMind!</Text>
          <Text style={styles.subtitle}>
            Your personal walking companion that helps you stay active, motivated, and healthy.
          </Text>
          
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Track your daily steps and progress</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Set and achieve personalized goals</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>💪</Text>
              <Text style={styles.featureText}>Get motivated with AI-powered insights</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          onPress={handleGetStarted}
          variant="primary"
          size="lg"
          style={styles.primaryButton}
        >
          Get Started
        </Button>
        
        <Button
          onPress={handleSkip}
          variant="ghost"
          size="md"
          style={styles.skipButton}
        >
          Skip for now
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  progressStep: {
    width: 60,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: BorderRadius.full,
  },
  activeStep: {
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
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
  featuresContainer: {
    gap: Spacing.lg,
    width: '100%',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  featureIcon: {
    fontSize: Typography.fontSize.xl,
    marginRight: Spacing.base,
    width: 32,
  },
  featureText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: Typography.fontWeight.medium,
  },
  actions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  primaryButton: {
    width: '100%',
  },
  skipButton: {
    width: '100%',
  },
});

export default OnboardingWelcome;