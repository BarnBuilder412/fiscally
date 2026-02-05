import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Colors,
    Spacing,
    FontSize,
    FontWeight,
    BorderRadius,
    Shadows,
} from '@/constants/theme';
import { Card, TransactionItem } from '@/components';
import { api } from '@/services/api';
import { Transaction } from '@/types';

export default function ActivityScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const txns = await api.getTransactions({ limit: 20 });
            setTransactions(txns);
        } catch (error) {
            console.error('Failed to load activity:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Calculate activity summary
    const todayTransactions = transactions.filter(t => {
        const today = new Date().toDateString();
        return new Date(t.created_at).toDateString() === today;
    });

    const weekTransactions = transactions.filter(t => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(t.created_at) >= weekAgo;
    });

    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    const weekTotal = weekTransactions.reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Group transactions by date
    const groupedTransactions = transactions.reduce((groups, transaction) => {
        const date = new Date(transaction.created_at).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
    }, {} as Record<string, Transaction[]>);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Activity</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: 100 + insets.bottom }
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <Card style={styles.summaryCard}>
                        <View style={[styles.summaryIcon, { backgroundColor: Colors.primary + '15' }]}>
                            <Ionicons name="today" size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.summaryLabel}>Today</Text>
                        <Text style={styles.summaryAmount}>{formatCurrency(todayTotal)}</Text>
                        <Text style={styles.summaryCount}>
                            {todayTransactions.length} transaction{todayTransactions.length !== 1 ? 's' : ''}
                        </Text>
                    </Card>

                    <Card style={styles.summaryCard}>
                        <View style={[styles.summaryIcon, { backgroundColor: '#22C55E' + '15' }]}>
                            <Ionicons name="calendar" size={20} color="#22C55E" />
                        </View>
                        <Text style={styles.summaryLabel}>This Week</Text>
                        <Text style={styles.summaryAmount}>{formatCurrency(weekTotal)}</Text>
                        <Text style={styles.summaryCount}>
                            {weekTransactions.length} transaction{weekTransactions.length !== 1 ? 's' : ''}
                        </Text>
                    </Card>
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>Recent Activity</Text>

                {transactions.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <Ionicons name="receipt-outline" size={48} color={Colors.gray300} />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                        <Text style={styles.emptySubtext}>Your spending activity will appear here</Text>
                    </Card>
                ) : (
                    Object.entries(groupedTransactions).map(([date, txns]) => (
                        <View key={date} style={styles.dateGroup}>
                            <Text style={styles.dateHeader}>{date}</Text>
                            <Card padding="none" style={styles.transactionsCard}>
                                {txns.map((transaction, index) => (
                                    <View key={transaction.id}>
                                        <TransactionItem transaction={transaction} />
                                        {index < txns.length - 1 && <View style={styles.divider} />}
                                    </View>
                                ))}
                            </Card>
                        </View>
                    ))
                )}
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
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200 + '80',
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
    summaryContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.lg,
    },
    summaryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    summaryLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        color: Colors.gray400,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryAmount: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.textPrimary,
        marginTop: Spacing.xs,
    },
    summaryCount: {
        fontSize: FontSize.xs,
        color: Colors.gray400,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    dateGroup: {
        marginBottom: Spacing.lg,
    },
    dateHeader: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.gray500,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    transactionsCard: {
        overflow: 'hidden',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.primary + '0D',
        marginLeft: 72,
    },
    emptyCard: {
        alignItems: 'center',
        padding: Spacing.xxl,
    },
    emptyText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textSecondary,
        marginTop: Spacing.md,
    },
    emptySubtext: {
        fontSize: FontSize.sm,
        color: Colors.gray400,
        marginTop: Spacing.xs,
    },
});
