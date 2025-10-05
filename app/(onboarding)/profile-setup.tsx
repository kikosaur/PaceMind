import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import UserProfileForm from '../components/UserProfileForm';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';

interface UserProfileFormData {
  age: string;
  dailyStepsGoal: string;
  weight: string;
  weightUnit: 'kg' | 'lbs';
  height: string;
  heightUnit: 'cm' | 'ft';
}

const ProfileSetup = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileSubmit = async (formData: UserProfileFormData) => {
    setIsLoading(true);
    
    try {
      if (!supabase) {
        Alert.alert('Error', 'Database connection not available');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Please sign in to continue');
        return;
      }

      // Convert values to appropriate types for database
      const profileData = {
        age: parseInt(formData.age),
        daily_step_goal: parseInt(formData.dailyStepsGoal),
        weight: parseFloat(formData.weight),
        weight_unit: formData.weightUnit,
        height: parseFloat(formData.height),
        height_unit: formData.heightUnit,
        fitness_level: 'beginner', // Default value, can be updated later
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Profile update error:', error);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        return;
      }

      // Navigate to tutorial
      router.push('/(onboarding)/tutorial');
    } catch (error) {
      console.error('Profile setup error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup?',
      'You can always complete your profile later in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => router.push('/(onboarding)/tutorial')
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.completedStep]} />
          <View style={[styles.progressStep, styles.activeStep]} />
          <View style={styles.progressStep} />
        </View>
        <Text style={styles.progressText}>Step 2 of 3</Text>
      </View>

      {/* Form */}
      <UserProfileForm
        onSubmit={handleProfileSubmit}
        onSkip={handleSkip}
        isLoading={isLoading}
      />
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
  completedStep: {
    backgroundColor: Colors.success,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default ProfileSetup;