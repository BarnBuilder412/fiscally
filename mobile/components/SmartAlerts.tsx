import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';

interface Alert {
    id: string;
    type: 'anomaly' | 'budget_warning' | 'budget_exceeded' | 'tip';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    transaction?: Transaction;
    actionable?: boolean;
}

interface SmartAlertsProps {
    transactions: Transaction[];
    budgetPercentage: number;
    primaryCurrency?: string;
    onDismiss?: (alertId: string) => void;
    onViewTransaction?: (transaction: Transaction) => void;
}

const ALERT_CONFIGS = {
    anomaly: { icon: 'warning-outline', color: Colors.warning },
    budget_warning: { icon: 'alert-circle-outline', color: Colors.warning },
    budget_exceeded: { icon: 'close-circle-outline', color: Colors.error },
    tip: { icon: 'bulb-outline', color: Colors.primary },
};

export const SmartAlerts = ({
    transactions,
    budgetPercentage,
    primaryCurrency,
    onDismiss,
    onViewTransaction,
}: SmartAlertsProps) => {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const effectiveCurrency = primaryCurrency || transactions[0]?.currency || 'INR';

    // Generate alerts from data
    const generateAlerts = (): Alert[] => {
        const alerts: Alert[] = [];

        // Budget alerts get highest priority.
        if (budgetPercentage >= 100 && !dismissedIds.has('budget-exceeded')) {
            alerts.push({
                id: 'budget-exceeded',
                type: 'budget_exceeded',
                title: 'Budget Exceeded',
                message: `You've exceeded your monthly budget by ${Math.round(budgetPercentage - 100)}%`,
                severity: 'critical',
            });
        } else if (budgetPercentage >= 90 && !dismissedIds.has('budget-warning')) {
            alerts.push({
                id: 'budget-warning',
                type: 'budget_warning',
                title: 'Budget Warning',
                message: `You've used ${Math.round(budgetPercentage)}% of your monthly budget`,
                severity: 'warning',
            });
        }

        // Add only the most recent anomaly to reduce noise.
        const anomaly = transactions
            .filter(t => t.is_anomaly && !dismissedIds.has(`anomaly-${t.id}`))
            .sort((a, b) => new Date(b.transaction_at || b.created_at).getTime() - new Date(a.transaction_at || a.created_at).getTime())[0];
        if (anomaly) {
            alerts.push({
                id: `anomaly-${anomaly.id}`,
                type: 'anomaly',
                title: 'Unusual Transaction',
                message: anomaly.anomaly_reason || `${formatCurrency(anomaly.amount, anomaly.currency || effectiveCurrency)} at ${anomaly.merchant || 'Unknown'}`,
                severity: 'warning',
                transaction: anomaly,
                actionable: true,
            });
        }

        // Spending mix alerts are informational and shown only when no critical/warning overload.
        const luxuryTransactions = transactions.filter(t => t.spend_class === 'luxury');
        const luxuryTotal = luxuryTransactions.reduce((sum, t) => sum + t.amount, 0);
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const luxuryShare = total > 0 ? (luxuryTotal / total) * 100 : 0;
        if (
            alerts.length < 2
            && luxuryTransactions.length >= 3
            && luxuryShare >= 40
            && !dismissedIds.has('luxury-share')
        ) {
            alerts.push({
                id: 'luxury-share',
                type: 'tip',
                title: 'Lifestyle Spend Alert',
                message: `${Math.round(luxuryShare)}% of recent spend is luxury-tagged. Review if this aligns with your goals.`,
                severity: 'info',
            });
        }

        const severityRank = { critical: 0, warning: 1, info: 2 };
        return alerts
            .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
            .slice(0, 2);
    };

    const alerts = generateAlerts();

    const handleDismiss = (alertId: string) => {
        setDismissedIds(prev => new Set([...prev, alertId]));
        onDismiss?.(alertId);
    };

    if (alerts.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="notifications" size={18} color={Colors.warning} />
                <Text style={styles.title}>Smart Alerts</Text>
                <Text style={styles.badge}>{alerts.length}</Text>
            </View>

            {alerts.map(alert => {
                const config = ALERT_CONFIGS[alert.type];
                return (
                    <View
                        key={alert.id}
                        style={[
                            styles.alertCard,
                            alert.severity === 'critical' && styles.alertCritical,
                            alert.severity === 'warning' && styles.alertWarning,
                        ]}
                    >
                        <View style={[styles.alertIcon, { backgroundColor: config.color + '20' }]}>
                            <Ionicons name={config.icon as any} size={20} color={config.color} />
                        </View>

                        <View style={styles.alertContent}>
                            <Text style={styles.alertTitle}>{alert.title}</Text>
                            <Text style={styles.alertMessage}>{alert.message}</Text>

                            {alert.actionable && alert.transaction && (
                                <View style={styles.alertActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => onViewTransaction?.(alert.transaction!)}
                                    >
                                        <Text style={styles.actionButtonText}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.actionButtonSecondary]}
                                        onPress={() => handleDismiss(alert.id)}
                                    >
                                        <Text style={styles.actionButtonTextSecondary}>It's Planned</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={() => handleDismiss(alert.id)}
                        >
                            <Ionicons name="close" size={16} color={Colors.gray400} />
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textPrimary,
        flex: 1,
    },
    badge: {
        backgroundColor: Colors.warning,
        color: Colors.white,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    alertCard: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    alertWarning: {
        borderColor: Colors.warning + '50',
        backgroundColor: Colors.warning + '08',
    },
    alertCritical: {
        borderColor: Colors.error + '50',
        backgroundColor: Colors.error + '08',
    },
    alertIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textPrimary,
    },
    alertMessage: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    alertActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    actionButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
    },
    actionButtonText: {
        color: Colors.white,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    actionButtonSecondary: {
        backgroundColor: Colors.gray100,
    },
    actionButtonTextSecondary: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    dismissButton: {
        padding: 4,
        marginLeft: Spacing.sm,
    },
});
