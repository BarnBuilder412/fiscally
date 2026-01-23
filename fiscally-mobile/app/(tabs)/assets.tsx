import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { Wallet, CreditCard, PiggyBank, TrendingUp } from 'lucide-react-native';

const colors = {
    background: '#F1EFE9',
    card: '#FFFFFF',
    primary: '#6366F1',
    foreground: '#2D3436',
    muted: '#9CA3AF',
    border: '#E2E2E2',
    success: '#10B981',
};

export default function AssetsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>ASSETS</Text>
                    <Text style={styles.headerSubtitle}>Portfolio Overview</Text>
                </View>

                {/* Total Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
                    <Text style={styles.balanceValue}>$84,245.00</Text>
                    <View style={styles.trendRow}>
                        <TrendingUp size={14} color={colors.success} />
                        <Text style={styles.trendText}>+3.4% this month</Text>
                    </View>
                </View>

                {/* Asset Categories */}
                <Text style={styles.sectionTitle}>BREAKDOWN</Text>

                <View style={styles.assetCard}>
                    <View style={styles.assetIcon}>
                        <Wallet size={20} color={colors.primary} />
                    </View>
                    <View style={styles.assetInfo}>
                        <Text style={styles.assetName}>Cash & Savings</Text>
                        <Text style={styles.assetAmount}>$24,500.00</Text>
                    </View>
                    <Text style={styles.assetPercent}>29%</Text>
                </View>

                <View style={styles.assetCard}>
                    <View style={styles.assetIcon}>
                        <CreditCard size={20} color={colors.primary} />
                    </View>
                    <View style={styles.assetInfo}>
                        <Text style={styles.assetName}>Investments</Text>
                        <Text style={styles.assetAmount}>$45,200.00</Text>
                    </View>
                    <Text style={styles.assetPercent}>54%</Text>
                </View>

                <View style={styles.assetCard}>
                    <View style={styles.assetIcon}>
                        <PiggyBank size={20} color={colors.primary} />
                    </View>
                    <View style={styles.assetInfo}>
                        <Text style={styles.assetName}>Retirement</Text>
                        <Text style={styles.assetAmount}>$14,545.00</Text>
                    </View>
                    <Text style={styles.assetPercent}>17%</Text>
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
    balanceCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.muted,
        letterSpacing: 1,
        marginBottom: 8,
    },
    balanceValue: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.foreground,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
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
    assetCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    assetIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    assetInfo: {
        flex: 1,
    },
    assetName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.foreground,
    },
    assetAmount: {
        fontSize: 13,
        color: colors.muted,
        marginTop: 2,
    },
    assetPercent: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
});
