import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onDismiss?: () => void;
}

export function InsightCard({ insight, onPress, onDismiss }: InsightCardProps) {
  const getInsightStyle = () => {
    switch (insight.type) {
      case 'pattern':
        return { icon: '💡', bgColor: Colors.primary + '15', borderColor: Colors.primary };
      case 'prediction':
        return { icon: '🔮', bgColor: Colors.info + '15', borderColor: Colors.info };
      case 'alert':
        return { icon: '⚠️', bgColor: Colors.warning + '15', borderColor: Colors.warning };
      case 'milestone':
        return { icon: '🎉', bgColor: Colors.success + '15', borderColor: Colors.success };
      default:
        return { icon: '💡', bgColor: Colors.gray100, borderColor: Colors.gray300 };
    }
  };

  const style = getInsightStyle();

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: style.bgColor, borderLeftColor: style.borderColor }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{style.icon}</Text>
        <Text style={styles.label}>AI Insight</Text>
      </View>
      <Text style={styles.message}>{insight.message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  message: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
