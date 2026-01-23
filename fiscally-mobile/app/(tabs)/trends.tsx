import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react-native';

const colors = {
    background: '#F1EFE9',
    card: '#FFFFFF',
    primary: '#6366F1',
    foreground: '#2D3436',
    muted: '#9CA3AF',
    border: '#E2E2E2',
    success: '#10B981',
    danger: '#EF4444',
};

export default function TrendsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>TRENDS</Text>
                    <Text style={styles.headerSubtitle}>Financial Analytics</Text>
                </View>

                {/* Monthly Summary */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>This Month</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <TrendingUp size={18} color={colors.success} />
                            </View>
                            <Text style={styles.statLabel}>Income</Text>
                            <Text style={[styles.statValue, { color: colors.success }]}>$5,240</Text>
                        </View>

                        <View style={styles.statDivider} />

                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <TrendingDown size={18} color={colors.danger} />
                            </View>
                            <Text style={styles.statLabel}>Expenses</Text>
                            <Text style={[styles.statValue, { color: colors.danger }]}>$3,120</Text>
                        </View>
                    </View>
                </View>

                {/* Spending Categories */}
                <Text style={styles.sectionTitle}>TOP SPENDING</Text>

                <View style={styles.card}>
                    <View style={styles.spendingRow}>
                        <View style={styles.spendingInfo}>
                            <Text style={styles.spendingName}>Subscriptions</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: '65%' }]} />
                            </View>
                        </View>
                        <Text style={styles.spendingAmount}>$324</Text>
                    </View>

                    <View style={styles.spendingRow}>
                        <View style={styles.spendingInfo}>
                            <Text style={styles.spendingName}>Food & Dining</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: '48%' }]} />
                            </View>
                        </View>
                        <Text style={styles.spendingAmount}>$580</Text>
                    </View>

                    <View style={styles.spendingRow}>
                        <View style={styles.spendingInfo}>
                            <Text style={styles.spendingName}>Transportation</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: '32%' }]} />
                            </View>
                        </View>
                        <Text style={styles.spendingAmount}>$245</Text>
                    </View>
                </View>

                {/* AI Insights */}
                <Text style={styles.sectionTitle}>AI INSIGHTS</Text>

                <View style={styles.insightCard}>
                    <BarChart3 size={24} color={colors.primary} />
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Spending Pattern Detected</Text>
                        <Text style={styles.insightText}>
                            Your subscription spending increased 12% this month. SubZero can help negotiate better rates.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        paddingVertical: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.foreground,
        letterSpacing: 2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 22,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.foreground,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 12,
        color: colors.muted,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    statDivider: {
        width: 1,
        height: 60,
        backgroundColor: colors.border,
        marginHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.muted,
        letterSpacing: 2,
        marginBottom: 16,
    },
    spendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    spendingInfo: {
        flex: 1,
        marginRight: 16,
    },
    spendingName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.foreground,
        marginBottom: 8,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderRadius: 3,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    spendingAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.foreground,
    },
    insightCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.foreground,
        marginBottom: 4,
    },
    insightText: {
        fontSize: 13,
        color: colors.muted,
        lineHeight: 20,
    },
});
