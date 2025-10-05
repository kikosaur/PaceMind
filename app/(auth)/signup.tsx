import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/designSystem';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength requirements
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /\d/,
};

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { signUp, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  // Real-time validation
  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return undefined;
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address';
        return undefined;
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
        return undefined;
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== password) return 'Passwords do not match';
        return undefined;
      
      default:
        return undefined;
    }
  }, [password]);

  // Validate all fields
  const validateAllFields = useCallback((): ValidationErrors => {
    return {
      name: validateField('name', name),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
    };
  }, [name, email, password, confirmPassword, validateField]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const errors = validateAllFields();
    return !Object.values(errors).some(error => error !== undefined);
  }, [validateAllFields]);

  // Handle field changes with validation
  const handleFieldChange = useCallback((field: string, value: string) => {
    // Sanitize input
    const sanitizedValue = value.trim();
    
    switch (field) {
      case 'name':
        setName(sanitizedValue);
        break;
      case 'email':
        setEmail(sanitizedValue.toLowerCase());
        break;
      case 'password':
        setPassword(value); // Don't trim passwords
        break;
      case 'confirmPassword':
        setConfirmPassword(value); // Don't trim passwords
        break;
    }

    // Update validation errors if field has been touched
    if (touched[field]) {
      const error = validateField(field, field === 'password' || field === 'confirmPassword' ? value : sanitizedValue);
      setValidationErrors(prev => ({
        ...prev,
        [field]: error,
      }));
    }
  }, [touched, validateField]);

  // Handle field blur (mark as touched)
  const handleFieldBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const value = field === 'name' ? name : field === 'email' ? email : field === 'password' ? password : confirmPassword;
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  }, [name, email, password, confirmPassword, validateField]);

  // Enhanced error handling
  const getErrorMessage = useCallback((error: any): string => {
    if (!error?.message) return 'An unexpected error occurred. Please try again.';
    
    const message = error.message.toLowerCase();
    
    // Handle specific Supabase errors
    if (message.includes('user already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (message.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (message.includes('password')) {
      return 'Password does not meet requirements. Please try a stronger password.';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    
    return error.message;
  }, []);

  const handleSignup = useCallback(async () => {
    // Validate all fields before submission
    const errors = validateAllFields();
    const hasErrors = Object.values(errors).some(error => error !== undefined);
    
    if (hasErrors) {
      setValidationErrors(errors);
      setTouched({ name: true, email: true, password: true, confirmPassword: true });
      
      // Show first error in alert
      const firstError = Object.values(errors).find(error => error !== undefined);
      if (firstError) {
        Alert.alert('Validation Error', firstError);
      }
      return;
    }

    setLoading(true);
    setValidationErrors({});
    
    try {
      await signUp(email, password, name);

      // Check authentication status after signup
      if (isAuthenticated) {
        // User is authenticated, navigate to onboarding
        router.replace('/(onboarding)/' as any);
      } else {
        // Email confirmation required
        Alert.alert(
          'Account Created Successfully!',
          'Please check your email to verify your account, then sign in to continue.',
          [
            { 
              text: 'OK', 
              onPress: () => router.replace('/(auth)/login'),
              style: 'default'
            }
          ]
        );
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      
      // Set validation error for display
      setValidationErrors({ email: errorMessage });
      
      // Also show alert for immediate feedback
      Alert.alert('Signup Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [validateAllFields, signUp, email, password, name, isAuthenticated, getErrorMessage]);

  // Password strength indicator
  const getPasswordStrength = useCallback((pwd: string): { score: number; text: string; color: string } => {
    if (!pwd) return { score: 0, text: '', color: Colors.gray400 };
    
    let score = 0;
    if (pwd.length >= PASSWORD_MIN_LENGTH) score++;
    if (PASSWORD_REQUIREMENTS.hasUpperCase.test(pwd)) score++;
    if (PASSWORD_REQUIREMENTS.hasLowerCase.test(pwd)) score++;
    if (PASSWORD_REQUIREMENTS.hasNumber.test(pwd)) score++;
    
    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    const colors = [Colors.red500, Colors.orange500, Colors.yellow500, Colors.blue500, Colors.green500];
    
    return { score, text: strength, color: colors[score] };
  }, []);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password, getPasswordStrength]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={[Colors.primaryLight, Colors.primary, Colors.primaryDark]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Join PaceMind</Text>
            <Text style={styles.subtitle}>Start your AI-powered walking journey</Text>
          </View>

          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.gray600} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.gray500}
                value={name}
                onChangeText={(value) => handleFieldChange('name', value)}
                onBlur={() => handleFieldBlur('name')}
                autoCapitalize="words"
                autoComplete="name"
                accessibilityLabel="Full Name"
                accessibilityHint="Enter your full name"
              />
            </View>
            {touched.name && validationErrors.name && (
              <Text style={styles.errorText}>{validationErrors.name}</Text>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.gray600} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.gray500}
                value={email}
                onChangeText={(value) => handleFieldChange('email', value)}
                onBlur={() => handleFieldBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Email Address"
                accessibilityHint="Enter your email address"
              />
            </View>
            {touched.email && validationErrors.email && (
              <Text style={styles.errorText}>{validationErrors.email}</Text>
            )}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.gray600} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.gray500}
                value={password}
                onChangeText={(value) => handleFieldChange('password', value)}
                onBlur={() => handleFieldBlur('password')}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                accessibilityLabel="Password"
                accessibilityHint="Enter your password"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                style={styles.eyeIcon}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={Colors.gray600} />
              </TouchableOpacity>
            </View>
            {touched.password && validationErrors.password && (
              <Text style={styles.errorText}>{validationErrors.password}</Text>
            )}
            {password && (
              <View style={styles.passwordStrength}>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  Password Strength: {passwordStrength.text}
                </Text>
              </View>
            )}

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.gray600} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={Colors.gray500}
                value={confirmPassword}
                onChangeText={(value) => handleFieldChange('confirmPassword', value)}
                onBlur={() => handleFieldBlur('confirmPassword')}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                accessibilityLabel="Confirm Password"
                accessibilityHint="Re-enter your password to confirm"
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                style={styles.eyeIcon}
                accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={Colors.gray600} />
              </TouchableOpacity>
            </View>
            {touched.confirmPassword && validationErrors.confirmPassword && (
              <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.signupButton, 
                loading && styles.signupButtonDisabled,
                !isFormValid && styles.signupButtonDisabled
              ]}
              onPress={handleSignup}
              disabled={loading || !isFormValid}
              accessibilityLabel="Create Account"
              accessibilityHint="Tap to create your account"
            >
              <Text style={styles.signupButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity accessibilityLabel="Sign In" accessibilityHint="Navigate to sign in screen">
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  title: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
    height: 56,
    ...Shadows.sm,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    padding: Spacing.xs,
  },
  signupButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.base,
    ...Shadows.md,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  errorText: {
    color: Colors.red500,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  passwordStrength: {
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  strengthText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Typography.fontSize.sm,
  },
  loginLink: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});