import { ViewStyle } from 'react-native';

// Design System - Centralized design tokens for consistent UI
export const Colors = {
  // Primary Colors
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  
  // Secondary Colors
  secondary: '#66BB6A',
  secondaryLight: '#81C784',
  secondaryDark: '#388E3C',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Semantic Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Password Strength Colors
  red500: '#F44336',
  orange500: '#FF9800',
  yellow500: '#FFEB3B',
  blue500: '#2196F3',
  green500: '#4CAF50',
  
  // Background Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F0F8F0',
  
  // Text Colors
  textPrimary: '#212121',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  // Border Colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#BDBDBD',
};

export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 48,
  },
  
  // Font Weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,
  
  // Spacing scale
  xs: 4,   // 4px
  sm: 8,   // 8px
  md: 12,  // 12px
  base: 16, // 16px
  lg: 20,  // 20px
  xl: 24,  // 24px
  '2xl': 32, // 32px
  '3xl': 40, // 40px
  '4xl': 48, // 48px
  '5xl': 64, // 64px
  '6xl': 80, // 80px
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows: Record<string, ViewStyle> = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const Layout = {
  // Container widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Common dimensions
  headerHeight: 60,
  tabBarHeight: 80,
  buttonHeight: {
    sm: 32,
    base: 40,
    lg: 48,
    xl: 56,
  },
  
  // Icon sizes
  iconSize: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
  },
};

// Responsive breakpoints
export const Breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Responsive utilities
export const createResponsiveStyle = (responsive: any, styles: any) => {
  return styles;
};

// Common component styles
export const ComponentStyles = {
  // Card styles
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.base,
  },
  
  // Button styles
  button: {
    primary: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.base,
      paddingHorizontal: Spacing.xl,
      ...Shadows.md,
    },
    secondary: {
      backgroundColor: Colors.backgroundSecondary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.base,
      paddingHorizontal: Spacing.xl,
      borderWidth: 1,
      borderColor: Colors.border,
    },
  },
  
  // Input styles
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  
  // Modal styles
  modal: {
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: Colors.white,
      borderTopLeftRadius: BorderRadius['2xl'],
      borderTopRightRadius: BorderRadius['2xl'],
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.base,
      paddingBottom: Spacing['2xl'],
      ...Shadows.xl,
      maxHeight: '85%',
    },
  },
};