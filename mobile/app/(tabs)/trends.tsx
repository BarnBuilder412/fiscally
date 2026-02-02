import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  Colors, 
  Spacing, 
  FontSize, 
  FontWeight, 
  BorderRadius,
  Shadows,
} from '@/constants/theme';
import { Card } from '@/components';

const CATEGORY_DATA = [
  { 
    id: 'food', 
    name: 'Food & Drink', 
    amount: 600, 
    budget: 1000, 
    icon: 'restaurant',
    color: '#E6A37C',
    status: 'On Track',
  },
  { 
    id: 'transport', 
    name: 'Transport', 
    amount: 200, 
    budget: 1000, 
    icon: 'car',
    color: '#8DA3B5',
    status: 'Low Spend',
  },
  { 
    id: 'shopping', 
    name: 'Shopping', 
    amount: 850, 
    budget: 1000, 
    icon: 'bag-handle',
    color: '#A68EA5',
    status: 'Near Limit',
  },
  { 
    id: 'entertainment', 
    name: 'Entertainment', 
    amount: 400, 
    budget: 800, 
    icon: 'game-controller',
    color: '#99A88C',
    status: 'On Track',
  },
];

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const totalSpent = 2450;
  const comparison = -5;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Near Limit':
        return { bg: '#E6A37C20', text: '#E6A37C' };
      case 'Low Spend':
        return { bg: Colors.gray100, text: Colors.gray500 };
      default:
        return { bg: Colors.gray100, text: Colors.gray500 };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>K</Text>
          </View>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>SPENT THIS MONTH</Text>
              <Text style={styles.summaryAmount}>₹{totalSpent.toLocaleString()}</Text>
            </View>
            <View style={[styles.comparisonBadge, comparison < 0 && styles.comparisonPositive]}>
              <Ionicons 
                name={comparison < 0 ? 'trending-down' : 'trending-up'} 
                size={14} 
                color={comparison < 0 ? '#99A88C' : '#E6A37C'} 
              />
              <Text style={[styles.comparisonText, comparison < 0 && styles.comparisonTextPositive]}>
                {Math.abs(comparison)}%
              </Text>
            </View>
          </View>
          <Text style={styles.summarySubtext}>
            Your spending is <Text style={styles.summaryHighlight}>₹125 less</Text> than last month. You're doing great!
          </Text>
        </Card>

        {/* AI Insight */}
        <View style={styles.aiInsightCard}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="sparkles" size={20} color={Colors.primary} />
          </View>
          <View style={styles.aiContent}>
            <Text style={styles.aiLabel}>Fiscally AI</Text>
            <Text style={styles.aiText}>
              Your coffee spending is down <Text style={styles.aiHighlight}>10%</Text> this month! Keep up this organic saving habit.
            </Text>
          </View>
        </View>

        {/* Category Breakdown Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Category Cards */}
        {CATEGORY_DATA.map((category) => {
          const progress = (category.amount / category.budget) * 100;
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
                    <Text style={styles.categoryAmount}>₹{category.amount}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${Math.min(progress, 100)}%`, backgroundColor: category.color }
                      ]} 
                    />
                  </View>
                </View>
              </View>
              <View style={styles.categoryFooter}>
                <Text style={styles.categoryBudget}>
                  {Math.round(progress)}% of ₹{category.budget} budget
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {category.status}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Actionable Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipGlow} />
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={18} color={Colors.white} />
            <Text style={styles.tipTitle}>Actionable Tip</Text>
          </View>
          <Text style={styles.tipText}>
            You've spent more on <Text style={styles.tipHighlight}>Subscriptions</Text> than usual this cycle. Review active trials before they renew.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200 + '80',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
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
    gap: 4,
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  comparisonPositive: {
    backgroundColor: '#99A88C20',
  },
  comparisonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  comparisonTextPositive: {
    color: '#99A88C',
  },
  summarySubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
  summaryHighlight: {
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  aiInsightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiContent: {
    flex: 1,
  },
  aiLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 2,
  },
  aiText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  aiHighlight: {
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  categoryCard: {
    padding: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  categoryName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  categoryAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBudget: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  tipGlow: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    backgroundColor: Colors.white,
    opacity: 0.1,
    borderRadius: 60,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: 20,
  },
  tipHighlight: {
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textDecorationLine: 'underline',
  },
});
