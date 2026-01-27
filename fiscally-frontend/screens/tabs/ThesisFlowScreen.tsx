import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../lib/theme';
import Button from '../../components/Button';

function DashTab() {
    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.dashCard}>
                <Text style={styles.dashValue}>$84,200</Text>
                <Text style={styles.dashLabel}>Portfolio Value</Text>
                <View style={styles.dashChange}>
                    <MaterialCommunityIcons name="trending-up" size={16} color={colors.success} />
                    <Text style={styles.dashChangeText}>+3.4% this month</Text>
                </View>
            </View>

            <Text style={styles.subTitle}>Asset Allocation</Text>
            <View style={styles.allocationGrid}>
                <View style={styles.allocationItem}>
                    <View style={[styles.allocationDot, { backgroundColor: colors.info }]} />
                    <Text style={styles.allocationLabel}>Tech</Text>
                    <Text style={styles.allocationValue}>45%</Text>
                </View>
                <View style={styles.allocationItem}>
                    <View style={[styles.allocationDot, { backgroundColor: colors.warning }]} />
                    <Text style={styles.allocationLabel}>Finance</Text>
                    <Text style={styles.allocationValue}>25%</Text>
                </View>
                <View style={styles.allocationItem}>
                    <View style={[styles.allocationDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.allocationLabel}>Healthcare</Text>
                    <Text style={styles.allocationValue}>20%</Text>
                </View>
                <View style={styles.allocationItem}>
                    <View style={[styles.allocationDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.allocationLabel}>Other</Text>
                    <Text style={styles.allocationValue}>10%</Text>
                </View>
            </View>

            <Button title="Rebalance Portfolio" onPress={() => { }} style={styles.tabButton} />
        </ScrollView>
    );
}

function AssetsTab() {
    const holdings = [
        { symbol: 'TSLA', name: 'Tesla', shares: 100, value: 15620, change: 10 },
        { symbol: 'AAPL', name: 'Apple', shares: 50, value: 8500, change: 5.2 },
        { symbol: 'VHT', name: 'Healthcare ETF', shares: 200, value: 32100, change: 3.1 },
    ];

    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {holdings.map((holding, idx) => (
                <TouchableOpacity key={idx} style={[styles.holdingCard, shadows.sm]} activeOpacity={0.7}>
                    <View style={styles.holdingHeader}>
                        <View>
                            <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                            <Text style={styles.holdingName}>{holding.name}</Text>
                        </View>
                        <View style={styles.holdingValue}>
                            <Text style={styles.holdingAmount}>${holding.value.toLocaleString()}</Text>
                            <Text style={[styles.holdingChange, { color: holding.change > 0 ? colors.success : colors.error }]}>
                                {holding.change > 0 ? '+' : ''}{holding.change}%
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.holdingShares}>{holding.shares} shares</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

function TrendsTab() {
    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.chartCard, shadows.sm]}>
                <Text style={styles.chartTitle}>1-Year Performance</Text>
                <View style={styles.trendBars}>
                    {[45, 52, 48, 61, 58, 64, 59, 63, 71, 68, 75, 80].map((val, idx) => (
                        <View key={idx} style={styles.trendBar}>
                            <View
                                style={[
                                    styles.trendBarFill,
                                    {
                                        height: `${(val / 100) * 100}%`,
                                        backgroundColor: colors.primary,
                                    },
                                ]}
                            />
                        </View>
                    ))}
                </View>
                <View style={styles.timeframeButtons}>
                    <TouchableOpacity style={styles.timeButton}>
                        <Text style={styles.timeButtonText}>1D</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.timeButton}>
                        <Text style={styles.timeButtonText}>1W</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.timeButton, styles.activeTimeButton]}>
                        <Text style={[styles.timeButtonText, styles.activeTimeButtonText]}>1Y</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.timeButton}>
                        <Text style={styles.timeButtonText}>ALL</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.subTitle}>Market Sentiment</Text>
            <View style={[styles.sentimentCard, shadows.sm]}>
                <View style={styles.sentimentItem}>
                    <Text style={styles.sentimentLabel}>Bullish</Text>
                    <View style={styles.sentimentBar}>
                        <View style={[styles.sentimentFill, { width: '67%', backgroundColor: colors.success }]} />
                    </View>
                    <Text style={styles.sentimentValue}>67%</Text>
                </View>
                <View style={styles.sentimentItem}>
                    <Text style={styles.sentimentLabel}>Bearish</Text>
                    <View style={styles.sentimentBar}>
                        <View style={[styles.sentimentFill, { width: '33%', backgroundColor: colors.error }]} />
                    </View>
                    <Text style={styles.sentimentValue}>33%</Text>
                </View>
            </View>
        </ScrollView>
    );
}

function ConfigTab() {
    return (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.configCard, shadows.sm]}>
                <Text style={styles.configLabel}>Risk Profile</Text>
                <Text style={styles.configValue}>Moderate</Text>
                <Text style={styles.configHint}>Adjust based on your goals</Text>
            </View>

            <View style={[styles.configCard, shadows.sm]}>
                <Text style={styles.configLabel}>Rebalance Frequency</Text>
                <Text style={styles.configValue}>Quarterly</Text>
                <Text style={styles.configHint}>Every 3 months</Text>
            </View>

            <View style={[styles.configCard, shadows.sm]}>
                <Text style={styles.configLabel}>Connected Accounts</Text>
                <Text style={styles.configValue}>3 accounts</Text>
                <Text style={styles.configHint}>Bank, Brokerage, Crypto</Text>
            </View>

            <Button title="Manage Settings" onPress={() => { }} style={styles.tabButton} />
        </ScrollView>
    );
}

export default function ThesisFlowScreen() {
    const [activeTab, setActiveTab] = React.useState('dash');

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.headerSection}>
                <View>
                    <Text style={styles.title}>ThesisFlow</Text>
                    <Text style={styles.subtitle}>Investment Analysis</Text>
                </View>
            </View>

            {/* Tab Content */}
            {activeTab === 'dash' && <DashTab />}
            {activeTab === 'assets' && <AssetsTab />}
            {activeTab === 'trends' && <TrendsTab />}
            {activeTab === 'config' && <ConfigTab />}

            {/* Tab Bar */}
            <View style={[styles.tabBar, shadows.md]}>
                <TouchableOpacity
                    style={[styles.tabBarItem, activeTab === 'dash' && styles.activeTabBarItem]}
                    onPress={() => setActiveTab('dash')}
                >
                    <MaterialCommunityIcons
                        name="view-dashboard"
                        size={24}
                        color={activeTab === 'dash' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.tabBarLabel, activeTab === 'dash' && styles.activeTabBarLabel]}>
                        DASH
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBarItem, activeTab === 'assets' && styles.activeTabBarItem]}
                    onPress={() => setActiveTab('assets')}
                >
                    <MaterialCommunityIcons
                        name="briefcase"
                        size={24}
                        color={activeTab === 'assets' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.tabBarLabel, activeTab === 'assets' && styles.activeTabBarLabel]}>
                        ASSETS
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBarItem, activeTab === 'trends' && styles.activeTabBarItem]}
                    onPress={() => setActiveTab('trends')}
                >
                    <MaterialCommunityIcons
                        name="chart-line"
                        size={24}
                        color={activeTab === 'trends' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.tabBarLabel, activeTab === 'trends' && styles.activeTabBarLabel]}>
                        TRENDS
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabBarItem, activeTab === 'config' && styles.activeTabBarItem]}
                    onPress={() => setActiveTab('config')}
                >
                    <MaterialCommunityIcons
                        name="cog"
                        size={24}
                        color={activeTab === 'config' ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.tabBarLabel, activeTab === 'config' && styles.activeTabBarLabel]}>
                        CONFIG
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

import React from 'react';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgLight,
    },
    headerSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h2,
        color: colors.textDark,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    tabContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    tabButton: {
        marginBottom: spacing.xl,
    },
    dashCard: {
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        ...shadows.md,
    },
    dashValue: {
        ...typography.h1,
        color: colors.primary,
    },
    dashLabel: {
        ...typography.body,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
    dashChange: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    dashChangeText: {
        ...typography.body,
        color: colors.success,
        fontWeight: '600',
    },
    subTitle: {
        ...typography.h3,
        color: colors.textDark,
        marginBottom: spacing.md,
    },
    allocationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    allocationItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    allocationDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginBottom: spacing.sm,
    },
    allocationLabel: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    allocationValue: {
        ...typography.h3,
        color: colors.textDark,
        marginTop: spacing.xs,
    },
    holdingCard: {
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    holdingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    holdingSymbol: {
        ...typography.h3,
        color: colors.textDark,
    },
    holdingName: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    holdingValue: {
        alignItems: 'flex-end',
    },
    holdingAmount: {
        ...typography.h3,
        color: colors.textDark,
    },
    holdingChange: {
        ...typography.bodySmall,
        fontWeight: '600',
    },
    holdingShares: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    chartCard: {
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    chartTitle: {
        ...typography.h3,
        color: colors.textDark,
        marginBottom: spacing.md,
    },
    trendBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 100,
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    trendBar: {
        flex: 1,
        backgroundColor: colors.bgLight,
        borderRadius: borderRadius.sm,
        height: '100%',
        overflow: 'hidden',
    },
    trendBarFill: {
        width: '100%',
    },
    timeframeButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    timeButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeTimeButton: {
        backgroundColor: colors.primary,
    },
    timeButtonText: {
        ...typography.bodySmall,
        color: colors.textMuted,
        fontWeight: '600',
    },
    activeTimeButtonText: {
        color: colors.bgCardLight,
    },
    sentimentCard: {
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    sentimentItem: {
        marginBottom: spacing.lg,
    },
    sentimentLabel: {
        ...typography.body,
        color: colors.textDark,
        fontWeight: '600',
        marginBottom: spacing.sm,
    },
    sentimentBar: {
        height: 8,
        backgroundColor: colors.bgLight,
        borderRadius: borderRadius.sm,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    sentimentFill: {
        height: '100%',
    },
    sentimentValue: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    configCard: {
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    configLabel: {
        ...typography.body,
        color: colors.textMuted,
        marginBottom: spacing.sm,
    },
    configValue: {
        ...typography.h3,
        color: colors.textDark,
        marginBottom: spacing.sm,
    },
    configHint: {
        ...typography.bodySmall,
        color: colors.textMuted,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: colors.bgCardLight,
        borderTopColor: colors.borderLight,
        borderTopWidth: 1,
        paddingVertical: spacing.sm,
    },
    tabBarItem: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    activeTabBarItem: {},
    tabBarLabel: {
        ...typography.label,
        color: colors.textMuted,
        fontSize: 9,
        marginTop: spacing.xs,
    },
    activeTabBarLabel: {
        color: colors.primary,
    },
});
