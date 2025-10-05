import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '@/contexts/AuthContext';
import { DatabaseService, Profile } from '@/lib/database';

interface UserProfileFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Partial<Profile>;
  mode?: 'create' | 'edit';
}

interface FormData {
  full_name: string;
  age: string;
  weight: string;
  height: string;
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | '';
  daily_step_goal: string;
  weight_unit: 'kg' | 'lbs';
  height_unit: 'cm' | 'ft';
}

interface FormErrors {
  full_name?: string;
  age?: string;
  weight?: string;
  height?: string;
  fitness_level?: string;
  daily_step_goal?: string;
}

export default function UserProfileForm({
  visible,
  onClose,
  onSuccess,
  initialData,
  mode = 'create'
}: UserProfileFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    age: '',
    weight: '',
    height: '',
    fitness_level: '',
    daily_step_goal: '10000',
    weight_unit: 'kg',
    height_unit: 'cm',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (visible && initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        age: initialData.age?.toString() || '',
        weight: initialData.weight?.toString() || '',
        height: initialData.height?.toString() || '',
        fitness_level: initialData.fitness_level || '',
        daily_step_goal: initialData.daily_step_goal?.toString() || '10000',
        weight_unit: initialData.weight_unit || 'kg',
        height_unit: initialData.height_unit || 'cm',
      });
    } else if (visible && mode === 'create') {
      // Reset form for create mode
      setFormData({
        full_name: '',
        age: '',
        weight: '',
        height: '',
        fitness_level: '',
        daily_step_goal: '10000',
        weight_unit: 'kg',
        height_unit: 'cm',
      });
    }
    setErrors({});
  }, [visible, initialData, mode]);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }

    // Age validation
    if (formData.age) {
      const age = parseInt(formData.age, 10);
      if (isNaN(age) || age < 13 || age > 120) {
        newErrors.age = 'Age must be between 13 and 120 years';
      }
    }

    // Weight validation
    if (formData.weight) {
      const weight = parseFloat(formData.weight);
      if (formData.weight_unit === 'kg') {
        if (isNaN(weight) || weight < 30 || weight > 300) {
          newErrors.weight = 'Weight must be between 30 and 300 kg';
        }
      } else {
        if (isNaN(weight) || weight < 66 || weight > 660) {
          newErrors.weight = 'Weight must be between 66 and 660 lbs';
        }
      }
    }

    // Height validation
    if (formData.height) {
      const height = parseFloat(formData.height);
      if (formData.height_unit === 'cm') {
        if (isNaN(height) || height < 100 || height > 250) {
          newErrors.height = 'Height must be between 100 and 250 cm';
        }
      } else {
        if (isNaN(height) || height < 3 || height > 8) {
          newErrors.height = 'Height must be between 3 and 8 feet';
        }
      }
    }

    // Daily step goal validation
    const stepGoal = parseInt(formData.daily_step_goal, 10);
    if (isNaN(stepGoal) || stepGoal < 1000 || stepGoal > 50000) {
      newErrors.daily_step_goal = 'Daily step goal must be between 1,000 and 50,000 steps';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const profileData: Partial<Profile> = {
        full_name: formData.full_name.trim(),
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        fitness_level: formData.fitness_level || undefined,
        daily_step_goal: formData.daily_step_goal ? parseInt(formData.daily_step_goal, 10) : undefined,
        weight_unit: formData.weight_unit,
        height_unit: formData.height_unit,
      };

      if (mode === 'create') {
        const success = await DatabaseService.createProfile({
          id: user.id,
          email: user.email || '',
          ...profileData,
          daily_step_goal: profileData.daily_step_goal || 8000, // Default to 8000 if not provided
          preferred_walk_duration: 30, // Default value
          notification_enabled: true,
          biometric_enabled: true,
          auto_tracking: false, // Default value for auto tracking
          total_walks: 0,
          total_distance: 0,
          total_steps: 0,
          current_streak: 0,
          longest_streak: 0,
        });

        if (success) {
          Alert.alert('Success', 'Profile created successfully!');
          onSuccess?.();
          onClose();
        } else {
          Alert.alert('Error', 'Failed to create profile. Please try again.');
        }
      } else {
        const result = await DatabaseService.updateProfile(user.id, profileData);
        if (result) {
          Alert.alert('Success', 'Profile updated successfully!');
          onSuccess?.();
          onClose();
        } else {
          Alert.alert('Error', 'Failed to update profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('Profile submission error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'create' ? 'Complete Your Profile' : 'Edit Profile'}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Text style={styles.saveButtonText}>
                {mode === 'create' ? 'Complete' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[styles.textInput, errors.full_name && styles.textInputError]}
                value={formData.full_name}
                onChangeText={(value) => handleInputChange('full_name', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
              {errors.full_name && <Text style={styles.errorText}>{errors.full_name}</Text>}
            </View>

            {/* Age */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age (Optional)</Text>
              <TextInput
                style={[styles.textInput, errors.age && styles.textInputError]}
                value={formData.age}
                onChangeText={(value) => handleInputChange('age', value)}
                placeholder="Enter your age"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>

            {/* Fitness Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fitness Level (Optional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.fitness_level}
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced' | '') => handleInputChange('fitness_level', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select fitness level" value="" />
                  <Picker.Item label="Beginner" value="beginner" />
                  <Picker.Item label="Intermediate" value="intermediate" />
                  <Picker.Item label="Advanced" value="advanced" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Biometric Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biometric Data</Text>
            
            {/* Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (Optional)</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[styles.textInputWithUnit, errors.weight && styles.textInputError]}
                  value={formData.weight}
                  onChangeText={(value) => handleInputChange('weight', value)}
                  placeholder="Enter weight"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitPicker}>
                  <Picker
                    selectedValue={formData.weight_unit}
                    onValueChange={(value: 'kg' | 'lbs') => handleInputChange('weight_unit', value)}
                    style={styles.unitPickerStyle}
                  >
                    <Picker.Item label="kg" value="kg" />
                    <Picker.Item label="lbs" value="lbs" />
                  </Picker>
                </View>
              </View>
              {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
            </View>

            {/* Height */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (Optional)</Text>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={[styles.textInputWithUnit, errors.height && styles.textInputError]}
                  value={formData.height}
                  onChangeText={(value) => handleInputChange('height', value)}
                  placeholder={formData.height_unit === 'cm' ? 'Enter height in cm' : 'Enter height in ft'}
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitPicker}>
                  <Picker
                    selectedValue={formData.height_unit}
                    onValueChange={(value: 'cm' | 'ft') => handleInputChange('height_unit', value)}
                    style={styles.unitPickerStyle}
                  >
                    <Picker.Item label="cm" value="cm" />
                    <Picker.Item label="ft" value="ft" />
                  </Picker>
                </View>
              </View>
              {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
            </View>
          </View>

          {/* Fitness Goals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Fitness Goals</Text>
            
            {/* Daily Step Goal */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Steps *</Text>
              <Text style={styles.inputDescription}>
                Set your daily step goal (1,000 - 50,000 steps)
              </Text>
              <TextInput
                style={[styles.textInput, errors.daily_step_goal && styles.textInputError]}
                value={formData.daily_step_goal}
                onChangeText={(value) => handleInputChange('daily_step_goal', value)}
                placeholder="10000"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              {errors.daily_step_goal && <Text style={styles.errorText}>{errors.daily_step_goal}</Text>}
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E8',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textInputError: {
    borderColor: '#F44336',
  },
  textInputWithUnit: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginRight: 12,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitPicker: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    width: 80,
    height: 48,
    justifyContent: 'center',
  },
  unitPickerStyle: {
    height: 48,
    width: 80,
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  bottomSpacing: {
    height: 40,
  },
});