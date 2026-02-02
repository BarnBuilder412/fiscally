import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '@/constants/theme';

interface AddExpenseButtonProps {
  onPress: () => void;
  onLongPress?: () => void;
}

export function AddExpenseButton({ onPress, onLongPress }: AddExpenseButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="px-4 pt-3"
      style={[styles.container, { paddingBottom: Spacing.md + insets.bottom }]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.icon}>＋</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Add Expense</Text>
            <Text style={styles.subtitle}>hold for 🎤 voice</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  button: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.sm,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
});
