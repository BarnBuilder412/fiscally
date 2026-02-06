import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  style,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: Colors.surface,
      borderRadius: BorderRadius.lg,
    };

    const paddingStyles: Record<string, ViewStyle> = {
      none: {},
      sm: { padding: Spacing.sm },
      md: { padding: Spacing.lg },
      lg: { padding: Spacing.xl },
    };

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        borderWidth: 1,
        borderColor: Colors.gray100,
        ...Shadows.sm,
      },
      elevated: Shadows.md,
      outlined: { borderWidth: 1, borderColor: Colors.gray200 },
    };

    return {
      ...baseStyle,
      ...paddingStyles[padding],
      ...variantStyles[variant],
    };
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
}
