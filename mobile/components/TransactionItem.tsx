import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { getCategoryIcon, getCategoryColor } from '@/constants/categories';
import { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) + `, ${timeStr}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(transaction.category) + '20' }]}>
        <Ionicons
          name={getCategoryIcon(transaction.category)}
          size={22}
          color={getCategoryColor(transaction.category)}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.merchant} numberOfLines={1}>
          {(transaction.merchant && transaction.merchant !== 'Manual Expense')
            ? transaction.merchant
            : (transaction.category
              ? (transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1).replace('_', ' '))
              : 'Expense')}
        </Text>
        <Text style={styles.time}>{formatTime(transaction.created_at)}</Text>
      </View>

      <Text style={styles.amount}>-{formatAmount(transaction.amount)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  merchant: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
});
