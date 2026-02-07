import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { getCategoryIcon, getCategoryColor } from '@/constants/categories';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

const spendClassLabels: Record<string, string> = {
  need: 'Need',
  want: 'Want',
  luxury: 'Luxury',
};

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const transactionDate = transaction.transaction_at || transaction.created_at;

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
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(transactionDate)}</Text>
          {transaction.spend_class && (
            <View style={styles.spendClassBadge}>
              <Text style={styles.spendClassText}>
                {spendClassLabels[transaction.spend_class] || transaction.spend_class}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.amount}>-{formatCurrency(transaction.amount, transaction.currency || 'INR')}</Text>
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  spendClassBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
  },
  spendClassText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
});
