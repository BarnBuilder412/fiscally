import React, { useEffect, useState } from 'react';
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
import { api } from '@/services/api';
import { formatCurrency } from '@/utils/currency';

const ACCOUNTS = [
  { id: '1', name: 'HDFC Savings', type: 'Bank', balance: 45000, icon: 'business', color: '#3B82F6' },
  { id: '2', name: 'ICICI Credit', type: 'Credit Card', balance: -12500, icon: 'card', color: '#EF4444' },
  { id: '3', name: 'Cash', type: 'Cash', balance: 3500, icon: 'cash', color: '#22C55E' },
  { id: '4', name: 'Paytm Wallet', type: 'Digital', balance: 2000, icon: 'phone-portrait', color: '#3B82F6' },
];

const RECENT_TRANSFERS = [
  { id: '1', from: 'HDFC Savings', to: 'Cash', amount: 5000, date: 'Today' },
  { id: '2', from: 'Paytm Wallet', to: 'HDFC Savings', amount: 1500, date: 'Yesterday' },
];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [currencyCode, setCurrencyCode] = useState('INR');
  
  const totalBalance = ACCOUNTS.reduce((sum, acc) => sum + acc.balance, 0);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const profile = await api.getProfile();
        const code = profile?.profile?.identity?.currency || profile?.profile?.currency;
        if (code) setCurrencyCode(String(code).toUpperCase());
      } catch {
        // Keep fallback currency.
      }
    };
    loadCurrency();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={Colors.primary} />
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
        {/* Total Balance Card */}
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL BALANCE</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalBalance, currencyCode)}</Text>
          <View style={styles.totalActions}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Ionicons name="arrow-up" size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Ionicons name="arrow-down" size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionText}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Ionicons name="swap-horizontal" size={18} color={Colors.white} />
              </View>
              <Text style={styles.actionText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Accounts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Manage</Text>
          </TouchableOpacity>
        </View>

        {ACCOUNTS.map((account) => (
          <Card key={account.id} style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={[styles.accountIcon, { backgroundColor: account.color + '15' }]}>
                <Ionicons name={account.icon as any} size={20} color={account.color} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountType}>{account.type}</Text>
              </View>
              <Text style={[
                styles.accountBalance,
                account.balance < 0 && styles.negativeBalance
              ]}>
                {account.balance < 0 ? '-' : ''}{formatCurrency(Math.abs(account.balance), currencyCode)}
              </Text>
            </View>
          </Card>
        ))}

        {/* Recent Transfers */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transfers</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>See All</Text>
          </TouchableOpacity>
        </View>

        {RECENT_TRANSFERS.map((transfer) => (
          <Card key={transfer.id} style={styles.transferCard}>
            <View style={styles.transferRow}>
              <View style={styles.transferIcon}>
                <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
              </View>
              <View style={styles.transferInfo}>
                <Text style={styles.transferText}>
                  {transfer.from} → {transfer.to}
                </Text>
                <Text style={styles.transferDate}>{transfer.date}</Text>
              </View>
              <Text style={styles.transferAmount}>{formatCurrency(transfer.amount, currencyCode)}</Text>
            </View>
          </Card>
        ))}
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
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  totalCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.primary,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  totalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.white,
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
  accountCard: {
    padding: Spacing.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  accountType: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  negativeBalance: {
    color: Colors.error,
  },
  transferCard: {
    padding: Spacing.md,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  transferIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferInfo: {
    flex: 1,
  },
  transferText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  transferDate: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  transferAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
});
