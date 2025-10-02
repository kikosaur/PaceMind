import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../styles/designSystem';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default',
  padding = 'lg'
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}` as keyof typeof styles],
    style
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
  },
  default: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.white,
    ...Shadows.md,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: Spacing.sm,
  },
  paddingMd: {
    padding: Spacing.md,
  },
  paddingLg: {
    padding: Spacing.base,
  },
  paddingXl: {
    padding: Spacing.xl,
  },
});

export default Card;