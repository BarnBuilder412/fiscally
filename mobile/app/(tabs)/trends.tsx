import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '@/constants/theme';
import { Card } from '@/components';
import { api } from '@/services/api';
import { Transaction } from '@/types';
import { eventBus, Events } from '@/services/eventBus';
import { CATEGORIES, getCategoryColor } from '@/constants/categories';

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant',
  transport: 'car',
  shopping: 'bag-handle',
  entertainment: 'game-controller',
  utilities: 'flash',
  health: 'medical',
  education: 'school',
  groceries: 'cart',
  travel: 'airplane',
  subscriptions: 'card',
  other: 'ellipsis-horizontal',
};

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userBudget, setUserBudget] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [txnResponse, storedBudget] = await Promise.all([
        api.getTransactions({ limit: 100 }).catch(() => ({ transactions: [] })),
        AsyncStorage.getItem('user_budget'),
      ]);

      const txns = txnResponse?.transactions || [];
      setTransactions(Array.isArray(txns) ? txns : []);
      setUserBudget(storedBudget);
    } catch (error) {
      console.error('Failed to load trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to events for instant updates
  useEffect(() => {
    const unsubAdded = eventBus.on(Events.TRANSACTION_ADDED, loadData);
    const unsubUpdated = eventBus.on(Events.TRANSACTION_UPDATED, loadData);
    const unsubPrefs = eventBus.on(Events.PREFERENCES_CHANGED, loadData);

    return () => {
      unsubAdded();
      unsubUpdated();
      unsubPrefs();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get monthly budget amount
  const getBudgetAmount = () => {
    switch (userBudget) {
      case 'below_20k': return 15000;
      case '20k_40k': return 30000;
      case '40k_70k': return 55000;
      case '70k_100k': return 85000;
      case 'above_100k': return 120000;
      default: return 50000;
    }
  };

  // Filter transactions for current month
  const getMonthlyTransactions = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions.filter(t => new Date(t.created_at) >= monthStart);
  };

  // Filter transactions for last month (for comparison)
  const getLastMonthTransactions = () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return transactions.filter(t => {
      const date = new Date(t.created_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });
  };

  const monthlyTxns = getMonthlyTransactions();
  const lastMonthTxns = getLastMonthTransactions();

  // Calculate total spent this month
  const totalSpent = monthlyTxns.reduce((sum, t) => sum + t.amount, 0);
  const lastMonthTotal = lastMonthTxns.reduce((sum, t) => sum + t.amount, 0);
  const comparison = lastMonthTotal > 0
    ? Math.round(((totalSpent - lastMonthTotal) / lastMonthTotal) * 100)
    : 0;

  // Group by category
  const getCategoryBreakdown = () => {
    const breakdown: Record<string, { amount: number; count: number }> = {};

    monthlyTxns.forEach(t => {
      const cat = t.category || 'other';
      if (!breakdown[cat]) {
        breakdown[cat] = { amount: 0, count: 0 };
      }
      breakdown[cat].amount += t.amount;
      breakdown[cat].count += 1;
    });

    // Convert to array and sort by amount
    const budget = getBudgetAmount();
    const categoryBudget = budget * 0.25; // Assume 25% of total budget per category

    return Object.entries(breakdown)
      .map(([id, data]) => {
        const progress = (data.amount / categoryBudget) * 100;
        let status = 'On Track';
        if (progress >= 90) status = 'Over Budget';
        else if (progress >= 75) status = 'Near Limit';
        else if (progress <= 30) status = 'Low Spend';

        return {
          id,
          name: CATEGORIES.find(c => c.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1),
          amount: data.amount,
          count: data.count,
          budget: categoryBudget,
          icon: CATEGORY_ICONS[id] || 'ellipsis-horizontal',
          color: getCategoryColor(id),
          status,
          progress,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  const categoryBreakdown = getCategoryBreakdown();

  // Generate personalized AI insight
  const getAIInsight = () => {
    if (categoryBreakdown.length === 0) {
      return {
        emoji: '📊',
        text: 'Start tracking your expenses to get personalized insights!',
      };
    }

    const topCategory = categoryBreakdown[0];
    const budget = getBudgetAmount();
    const percentSpent = (totalSpent / budget) * 100;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const expectedPercentage = (currentDay / daysInMonth) * 100;

    // Various insight types based on spending patterns
    if (percentSpent > expectedPercentage * 1.2) {
      return {
        emoji: '⚠️',
        text: `You're spending faster than usual. At this rate, you'll exceed your budget by ${Math.round(percentSpent - 100)}% by month end.`,
        highlight: `${Math.round(percentSpent)}% spent`,
      };
    }

    if (comparison < -10) {
      return {
        emoji: '🎉',
        text: `Great progress! You're spending ${Math.abs(comparison)}% less than last month. Keep up the good habits!`,
        highlight: `${Math.abs(comparison)}% saved`,
      };
    }

    if (topCategory.status === 'Near Limit' || topCategory.status === 'Over Budget') {
      return {
        emoji: '💡',
        text: `Your ${topCategory.name.toLowerCase()} spending (₹${topCategory.amount.toLocaleString()}) is approaching your limit. Consider cutting back this week.`,
        highlight: topCategory.name,
      };
    }

    return {
      emoji: '✨',
      text: `You've made ${monthlyTxns.length} transactions this month totaling ₹${totalSpent.toLocaleString()}. Your top category is ${topCategory.name.toLowerCase()}.`,
      highlight: topCategory.name,
    };
  };

  const aiInsight = getAIInsight();

  // Get actionable tip
  const getActionableTip = () => {
    const overBudgetCategories = categoryBreakdown.filter(c => c.status === 'Over Budget' || c.status === 'Near Limit');

    if (overBudgetCategories.length > 0) {
      const cat = overBudgetCategories[0];
      return {
        emoji: '🎯',
        title: 'Budget Alert',
        text: `Your ${cat.name.toLowerCase()} spending is ${Math.round(cat.progress)}% of budget. Try to limit spending in this category for the rest of the month.`,
        highlight: cat.name,
      };
    }

    const budget = getBudgetAmount();
    const remaining = budget - totalSpent;
    const daysRemaining = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();

    if (remaining > 0 && daysRemaining > 0) {
      const dailyBudget = Math.round(remaining / daysRemaining);
      return {
        emoji: '💰',
        title: 'Daily Budget',
        text: `You have ₹${remaining.toLocaleString()} left for ${daysRemaining} days. That's ₹${dailyBudget.toLocaleString()} per day.`,
        highlight: `₹${dailyBudget.toLocaleString()}/day`,
      };
    }

    return {
      emoji: '📈',
      title: 'Track More',
      text: 'Log your expenses regularly for better insights and personalized recommendations.',
      highlight: 'better insights',
    };
  };

  const actionableTip = getActionableTip();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Over Budget':
        return { bg: '#EF444420', text: '#EF4444' };
      case 'Near Limit':
        return { bg: '#F59E0B20', text: '#F59E0B' };
      case 'Low Spend':
        return { bg: '#22C55E20', text: '#22C55E' };
      default:
        return { bg: Colors.gray100, text: Colors.gray500 };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trends</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trends</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>SPENT THIS MONTH</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalSpent)}</Text>
            </View>
            {comparison !== 0 && (
              <View style={[styles.comparisonBadge, comparison < 0 && styles.comparisonPositive]}>
                <Ionicons
                  name={comparison < 0 ? 'trending-down' : 'trending-up'}
                  size={14}
                  color={comparison < 0 ? '#22C55E' : '#EF4444'}
                />
                <Text style={[styles.comparisonText, comparison < 0 && styles.comparisonTextPositive]}>
                  {Math.abs(comparison)}%
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.summarySubtext}>
            {comparison < 0 ? (
              <>You're spending <Text style={styles.summaryHighlight}>{formatCurrency(Math.abs(totalSpent - lastMonthTotal))} less</Text> than last month. Great job!</>
            ) : comparison > 0 ? (
              <>You're spending <Text style={[styles.summaryHighlight, { color: '#EF4444' }]}>{formatCurrency(totalSpent - lastMonthTotal)} more</Text> than last month.</>
            ) : (
              <>Track your expenses to see how you compare to last month.</>
            )}
          </Text>
        </Card>

        {/* AI Insight */}
        <View style={styles.aiInsightCard}>
          <View style={styles.aiIconContainer}>
            <Text style={{ fontSize: 18 }}>{aiInsight.emoji}</Text>
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiLabel}>Fiscally AI</Text>
            <Text style={styles.aiText}>
              {aiInsight.text}
            </Text>
          </View>
        </View>

        {/* Category Breakdown Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <Text style={styles.sectionSubtitle}>{categoryBreakdown.length} categories</Text>
        </View>

        {/* Category Cards */}
        {categoryBreakdown.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="pie-chart-outline" size={40} color={Colors.gray400} />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Add expenses to see your spending breakdown</Text>
          </Card>
        ) : (
          categoryBreakdown.map((category) => {
            const statusStyle = getStatusStyle(category.status);

            return (
              <Card key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                    <Ionicons name={category.icon as any} size={22} color={category.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(category.progress, 100)}%`, backgroundColor: category.color }
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.categoryFooter}>
                  <Text style={styles.categoryBudget}>
                    {category.count} transaction{category.count !== 1 ? 's' : ''}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {category.status}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}

        {/* Actionable Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipGlow} />
          <View style={styles.tipHeader}>
            <Text style={{ fontSize: 16 }}>{actionableTip.emoji}</Text>
            <Text style={styles.tipTitle}>{actionableTip.title}</Text>
          </View>
          <Text style={styles.tipText}>
            {actionableTip.text}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray500,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  comparisonPositive: {
    backgroundColor: '#22C55E20',
  },
  comparisonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#EF4444',
  },
  comparisonTextPositive: {
    color: '#22C55E',
  },
  summarySubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
  summaryHighlight: {
    color: '#22C55E',
    fontWeight: FontWeight.semibold,
  },
  aiInsightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  aiContent: {
    flex: 1,
  },
  aiLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 4,
  },
  aiText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    marginTop: 4,
  },
  categoryCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  categoryAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  categoryBudget: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  tipCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  tipGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tipTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipText: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
});
