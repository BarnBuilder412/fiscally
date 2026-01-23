import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { Snowflake, Brain, Zap, TrendingUp, Bell, Sun, ChevronRight } from 'lucide-react-native';
import { Link } from 'expo-router';

// Design colors from the web frontend
const colors = {
    background: '#F1EFE9',    // Cream background
    card: '#FFFFFF',
    primary: '#6366F1',       // Purple
    foreground: '#2D3436',    // Dark text
    muted: '#9CA3AF',         // Gray text
    border: '#E2E2E2',
    success: '#10B981',       // Green for trends
};

export default function DashboardScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logo}>
                            <View style={styles.logoInner} />
                        </View>
                        <View>
                            <Text style={styles.appName}>FISCALLY</Text>
                            <View style={styles.aiActiveRow}>
                                <View style={styles.pulsingDot} />
                                <Text style={styles.aiActiveText}>AI ACTIVE</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Sun size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={20} color={colors.foreground} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>AGENT SAVINGS</Text>
                        <Text style={styles.cardValuePrimary}>$1,240.50</Text>
                        <View style={styles.trendRow}>
                            <TrendingUp size={14} color={colors.success} />
                            <Text style={styles.trendText}>+12.4%</Text>
                        </View>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.cardLabel}>NET WORTH</Text>
                        <Text style={styles.cardValue}>$84.2k</Text>
                        <View style={styles.trendRow}>
                            <TrendingUp size={14} color={colors.success} />
                            <Text style={styles.trendText}>+3.4%</Text>
                        </View>
                    </View>
                </View>

                {/* Autonomous Engines */}
                <Text style={styles.sectionTitle}>AUTONOMOUS ENGINES</Text>

                {/* SubZero Card */}
                <Link href="/saving" asChild>
                    <TouchableOpacity style={styles.engineCard}>
                        <View style={styles.engineCardContent}>
                            <View style={styles.engineCardLeft}>
                                <View style={styles.engineIconRow}>
                                    <Snowflake size={24} color={colors.primary} />
                                    <Text style={styles.engineTitle}>SubZero</Text>
                                </View>
                                <Text style={styles.engineSubtitle}>Autonomous Negotiations</Text>
                                <Text style={styles.engineStatus}>3 ACTIVE TASKS</Text>
                                <TouchableOpacity style={styles.liveButton}>
                                    <Text style={styles.liveButtonText}>LIVE UPDATE</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.progressCircleContainer}>
                                <View style={styles.progressCircle}>
                                    <Text style={styles.progressValue}>70%</Text>
                                    <Text style={styles.progressLabel}>SAVED</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Link>

                {/* DopamineAudit Card */}
                <View style={styles.engineCard}>
                    <View style={styles.engineHeader}>
                        <View style={styles.engineIconRow}>
                            <View style={styles.brainIcon}>
                                <Brain size={16} color="#FFF" />
                            </View>
                            <Text style={styles.engineTitle}>DopamineAudit</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>HIGH VOLATILITY</Text>
                        </View>
                    </View>
                    <Text style={styles.engineSubtitle}>Spending Correlation</Text>

                    {/* Bar Chart */}
                    <View style={styles.chartContainer}>
                        <View style={[styles.bar, { height: 45 }]} />
                        <View style={[styles.bar, { height: 55 }]} />
                        <View style={[styles.bar, { height: 70 }]} />
                        <View style={[styles.bar, { height: 50 }]} />
                        <View style={[styles.bar, { height: 75 }]} />
                        <View style={[styles.bar, { height: 95, backgroundColor: colors.primary }]} />
                    </View>

                    <View style={styles.chartFooter}>
                        <Text style={styles.chartFooterText}>
                            Spikes correlate with <Text style={styles.chartFooterBold}>"Low Energy"</Text> periods.
                        </Text>
                        <ChevronRight size={18} color={colors.primary} />
                    </View>
                </View>

                {/* ThesisFlow Card */}
                <View style={styles.engineCard}>
                    <View style={styles.engineIconRow}>
                        <View style={styles.thesisIcon}>
                            <Zap size={16} color="#FFF" />
                        </View>
                        <Text style={styles.engineTitle}>ThesisFlow</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F5F0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    logoInner: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    appName: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.foreground,
        letterSpacing: 1.5,
    },
    aiActiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    pulsingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
    },
    aiActiveText: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.muted,
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 28,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.muted,
        letterSpacing: 1,
        marginBottom: 6,
    },
    cardValuePrimary: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.primary,
    },
    cardValue: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.foreground,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
    },
    trendText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.success,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.muted,
        letterSpacing: 2,
        marginBottom: 16,
    },
    engineCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 22,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    engineCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    engineCardLeft: {
        flex: 1,
    },
    engineIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    engineTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.foreground,
    },
    engineSubtitle: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 2,
        marginBottom: 4,
    },
    engineStatus: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
        marginTop: 4,
    },
    liveButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 16,
    },
    liveButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    progressCircleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 5,
        borderColor: '#E5E7EB',
        borderTopColor: colors.primary,
        borderRightColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '45deg' }],
    },
    progressValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.foreground,
        transform: [{ rotate: '-45deg' }],
    },
    progressLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.muted,
        letterSpacing: 1,
        transform: [{ rotate: '-45deg' }],
    },
    engineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    brainIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thesisIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 100,
        marginTop: 20,
        marginBottom: 16,
        gap: 12,
    },
    bar: {
        flex: 1,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderRadius: 6,
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    chartFooterText: {
        fontSize: 13,
        color: colors.muted,
    },
    chartFooterBold: {
        fontWeight: '700',
        color: colors.foreground,
    },
});
