import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { eventBus, Events } from '@/services/eventBus';
import { formatCurrency as formatMoney, getLocaleForCurrency } from '@/utils/currency';

export default function ActivityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [agenticTip, setAgenticTip] = useState<{ message: string; icon: string; type: 'info' | 'success' | 'warning' } | null>(null);
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

            const response = await api.getTransactions({ limit: 50 });
            // Safely extract transactions array from response
            const txns = response?.transactions || [];
            setTransactions(Array.isArray(txns) ? txns : []);
        } catch (error: any) {
            if (error?.message?.includes('credentials') || error?.message?.includes('Not authenticated')) {
                setIsAuthenticated(false);
            } else {
                console.error('Failed to load activity:', error);
            }
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const params = useLocalSearchParams<{ period: string }>();

    useEffect(() => {
        if (params.period && ['today', 'week', 'month', 'all'].includes(params.period)) {
            setSelectedFilter(params.period as any);
        }
    }, [params.period]);

    // Subscribe to events for instant updates
    useEffect(() => {
        const unsubAdded = eventBus.on(Events.TRANSACTION_ADDED, () => {
            loadData();
        });
        const unsubUpdated = eventBus.on(Events.TRANSACTION_UPDATED, () => {
            loadData();
        });
        const unsubDeleted = eventBus.on(Events.TRANSACTION_DELETED, () => {
            loadData();
        });

        return () => {
            unsubAdded();
            unsubUpdated();
            unsubDeleted();
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

    const getTransactionDate = (t: Transaction) => new Date(t.transaction_at || t.created_at);

    // Filter transactions
    const getFilteredTransactions = () => {
        let filtered = transactions;

        // Filter by time
        if (selectedFilter !== 'all') {
            const now = new Date();
            filtered = transactions.filter(t => {
                const txDate = getTransactionDate(t);
                if (selectedFilter === 'today') {
                    return txDate.toDateString() === now.toDateString();
                } else if (selectedFilter === 'week') {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return txDate >= weekAgo;
                } else {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return txDate >= monthAgo;
                }
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.category?.toLowerCase().includes(query) ||
                t.merchant?.toLowerCase().includes(query) ||
                t.note?.toLowerCase().includes(query)
            );
        }

        return filtered;
    };

    const filteredTransactions = getFilteredTransactions();

    // Calculate summary stats
    const todayTransactions = transactions.filter(t => {
        const today = new Date().toDateString();
        return getTransactionDate(t).toDateString() === today;
    });

    const weekTransactions = transactions.filter(t => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return getTransactionDate(t) >= weekAgo;
    });

    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    const weekTotal = weekTransactions.reduce((sum, t) => sum + t.amount, 0);

    const primaryCurrency = transactions[0]?.currency || 'INR';
    const formatCurrency = (amount: number) => formatMoney(amount, primaryCurrency);
    const primaryLocale = getLocaleForCurrency(primaryCurrency);

    // Generate contextual agentic tips based on transaction patterns
    useEffect(() => {
        if (transactions.length === 0) {
            setAgenticTip({
                message: "Add your first expense to start tracking! Tap the + button below.",
                icon: "add-circle",
                type: "info"
            });
            return;
        }

        const tips = [];

        // Tip based on today's spending
        if (todayTransactions.length === 0) {
            tips.push({
                message: "No spending logged today! That's either great discipline or you forgot to log something 😉",
                icon: "checkmark-circle",
                type: "success" as const
            });
        } else if (todayTransactions.length >= 5) {
            tips.push({
                message: `Busy day! You've made ${todayTransactions.length} transactions. Consider reviewing them.`,
                icon: "alert-circle",
                type: "warning" as const
            });
        }

        // Tip based on category patterns
        const categories = transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
            tips.push({
                message: `Your top spending category is ${topCategory[0]}. Want to set a budget limit for it?`,
                icon: "pie-chart",
                type: "info" as const
            });
        }

        // Tip based on week comparison
        if (weekTotal > 0) {
            const avgDaily = weekTotal / 7;
            tips.push({
                message: `You're averaging ${formatCurrency(avgDaily)} per day this week. Keep it tracked!`,
                icon: "analytics",
                type: "info" as const
            });
        }

        // Randomly pick a tip (changes on each render/refresh for "agentic" feel)
        if (tips.length > 0) {
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            setAgenticTip(randomTip);
        }
    }, [transactions, todayTransactions.length, weekTotal]);

    // Group transactions by date
    const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
        const date = getTransactionDate(transaction);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let dateLabel: string;
        if (date.toDateString() === today.toDateString()) {
            dateLabel = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateLabel = 'Yesterday';
        } else {
            dateLabel = date.toLocaleDateString(primaryLocale, {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
            });
        }

        if (!groups[dateLabel]) {
            groups[dateLabel] = [];
        }
        groups[dateLabel].push(transaction);
        return groups;
    }, {} as Record<string, Transaction[]>);

    // Redirect to login if not authenticated
    if (isAuthenticated === false) {
        return <Redirect href="/(auth)/login" />;
    }

    // Show loading indicator
    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Activity</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ marginTop: 12, color: Colors.gray500 }}>Loading transactions...</Text>
                </View>
            </SafeAreaView>
        );
    }

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
                    <View style={styles.summaryCard}>
                        <LinearGradient
                            colors={[Colors.primary, Colors.primaryDark]}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="today" size={20} color={Colors.white} />
                            <Text style={styles.summaryLabel}>Today</Text>
                            <Text style={styles.summaryAmount}>{formatCurrency(todayTotal)}</Text>
                            <Text style={styles.summaryCount}>
                                {todayTransactions.length} transaction{todayTransactions.length !== 1 ? 's' : ''}
                            </Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.summaryCard}>
                        <LinearGradient
                            colors={['#22C55E', '#16A34A']}
                            style={styles.summaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="calendar" size={20} color={Colors.white} />
                            <Text style={styles.summaryLabel}>This Week</Text>
                            <Text style={styles.summaryAmount}>{formatCurrency(weekTotal)}</Text>
                            <Text style={styles.summaryCount}>
                                {weekTransactions.length} transaction{weekTransactions.length !== 1 ? 's' : ''}
                            </Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* Agentic Tip */}
                {agenticTip && (
                    <TouchableOpacity
                        style={[
                            styles.agenticTipCard,
                            agenticTip.type === 'success' && styles.agenticTipSuccess,
                            agenticTip.type === 'warning' && styles.agenticTipWarning,
                        ]}
                        activeOpacity={0.8}
                    >
                        <View style={styles.agenticTipIcon}>
                            <Ionicons name="sparkles" size={16} color={Colors.white} />
                        </View>
                        <Text style={styles.agenticTipText}>{agenticTip.message}</Text>
                        <TouchableOpacity onPress={() => setAgenticTip(null)}>
                            <Ionicons name="close" size={16} color={Colors.white + '80'} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color={Colors.gray400} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search transactions..."
                            placeholderTextColor={Colors.gray400}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={Colors.gray400} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                    {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterTab,
                                selectedFilter === filter && styles.filterTabActive,
                            ]}
                            onPress={() => setSelectedFilter(filter)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                selectedFilter === filter && styles.filterTabTextActive,
                            ]}>
                                {filter === 'all' ? 'All Time' : filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : 'This Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Transaction History */}
                <Text style={styles.sectionTitle}>
                    Transaction History
                    {filteredTransactions.length !== transactions.length && (
                        <Text style={styles.filterInfo}> ({filteredTransactions.length} results)</Text>
                    )}
                </Text>

                {filteredTransactions.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="receipt-outline" size={48} color={Colors.gray300} />
                        </View>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No matching transactions' : 'No transactions yet'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery ? 'Try a different search term' : 'Your spending activity will appear here'}
                        </Text>
                    </Card>
                ) : (
                    Object.entries(groupedTransactions).map(([date, txns]) => (
                        <View key={date} style={styles.dateGroup}>
                            <View style={styles.dateHeaderRow}>
                                <Text style={styles.dateHeader}>{date}</Text>
                                <Text style={styles.dateTotalSm}>
                                    {formatCurrency(txns.reduce((sum, t) => sum + t.amount, 0))}
                                </Text>
                            </View>
                            <Card padding="none" style={styles.transactionsCard}>
                                {txns.map((transaction, index) => (
                                    <View key={transaction.id}>
                                        <TransactionItem
                                            transaction={transaction}
                                            onPress={() => router.push({ pathname: '/edit-transaction' as any, params: { id: transaction.id } } as any)}
                                        />
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
    // Summary Cards
    summaryContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    summaryCard: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        ...Shadows.md,
    },
    summaryGradient: {
        padding: Spacing.lg,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        color: Colors.white,
        opacity: 0.8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: Spacing.sm,
    },
    summaryAmount: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.white,
        marginTop: Spacing.xs,
    },
    summaryCount: {
        fontSize: FontSize.xs,
        color: Colors.white,
        opacity: 0.7,
        marginTop: 2,
    },
    // Search
    searchContainer: {
        marginBottom: Spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        paddingVertical: Spacing.xs,
    },
    // Filter Tabs
    filterTabs: {
        flexDirection: 'row',
        backgroundColor: Colors.gray100,
        borderRadius: BorderRadius.lg,
        padding: 4,
        marginBottom: Spacing.lg,
    },
    filterTab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    filterTabActive: {
        backgroundColor: Colors.surface,
        ...Shadows.sm,
    },
    filterTabText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.gray500,
    },
    filterTabTextActive: {
        color: Colors.textPrimary,
        fontWeight: FontWeight.semibold,
    },
    // Section
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    filterInfo: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.regular,
        color: Colors.gray500,
    },
    // Date Groups
    dateGroup: {
        marginBottom: Spacing.lg,
    },
    dateHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    dateHeader: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.gray500,
    },
    dateTotalSm: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.textSecondary,
    },
    transactionsCard: {
        overflow: 'hidden',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.primary + '0D',
        marginLeft: 72,
    },
    // Empty State
    emptyCard: {
        alignItems: 'center',
        padding: Spacing.xxl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textSecondary,
    },
    emptySubtext: {
        fontSize: FontSize.sm,
        color: Colors.gray400,
        marginTop: Spacing.xs,
        textAlign: 'center',
    },
    // Agentic Tips
    agenticTipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    agenticTipSuccess: {
        backgroundColor: '#22C55E',
    },
    agenticTipWarning: {
        backgroundColor: '#F59E0B',
    },
    agenticTipIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    agenticTipText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.white,
        lineHeight: 18,
    },
});
