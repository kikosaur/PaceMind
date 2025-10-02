import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../styles/designSystem';
import { Card } from './Card';

interface StatCardProps {
  icon?: React.ReactNode;
  value: string | number;
  label: string;
  progress?: number; // 0-1 for progress bar
  variant?: 'default' | 'primary' | 'success' | 'warning';
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  progress,
  variant = 'default',
  style,
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return {
          iconBg: Colors.backgroundTertiary,
          progressColor: Colors.primary,
        };
      case 'success':
        return {
          iconBg: '#E8F5E8',
          progressColor: Colors.success,
        };
      case 'warning':
        return {
          iconBg: '#FFF8E1',
          progressColor: Colors.warning,
        };
      default:
        return {
          iconBg: Colors.backgroundSecondary,
          progressColor: Colors.primary,
        };
    }
  };

  const colors = getVariantColors();

  return (
    <Card style={{...styles.container, ...style}} variant="elevated">
      <View style={styles.content}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
            {icon}
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
          {progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                      backgroundColor: colors.progressColor,
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
    minHeight: 80,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  value: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as TextStyle['fontWeight'],
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'left',
    fontWeight: Typography.fontWeight.medium as TextStyle['fontWeight'],
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
});

export default StatCard;