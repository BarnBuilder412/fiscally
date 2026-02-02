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
import { useRouter } from 'expo-router';
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
  InsightCard, 
  Card,
} from '@/components';
import { Transaction, Insight } from '@/types';
import { useResponsive } from '@/hooks';

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    amount: 450,
    merchant: 'Swiggy',
    category: 'food',
    source: 'sms',
    created_at: new Date().toISOString(),
    user_id: '1',
  },
  {
    id: '2',
    amount: 180,
    merchant: 'Uber',
    category: 'transport',
    source: 'sms',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_id: '1',
  },
  {
    id: '3',
    amount: 350,
    merchant: 'Starbucks',
    category: 'food',
    source: 'manual',
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    user_id: '1',
  },
];

const MOCK_INSIGHT: Insight = {
  id: '1',
  type: 'pattern',
  message: "You spent 23% less on food delivery this week! That's ₹1,840 saved. Keep it up! 🎉",
  confidence: 0.92,
  actionable: true,
  created_at: new Date().toISOString(),
};

const MOCK_CATEGORIES = [
  { id: 'food', amount: 12400, percentage: 75 },
  { id: 'shopping', amount: 8200, percentage: 50 },
  { id: 'transport', amount: 4100, percentage: 25 },
];

export default function HomeScreen() {
  const router = useRouter();
  const { rf, isSmall } = useResponsive();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const totalSpent = 32450;
  const budget = 50000;
  const budgetPercentage = (totalSpent / budget) * 100;

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.logoText}>FISCALLY</Text>
            <View style={styles.aiStatus}>
              <View style={styles.aiDot} />
              <Text style={styles.aiText}>AI Active</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.monthText}>January 2026</Text>

        {/* Budget Card */}
        <Card style={styles.budgetCard} variant="elevated">
          <Text style={styles.budgetAmount}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.budgetLabel}>spent this month</Text>
          
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {MOCK_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.id}
                categoryId={cat.id}
                amount={cat.amount}
                percentage={cat.percentage}
              />
            ))}
          </ScrollView>
        </View>

        {/* AI Insight */}
        <View style={styles.section}>
          <InsightCard insight={MOCK_INSIGHT} />
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Card style={styles.transactionsCard} padding="none">
            {MOCK_TRANSACTIONS.map((transaction, index) => (
              <View key={transaction.id}>
                <TransactionItem transaction={transaction} />
                {index < MOCK_TRANSACTIONS.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </Card>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push('/transactions')}
          >
            <Text style={styles.seeAllText}>See All Transactions</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '1A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: Spacing.md,
  },
  logoText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 4,
  },
  aiText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
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
});
