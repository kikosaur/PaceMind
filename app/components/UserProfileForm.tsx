import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';

interface UserProfileFormData {
  age: string;
  dailyStepsGoal: string;
  weight: string;
  weightUnit: 'kg' | 'lbs';
  height: string;
  heightUnit: 'cm' | 'ft';
}

interface UserProfileFormProps {
  onSubmit: (data: UserProfileFormData) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({
  onSubmit,
  onSkip,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<UserProfileFormData>({
    age: '',
    dailyStepsGoal: '10000',
    weight: '',
    weightUnit: 'kg',
    height: '',
    heightUnit: 'cm',
  });

  const [errors, setErrors] = useState<Partial<UserProfileFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UserProfileFormData> = {};

    // Age validation
    const age = parseInt(formData.age);
    if (!formData.age || isNaN(age) || age < 13 || age > 120) {
      newErrors.age = 'Please enter a valid age (13-120)';
    }

    // Daily steps goal validation
    const stepsGoal = parseInt(formData.dailyStepsGoal);
    if (!formData.dailyStepsGoal || isNaN(stepsGoal) || stepsGoal < 1000 || stepsGoal > 50000) {
      newErrors.dailyStepsGoal = 'Please enter a valid steps goal (1,000-50,000)';
    }

    // Weight validation
    const weight = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weight) || weight < 20 || weight > 500) {
      newErrors.weight = formData.weightUnit === 'kg' 
        ? 'Please enter a valid weight (20-500 kg)'
        : 'Please enter a valid weight (44-1100 lbs)';
    }

    // Height validation
    const height = parseFloat(formData.height);
    if (!formData.height || isNaN(height)) {
      newErrors.height = 'Please enter a valid height';
    } else if (formData.heightUnit === 'cm' && (height < 100 || height > 250)) {
      newErrors.height = 'Please enter a valid height (100-250 cm)';
    } else if (formData.heightUnit === 'ft' && (height < 3 || height > 8)) {
      newErrors.height = 'Please enter a valid height (3-8 ft)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const updateFormData = (field: keyof UserProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getStepsRecommendation = () => {
    const steps = parseInt(formData.dailyStepsGoal);
    if (steps < 5000) return 'Beginner friendly';
    if (steps < 8000) return 'Moderate activity';
    if (steps < 12000) return 'Active lifestyle';
    return 'Highly active';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>
          Help us personalize your walking experience
        </Text>

        {/* Age Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={[styles.input, errors.age && styles.inputError]}
            value={formData.age}
            onChangeText={(value) => updateFormData('age', value)}
            placeholder="Enter your age"
            keyboardType="numeric"
            maxLength={3}
          />
          {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
        </View>

        {/* Daily Steps Goal */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Daily Steps Goal</Text>
          <TextInput
            style={[styles.input, errors.dailyStepsGoal && styles.inputError]}
            value={formData.dailyStepsGoal}
            onChangeText={(value) => updateFormData('dailyStepsGoal', value)}
            placeholder="10,000"
            keyboardType="numeric"
            maxLength={6}
          />
          <Text style={styles.recommendationText}>
            {getStepsRecommendation()}
          </Text>
          {errors.dailyStepsGoal && (
            <Text style={styles.errorText}>{errors.dailyStepsGoal}</Text>
          )}
        </View>

        {/* Weight Field with Unit Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={[
                styles.input,
                styles.inputWithUnitField,
                errors.weight && styles.inputError,
              ]}
              value={formData.weight}
              onChangeText={(value) => updateFormData('weight', value)}
              placeholder="Enter weight"
              keyboardType="decimal-pad"
            />
            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  formData.weightUnit === 'kg' && styles.unitButtonActive,
                ]}
                onPress={() => updateFormData('weightUnit', 'kg')}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    formData.weightUnit === 'kg' && styles.unitButtonTextActive,
                  ]}
                >
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  formData.weightUnit === 'lbs' && styles.unitButtonActive,
                ]}
                onPress={() => updateFormData('weightUnit', 'lbs')}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    formData.weightUnit === 'lbs' && styles.unitButtonTextActive,
                  ]}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
        </View>

        {/* Height Field with Unit Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Height</Text>
          <View style={styles.inputWithUnit}>
            <TextInput
              style={[
                styles.input,
                styles.inputWithUnitField,
                errors.height && styles.inputError,
              ]}
              value={formData.height}
              onChangeText={(value) => updateFormData('height', value)}
              placeholder={formData.heightUnit === 'cm' ? 'Enter height in cm' : 'Enter height in ft'}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  formData.heightUnit === 'cm' && styles.unitButtonActive,
                ]}
                onPress={() => updateFormData('heightUnit', 'cm')}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    formData.heightUnit === 'cm' && styles.unitButtonTextActive,
                  ]}
                >
                  cm
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  formData.heightUnit === 'ft' && styles.unitButtonActive,
                ]}
                onPress={() => updateFormData('heightUnit', 'ft')}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    formData.heightUnit === 'ft' && styles.unitButtonTextActive,
                  ]}
                >
                  ft
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWithUnitField: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    minWidth: 50,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  unitButtonTextActive: {
    color: Colors.white,
  },
  recommendationText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.xl,
    gap: Spacing.base,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  submitButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  skipButton: {
    padding: Spacing.base,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default UserProfileForm;