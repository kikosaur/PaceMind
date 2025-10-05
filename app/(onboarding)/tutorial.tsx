import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/designSystem';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  features: string[];
  tip: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Track Your Steps',
    description: 'Monitor your daily walking activity with real-time step counting and detailed progress tracking.',
    icon: '👟',
    features: [
      'Real-time step counting',
      'Daily, weekly, and monthly views',
      'Distance and calorie tracking',
      'Activity history and trends'
    ],
    tip: 'Keep your phone with you for accurate step tracking throughout the day.'
  },
  {
    id: 2,
    title: 'Set Personal Goals',
    description: 'Create meaningful walking goals that align with your personal growth and well-being journey.',
    icon: '🎯',
    features: [
      'Customizable daily step goals',
      'Personal milestone tracking',
      'Self-reflection achievements',
      'Progress streaks and consistency'
    ],
    tip: 'Focus on progress over perfection - small consistent steps lead to lasting change.'
  },
  {
    id: 3,
    title: 'AI-Powered Insights',
    description: 'Get personalized recommendations and insights to optimize your walking routine and health.',
    icon: '🧠',
    features: [
      'Personalized walking recommendations',
      'Health insights and trends',
      'Optimal walking times suggestions',
      'Weather-based activity tips'
    ],
    tip: 'Check your insights regularly to discover patterns and improve your walking habits.'
  },
  {
    id: 4,
    title: 'Cultivate Inner Growth',
    description: 'Develop mindfulness, self-awareness, and personal resilience through your walking practice.',
    icon: '🌱',
    features: [
      'Mindful walking exercises',
      'Personal reflection prompts',
      'Mood and energy tracking',
      'Self-motivation techniques'
    ],
    tip: 'Use your walking time for self-reflection and mindfulness to enhance both physical and mental well-being.'
  }
];

const Tutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/complete');
  };

  const handleComplete = () => {
    router.push('/(onboarding)/complete');
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const currentTutorialStep = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const progressPercentage = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {tutorialSteps.length}
        </Text>
      </View>

      {/* Tutorial Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Step Indicators */}
        <View style={styles.stepIndicators}>
          {tutorialSteps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepDot,
                index === currentStep && styles.stepDotActive,
                completedSteps.includes(index) && styles.stepDotCompleted,
                index < currentStep && styles.stepDotCompleted,
              ]}
              onPress={() => goToStep(index)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.stepDotText,
                (index === currentStep || completedSteps.includes(index) || index < currentStep) && styles.stepDotTextActive
              ]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Content */}
        <View style={styles.stepContent}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{currentTutorialStep.icon}</Text>
          </View>

          {/* Title and Description */}
          <Text style={styles.title}>{currentTutorialStep.title}</Text>
          <Text style={styles.description}>{currentTutorialStep.description}</Text>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Key Features:</Text>
            <View style={styles.featuresList}>
              {currentTutorialStep.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureBulletContainer}>
                    <Text style={styles.featureBullet}>•</Text>
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tip */}
          <View style={styles.tipContainer}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipTitle}>Pro Tip</Text>
            </View>
            <Text style={styles.tipText}>{currentTutorialStep.tip}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <View style={styles.navigationButtons}>
          {currentStep > 0 ? (
            <TouchableOpacity 
              style={styles.previousButton} 
              onPress={handlePrevious}
              activeOpacity={0.7}
            >
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.previousButtonPlaceholder} />
          )}
          
          <View style={styles.navigationRight}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.nextButton} 
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  stepDotCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.secondary,
  },
  stepDotText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  stepDotTextActive: {
    color: Colors.white,
  },
  stepContent: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    ...Shadows.base,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize['3xl'],
  },
  description: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: Spacing['2xl'],
  },
  featuresTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  featuresList: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  featureBulletContainer: {
    width: 20,
    alignItems: 'center',
    marginTop: 2,
  },
  featureBullet: {
    fontSize: Typography.fontSize.lg,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  featureText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginLeft: Spacing.sm,
  },
  tipContainer: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    ...Shadows.sm,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tipIcon: {
    fontSize: Typography.fontSize.xl,
    marginRight: Spacing.sm,
  },
  tipTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  tipText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  navigation: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  previousButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previousButtonPlaceholder: {
    width: 80, // Approximate width of previous button to maintain layout
  },
  previousButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  skipButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 100,
    alignItems: 'center',
    ...Shadows.md,
  },
  nextButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default Tutorial;