import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius
} from '@/constants/theme';
import { TransactionItem } from '@/components';
import { Transaction } from '@/types';
import { CATEGORIES } from '@/constants/categories';
import { useTransactionStore } from '@/stores/useTransactionStore';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  ...CATEGORIES.slice(0, 3).map(c => ({ id: c.id, label: c.name })),
  { id: 'more', label: 'More' },
];

export default function TransactionsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    fetchTransactions,
    fetchMoreTransactions
  } = useTransactionStore();

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filterId: string) => {
    setSelectedFilter(filterId);
    const category = filterId === 'all' ? undefined : filterId;
    fetchTransactions({ category, reset: true });
  }, [fetchTransactions]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const category = selectedFilter === 'all' ? undefined : selectedFilter;
    await fetchTransactions({ category, reset: true });
    setRefreshing(false);
  }, [fetchTransactions, selectedFilter]);

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchMoreTransactions();
    }
  }, [isLoadingMore, hasMore, fetchMoreTransactions]);

  const renderHeader = () => (
    <View style={styles.filterContainer}>
      {FILTER_OPTIONS.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterButton,
            selectedFilter === filter.id && styles.filterButtonActive,
          ]}
          onPress={() => handleFilterChange(filter.id)}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === filter.id && styles.filterTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: Transaction }) => (
    <TransactionItem transaction={item} />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptySubtitle}>
          {selectedFilter === 'all'
            ? 'Start tracking your expenses by adding your first transaction'
            : `No ${selectedFilter} transactions found`}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  // Show initial loading state
  if (isLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  listContent: {
    backgroundColor: Colors.background,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.primary + '0D',
    marginLeft: 72,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
