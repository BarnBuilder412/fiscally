import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', amount: 450, merchant: 'Swiggy', category: 'food', source: 'sms', created_at: new Date().toISOString(), user_id: '1' },
  { id: '2', amount: 180, merchant: 'Uber', category: 'transport', source: 'sms', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), user_id: '1' },
  { id: '3', amount: 350, merchant: 'Starbucks', category: 'food', source: 'manual', created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), user_id: '1' },
  { id: '4', amount: 2500, merchant: 'Amazon', category: 'shopping', source: 'sms', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), user_id: '1' },
  { id: '5', amount: 120, merchant: 'Ola', category: 'transport', source: 'sms', created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), user_id: '1' },
  { id: '6', amount: 800, merchant: 'Zomato', category: 'food', source: 'sms', created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), user_id: '1' },
  { id: '7', amount: 1500, merchant: 'Netflix', category: 'entertainment', source: 'sms', created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), user_id: '1' },
  { id: '8', amount: 3200, merchant: 'Flipkart', category: 'shopping', source: 'sms', created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(), user_id: '1' },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  ...CATEGORIES.slice(0, 3).map(c => ({ id: c.id, label: c.name })),
  { id: 'more', label: 'More' },
];

export default function TransactionsScreen() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredTransactions = selectedFilter === 'all' 
    ? MOCK_TRANSACTIONS 
    : MOCK_TRANSACTIONS.filter(t => t.category === selectedFilter);

  const renderHeader = () => (
    <View style={styles.filterContainer}>
      {FILTER_OPTIONS.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterButton,
            selectedFilter === filter.id && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter(filter.id)}
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  separator: {
    height: 1,
    backgroundColor: Colors.primary + '0D',
    marginLeft: 72,
  },
});
