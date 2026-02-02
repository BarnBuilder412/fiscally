import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  Colors, 
  Spacing, 
  FontSize, 
  FontWeight, 
  BorderRadius 
} from '@/constants/theme';
import { Card } from '@/components';
import { CATEGORIES, getCategoryIcon, getCategoryColor } from '@/constants/categories';

const { width } = Dimensions.get('window');

const MOCK_SPENDING_DATA = [
  { category: 'food', amount: 12400, percentage: 38 },
  { category: 'shopping', amount: 8200, percentage: 25 },
  { category: 'transport', amount: 4100, percentage: 13 },
  { category: 'bills', amount: 3800, percentage: 12 },
  { category: 'entertainment', amount: 2500, percentage: 8 },
  { category: 'other', amount: 1450, percentage: 4 },
];

const MOCK_WEEKLY_DATA = [
  { day: 'Mon', amount: 1200 },
  { day: 'Tue', amount: 800 },
  { day: 'Wed', amount: 2100 },
  { day: 'Thu', amount: 450 },
  { day: 'Fri', amount: 3200 },
  { day: 'Sat', amount: 4500 },
  { day: 'Sun', amount: 2800 },
];

type TimeFilter = 'week' | 'month' | 'year';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  
  const totalSpent = 32450;
  const comparisonPercent = -12;
  const maxWeeklyAmount = Math.max(...MOCK_WEEKLY_DATA.map(d => d.amount));

  const formatCurrency = (amount: number, short = false) => {
    if (short && amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}k`;
    }
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
        <Text style={styles.headerTitle}>Statistics</Text>
        <TouchableOpacity>
          <Ionicons name="calendar-outline" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Spacing.xxxl + 60 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Filter */}
        <View style={styles.filterContainer}>
          {(['week', 'month', 'year'] as TimeFilter[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                timeFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  timeFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Spending Card */}
        <Card style={styles.totalCard} variant="elevated">
          <Text style={styles.totalLabel}>Total Spending</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalSpent)}</Text>
          <View style={styles.comparisonContainer}>
            <Ionicons 
              name={comparisonPercent < 0 ? 'trending-down' : 'trending-up'} 
              size={16} 
              color={comparisonPercent < 0 ? Colors.success : Colors.error} 
            />
            <Text 
              style={[
                styles.comparisonText,
                { color: comparisonPercent < 0 ? Colors.success : Colors.error }
              ]}
            >
              {Math.abs(comparisonPercent)}% vs last {timeFilter}
            </Text>
          </View>
        </Card>

        {/* Weekly Spending Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Spending</Text>
          <Card style={styles.chartCard}>
            <View style={styles.barsContainer}>
              {MOCK_WEEKLY_DATA.map((data, index) => {
                const barHeight = (data.amount / maxWeeklyAmount) * 120;
                const isToday = index === MOCK_WEEKLY_DATA.length - 1;
                return (
                  <View key={data.day} style={styles.barColumn}>
                    <Text style={styles.barAmount}>{formatCurrency(data.amount, true)}</Text>
                    <View style={styles.barWrapper}>
                      <View 
                        style={[
                          styles.bar,
                          { 
                            height: barHeight,
                            backgroundColor: isToday ? Colors.primary : Colors.primaryLight,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                      {data.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Spending by Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <Card>
            {MOCK_SPENDING_DATA.map((item, index) => (
              <View key={item.category}>
                <View style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                      <Ionicons
                        name={getCategoryIcon(item.category)}
                        size={18}
                        color={getCategoryColor(item.category)}
                      />
                    </View>
                    <View>
                      <Text style={styles.categoryName}>
                        {CATEGORIES.find(c => c.id === item.category)?.name || item.category}
                      </Text>
                      <Text style={styles.categoryPercentage}>{item.percentage}%</Text>
                    </View>
                  </View>
                  <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={styles.categoryProgress}>
                  <View 
                    style={[
                      styles.categoryProgressFill,
                      { 
                        width: `${item.percentage}%`,
                        backgroundColor: getCategoryColor(item.category),
                      }
                    ]} 
                  />
                </View>
                {index < MOCK_SPENDING_DATA.length - 1 && <View style={styles.categoryDivider} />}
              </View>
            ))}
          </Card>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <Card style={styles.insightCard}>
            <View style={styles.insightRow}>
              <Ionicons name="flame" size={20} color={Colors.warning} />
              <Text style={styles.insightText}>
                Weekends account for 45% of your spending
              </Text>
            </View>
          </Card>
          <Card style={[styles.insightCard, { marginTop: Spacing.sm }] as any}>
            <View style={styles.insightRow}>
              <Ionicons name="trending-down" size={20} color={Colors.success} />
              <Text style={styles.insightText}>
                Food delivery down 23% from last month
              </Text>
            </View>
          </Card>
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
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginTop: Spacing.lg,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  filterButtonActive: {
    backgroundColor: Colors.surface,
  },
  filterText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.primary,
  },
  totalCard: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  totalLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  comparisonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
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
  chartCard: {
    padding: Spacing.lg,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barAmount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: BorderRadius.sm,
  },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  barLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  categoryName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  categoryPercentage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  categoryAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  categoryProgress: {
    height: 4,
    backgroundColor: Colors.gray100,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Spacing.md,
  },
  insightCard: {
    padding: Spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    flex: 1,
  },
});
