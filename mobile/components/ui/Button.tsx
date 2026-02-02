import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.lg,
      width: fullWidth ? '100%' : undefined,
    };

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
      md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
      lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: { backgroundColor: Colors.primary },
      secondary: { backgroundColor: Colors.secondary },
      outline: { 
        backgroundColor: 'transparent', 
        borderWidth: 1.5, 
        borderColor: Colors.primary 
      },
      ghost: { backgroundColor: 'transparent' },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles: Record<string, TextStyle> = {
      sm: { fontSize: FontSize.sm },
      md: { fontSize: FontSize.md },
      lg: { fontSize: FontSize.lg },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: Colors.white },
      secondary: { color: Colors.white },
      outline: { color: Colors.primary },
      ghost: { color: Colors.primary },
    };

    return {
      fontWeight: FontWeight.semibold,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' || variant === 'secondary' ? Colors.white : Colors.primary} 
          size="small" 
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon ? { marginLeft: Spacing.sm } : undefined, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
