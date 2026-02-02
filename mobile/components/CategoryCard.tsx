import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '@/constants/theme';
import { getCategoryIcon, getCategoryColor, getCategoryById } from '@/constants/categories';

interface CategoryCardProps {
  categoryId: string;
  amount: number;
  percentage?: number;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

export function CategoryCard({ 
  categoryId, 
  amount, 
  percentage,
  onPress, 
  selected = false,
  compact = false,
}: CategoryCardProps) {
  const category = getCategoryById(categoryId);
  const color = getCategoryColor(categoryId);
  
  const formatAmount = (amt: number) => {
    if (amt >= 100000) {
      return `₹${(amt / 100000).toFixed(1)}L`;
    }
    if (amt >= 1000) {
      return `₹${(amt / 1000).toFixed(1)}k`;
    }
    return `₹${amt}`;
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          selected && { borderColor: color, borderWidth: 2 },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={getCategoryIcon(categoryId)} 
          size={24} 
          color={color} 
        />
        <Text style={styles.compactName}>{category?.name || categoryId}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, Shadows.sm]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={getCategoryIcon(categoryId)} 
        size={28} 
        color={color} 
      />
      <Text style={styles.name}>{category?.name || categoryId}</Text>
      <Text style={styles.amount}>{formatAmount(amount)}</Text>
      {percentage !== undefined && (
        <View style={[styles.progressBar, { backgroundColor: color + '30' }]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }
            ]} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 100,
  },
  compactContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 72,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  icon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  compactName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
