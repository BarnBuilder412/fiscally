import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Redirect, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const { width } = Dimensions.get('window');

// Goal card component
const GoalCard = ({
  goal,
  current,
  target,
  icon,
  color
}: {
  goal: string;
  current: number;
  target: number;
  icon: string;
  color: string;
}) => {
  const progress = Math.min((current / target) * 100, 100);

  const formatAmount = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  return (
    <View style={[styles.goalCard, { borderColor: color + '30' }]}>
      <View style={[styles.goalIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.goalName} numberOfLines={1}>{goal}</Text>
      <Text style={styles.goalProgress}>
        {formatAmount(current)} / {formatAmount(target)}
      </Text>
      <View style={styles.goalProgressBar}>
        <View style={[styles.goalProgressFill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.goalPercent, { color }]}>{Math.round(progress)}%</Text>
    </View>
  );
};

// Agentic Coach Card with contextual tips
const AgenticCoachCard = ({
  budgetPercentage,
  daysRemaining,
  transactions,
  goalData,
  insights,
  onAskCoach,
}: {
  budgetPercentage: number;
  daysRemaining: number;
  transactions: Transaction[];
  goalData: any[];
  insights: any;
  onAskCoach: () => void;
}) => {
  const [currentTip, setCurrentTip] = useState({ message: '', emoji: '💡' });

  useEffect(() => {
    const tips = [];

    // Budget-based tips
    if (budgetPercentage < 50) {
      tips.push({ message: `Amazing! Only ${Math.round(budgetPercentage)}% of budget used with ${daysRemaining} days left. You're crushing it! 💪`, emoji: '🎉' });
    } else if (budgetPercentage < 70) {
      tips.push({ message: `You're on track! ${Math.round(100 - budgetPercentage)}% of budget remaining for ${daysRemaining} days.`, emoji: '✨' });
    } else if (budgetPercentage < 90) {
      tips.push({ message: `Heads up! You've used ${Math.round(budgetPercentage)}% of budget. Consider slowing down a bit.`, emoji: '⚠️' });
    } else {
      tips.push({ message: `Budget alert! Only ${Math.round(100 - budgetPercentage)}% left. Let's be careful these last ${daysRemaining} days.`, emoji: '🚨' });
    }

    // Category-based insights
    if (transactions.length > 0) {
      const categorySpend: Record<string, number> = {};
      transactions.forEach(t => {
        const cat = t.category || 'other';
        categorySpend[cat] = (categorySpend[cat] || 0) + t.amount;
      });

      const sortedCategories = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]);
      if (sortedCategories.length > 0) {
        const [topCat, topAmount] = sortedCategories[0];
        const topCatLabel = topCat.charAt(0).toUpperCase() + topCat.slice(1);
        tips.push({ message: `Your top spending category is ${topCatLabel} (₹${topAmount.toLocaleString()}). Want tips to optimize?`, emoji: '📊' });
      }
    }

    // Goal-based tips
    if (goalData.length > 0) {
      const nearComplete = goalData.find(g => (g.current / g.target) >= 0.8);
      if (nearComplete) {
        tips.push({ message: `So close! Your "${nearComplete.label}" goal is ${Math.round((nearComplete.current / nearComplete.target) * 100)}% complete!`, emoji: '🎯' });
      }
    } else {
      tips.push({ message: `Setting financial goals helps you save 40% more! Tap to set your first goal.`, emoji: '🎯' });
    }

    // Transaction pattern tips
    if (transactions.length > 0) {
      const todayCount = transactions.filter(t =>
        new Date(t.created_at).toDateString() === new Date().toDateString()
      ).length;

      if (todayCount === 0) {
        tips.push({ message: `No expenses today yet! Track everything to stay on top of your finances.`, emoji: '📝' });
      } else if (todayCount >= 5) {
        tips.push({ message: `${todayCount} transactions today! Consider reviewing them for accuracy.`, emoji: '👀' });
      }

      // Weekly comparison
      const thisWeek = transactions.filter(t => {
        const txDate = new Date(t.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return txDate >= weekAgo;
      });
      const weekTotal = thisWeek.reduce((sum, t) => sum + t.amount, 0);
      if (weekTotal > 0) {
        tips.push({ message: `You've spent ₹${weekTotal.toLocaleString()} this week. That's ₹${Math.round(weekTotal / 7).toLocaleString()}/day on average.`, emoji: '📈' });
      }
    }

    // Use API insights if available
    if (insights?.tip) {
      tips.push({ message: insights.tip, emoji: '🤖' });
    }

    // Pick a random tip
    if (tips.length > 0) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(randomTip);
    }
  }, [budgetPercentage, daysRemaining, transactions, goalData, insights]);

  return (
    <View style={styles.aiCoachCard}>
      <View style={styles.aiCoachGlow} />
      <View style={styles.aiCoachHeader}>
        <Text style={styles.aiCoachEmoji}>{currentTip.emoji}</Text>
        <Text style={styles.aiCoachTitle}>Fiscally AI</Text>
      </View>
      <Text style={styles.aiCoachText}>{currentTip.message}</Text>
      <TouchableOpacity style={styles.aiCoachButton} onPress={onAskCoach}>
        <Text style={styles.aiCoachButtonText}>Ask Fiscally AI</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [userGoals, setUserGoals] = useState<string[]>([]);
  const [userBudget, setUserBudget] = useState<string | null>(null);
  const [userGoalDetails, setUserGoalDetails] = useState<Record<string, any>>({});
  const [insights, setInsights] = useState<{
    headline?: string;
    summary?: string;
    tip?: string;
  } | null>(null);
  const [goalProgress, setGoalProgress] = useState<{
    monthly_salary: number;
    monthly_budget: number;
    monthly_expenses: number;
    monthly_savings: number;
    budget_used_percentage: number;
    goals: any[];
    tip?: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const authenticated = await api.isAuthenticated();
      if (!authenticated) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      // Load transactions and user preferences
      const [txnResponse, insightsData, goalProgressData, storedGoals, storedBudget, storedGoalDetails] = await Promise.all([
        api.getTransactions({ limit: 50 }).catch(() => ({ transactions: [] })),
        api.getInsights().catch(() => null),
        api.getGoalProgress().catch(() => null),
        AsyncStorage.getItem('user_goals'),
        AsyncStorage.getItem('user_budget'),
        AsyncStorage.getItem('user_goal_details'),
      ]);

      const txns = txnResponse?.transactions || [];
      setTransactions(Array.isArray(txns) ? txns : []);
      setInsights(insightsData);
      setGoalProgress(goalProgressData);
      setUserGoals(storedGoals ? JSON.parse(storedGoals) : []);
      setUserBudget(storedBudget);
      setUserGoalDetails(storedGoalDetails ? JSON.parse(storedGoalDetails) : {});
    } catch (error: any) {
      if (error?.message?.includes('credentials') || error?.message?.includes('Not authenticated')) {
        setIsAuthenticated(false);
      } else {
        console.error('Failed to load home data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to events for instant updates
  useEffect(() => {
    const unsubTransaction = eventBus.on(Events.TRANSACTION_ADDED, () => {
      loadData();
    });
    const unsubUpdated = eventBus.on(Events.TRANSACTION_UPDATED, () => {
      loadData();
    });
    const unsubPrefs = eventBus.on(Events.PREFERENCES_CHANGED, () => {
      loadData();
    });

    return () => {
      unsubTransaction();
      unsubUpdated();
      unsubPrefs();
    };
  }, []);

  // Also reload on screen focus
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

  // Calculate spending based on period
  const getSpendingForPeriod = (period: 'today' | 'week' | 'month') => {
    const now = new Date();
    return transactions.filter(t => {
      const txDate = new Date(t.created_at);
      if (period === 'today') {
        return txDate.toDateString() === now.toDateString();
      } else if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return txDate >= weekAgo;
      } else {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return txDate >= monthAgo;
      }
    }).reduce((sum, t) => sum + t.amount, 0);
  };

  // Calculate budget from user selection
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

  const budget = getBudgetAmount();
  const monthlySpent = getSpendingForPeriod('month');
  const budgetPercentage = (monthlySpent / budget) * 100;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;
  const remainingBudget = Math.max(budget - monthlySpent, 0);

  // Goal data - use real API data if available, fallback to local
  const goalData = goalProgress?.goals?.length
    ? goalProgress.goals.map(g => ({
      id: g.id,
      label: g.label,
      icon: g.icon || 'flag',
      color: g.color || Colors.primary,
      target: g.target_amount,
      current: g.current_saved,
      monthlyContribution: g.monthly_contribution,
      progressPercentage: g.progress_percentage,
      onTrack: g.on_track,
      projectedDate: g.projected_completion_date,
    }))
    : [
      { id: 'emergency', label: 'Emergency Fund', icon: 'shield-checkmark', color: '#22C55E' },
      { id: 'vacation', label: 'Vacation', icon: 'airplane', color: '#3B82F6' },
      { id: 'investment', label: 'Investment', icon: 'trending-up', color: '#8B5CF6' },
      { id: 'gadget', label: 'New Gadget', icon: 'phone-portrait', color: '#EC4899' },
      { id: 'home', label: 'Home/Rent', icon: 'home', color: '#F59E0B' },
      { id: 'education', label: 'Education', icon: 'school', color: '#06B6D4' },
      { id: 'vehicle', label: 'Vehicle', icon: 'car', color: '#EF4444' },
      { id: 'wedding', label: 'Wedding', icon: 'heart', color: '#F472B6' },
    ]
      .filter(g => userGoals.includes(g.id))
      .map(g => {
        const details = userGoalDetails[g.id];
        const target = details?.amount ? parseInt(details.amount.replace(/[^0-9]/g, '')) : 50000;
        return {
          ...g,
          target,
          current: 0,
          monthlyContribution: 0,
          progressPercentage: 0,
          onTrack: true,
        };
      });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
        {/* Budget Card */}
        <Card style={styles.budgetCard} variant="elevated">
          <View style={styles.budgetHeader}>
            <View style={styles.budgetIconContainer}>
              <Ionicons name="wallet" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.budgetTitle}>Monthly Budget</Text>
          </View>

          <View style={styles.budgetAmounts}>
            <Text style={styles.budgetSpent}>{formatCurrency(monthlySpent)}</Text>
            <Text style={styles.budgetOf}> / {formatCurrency(budget)}</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={budgetPercentage > 80 ? ['#EF4444', '#F59E0B'] : [Colors.primary, Colors.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(budgetPercentage, 100)}%` }]}
              />
            </View>
          </View>

          <View style={styles.budgetStats}>
            <View style={styles.budgetStat}>
              <Ionicons name="wallet-outline" size={14} color={Colors.success} />
              <Text style={styles.budgetStatText}>{formatCurrency(remainingBudget)} left</Text>
            </View>
            <View style={styles.budgetStatDivider} />
            <View style={styles.budgetStat}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.budgetStatText}>{daysRemaining} days remaining</Text>
            </View>
          </View>
        </Card>

        {/* Active Goals */}
        {goalData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎯 Active Goals</Text>
              <TouchableOpacity onPress={() => router.push('/preferences/goals')}>
                <Text style={styles.sectionLink}>Manage</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalsContainer}
            >
              {goalData.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal.label}
                  current={goal.current}
                  target={goal.target}
                  icon={goal.icon}
                  color={goal.color}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* No Goals CTA */}
        {goalData.length === 0 && (
          <TouchableOpacity
            style={styles.noGoalsCard}
            onPress={() => router.push('/onboarding')}
          >
            <View style={styles.noGoalsIcon}>
              <Ionicons name="flag" size={24} color={Colors.primary} />
            </View>
            <View style={styles.noGoalsContent}>
              <Text style={styles.noGoalsTitle}>Set Your Goals</Text>
              <Text style={styles.noGoalsSubtitle}>Start saving towards what matters most</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Fiscally AI Card */}
        <AgenticCoachCard
          budgetPercentage={budgetPercentage}
          daysRemaining={daysRemaining}
          transactions={transactions}
          goalData={goalData}
          insights={insights}
          onAskCoach={() => router.push('/(tabs)/chat')}
        />

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Quick Stats</Text>
          <View style={styles.periodTabs}>
            {(['today', 'week', 'month'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodTab,
                  selectedPeriod === period && styles.periodTabActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodTabText,
                  selectedPeriod === period && styles.periodTabTextActive,
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/activity', params: { period: selectedPeriod } })}>
            <Card style={styles.statsCard}>
              <Text style={styles.statsAmount}>{formatCurrency(getSpendingForPeriod(selectedPeriod))}</Text>
              <Text style={styles.statsLabel}>
                spent this {selectedPeriod === 'today' ? 'day' : selectedPeriod}
              </Text>
            </Card>
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
    letterSpacing: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  // Health Score Section
  healthSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  healthTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
  },
  scoreMax: {
    fontSize: FontSize.md,
    color: Colors.gray400,
    marginTop: -4,
  },
  scoreLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
  // Budget Card
  budgetCard: {
    padding: Spacing.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  budgetIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  budgetSpent: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  budgetOf: {
    fontSize: FontSize.lg,
    color: Colors.gray400,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 10,
    backgroundColor: Colors.gray200,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  budgetStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  budgetStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  budgetStatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  budgetStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.gray300,
  },
  // Sections
  section: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Goals
  goalsContainer: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  goalCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  goalName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  goalProgress: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  goalProgressBar: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  goalPercent: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  // No Goals CTA
  noGoalsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    borderStyle: 'dashed',
  },
  noGoalsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noGoalsContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  noGoalsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  noGoalsSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  // Fiscally AI Card
  aiCoachCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    overflow: 'hidden',
  },
  aiCoachGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    backgroundColor: Colors.white,
    opacity: 0.1,
    borderRadius: 70,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aiCoachTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  aiCoachEmoji: {
    fontSize: 20,
  },
  aiCoachText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  aiCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  aiCoachButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Quick Stats
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  periodTabActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  periodTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray500,
  },
  periodTabTextActive: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  statsCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  statsAmount: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statsLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
