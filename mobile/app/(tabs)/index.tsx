import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows
} from '@/constants/theme';
import {
  TransactionItem,
  CategoryCard,
  Card,
} from '@/components';
import { api } from '@/services/api';
import { Transaction } from '@/types';
import { useResponsive } from '@/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const { rf, isSmall } = useResponsive();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<{
    headline?: string;
    summary?: string;
    tip?: string;
    period_days?: number;
    total_spent?: number;
    transaction_count?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const loadData = async () => {
    try {
      const authenticated = await api.isAuthenticated();
      if (!authenticated) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);
      const [txnResponse, insightsData] = await Promise.all([
        api.getTransactions({ limit: 10 }),
        api.getInsights().catch(() => null),
      ]);
      setTransactions(txnResponse.transactions);
      // Handle insights - API may return different shape than expected
      if (insightsData && 'patterns' in insightsData && 'alerts' in insightsData) {
        setInsights(insightsData as { patterns: Insight[]; alerts: Insight[] });
      }
    } catch (error: any) {
      // Only log unexpected errors, not auth failures
      if (error?.message?.includes('credentials') || error?.message?.includes('Not authenticated')) {
        setIsAuthenticated(false);
      } else {
        console.error('Failed to load home data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate stats from transactions
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const budget = 50000;
  const budgetPercentage = (totalSpent / budget) * 100;

  // Calculate top categories
  const categoryTotals = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryTotals)
    .map(([id, amount]) => ({
      id,
      amount,
      percentage: (amount / totalSpent) * 100
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Redirect to login if not authenticated
  if (isAuthenticated === false) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>FISCALLY</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month Selector */}
        <Text style={styles.monthText}>Current Spending</Text>

        {/* Budget Card */}
        <Card style={styles.budgetCard} variant="elevated">
          <Text style={styles.budgetAmount}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.budgetLabel}>spent recently</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(budgetPercentage, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(budgetPercentage)}% of {formatCurrency(budget)} budget
            </Text>
          </View>
        </Card>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {topCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  categoryId={cat.id}
                  amount={cat.amount}
                  percentage={cat.percentage}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Insight */}
        {insights && (insights.headline || insights.tip) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <Card style={styles.insightCard}>
              {insights.headline && (
                <Text style={styles.insightHeadline}>{insights.headline}</Text>
              )}
              {insights.summary && (
                <Text style={styles.insightSummary}>{insights.summary}</Text>
              )}
              {insights.tip && (
                <View style={styles.tipContainer}>
                  <Ionicons name="bulb" size={16} color={Colors.primary} />
                  <Text style={styles.tipText}>{insights.tip}</Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Card style={styles.transactionsCard} padding="none">
            {transactions.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: Colors.textSecondary }}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map((transaction, index) => (
                <View key={transaction.id}>
                  <TransactionItem transaction={transaction} />
                  {index < transactions.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))
            )}
          </Card>
          {transactions.length > 0 && (
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => router.push('/transactions')}
            >
              <Text style={styles.seeAllText}>See All Transactions</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '1A',
  },
  logoText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  monthText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  budgetCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  budgetAmount: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  budgetLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  categoriesContainer: {
    gap: Spacing.md,
  },
  transactionsCard: {
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.primary + '0D',
    marginLeft: 72,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  seeAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  insightCard: {
    padding: Spacing.lg,
  },
  insightHeadline: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  insightSummary: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});
