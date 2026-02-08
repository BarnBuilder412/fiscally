import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Transaction } from '@/types';
import { formatCurrency } from '@/utils/currency';

type AlertType =
    | 'anomaly'
    | 'budget_warning'
    | 'budget_exceeded'
    | 'goal_milestone'
    | 'goal_at_risk'
    | 'tip';

interface Alert {
    id: string;
    type: AlertType;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    transaction?: Transaction;
    actionable?: boolean;
}

interface ServerAlert {
    id: string;
    type: AlertType;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    transaction_id?: string;
}

interface SmartAlertsProps {
    transactions: Transaction[];
    budgetPercentage: number;
    primaryCurrency?: string;
    serverAlerts?: ServerAlert[];
    onDismiss?: (alertId: string) => void;
    onViewTransaction?: (transaction: Transaction) => void;
}

type DismissedAlertMap = Record<
    string,
    {
        dismissed_at: number;
        type: AlertType;
    }
>;

const STORAGE_KEY = 'smart_alerts_dismissed_v2';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const ALERT_TTL_MS: Record<AlertType, number> = {
    anomaly: 7 * 24 * 60 * 60 * 1000,
    budget_warning: 12 * 60 * 60 * 1000,
    budget_exceeded: 6 * 60 * 60 * 1000,
    goal_milestone: 3 * 24 * 60 * 60 * 1000,
    goal_at_risk: 12 * 60 * 60 * 1000,
    tip: 24 * 60 * 60 * 1000,
};

const ALERT_CONFIGS = {
    anomaly: { icon: 'warning-outline', color: Colors.warning },
    budget_warning: { icon: 'alert-circle-outline', color: Colors.warning },
    budget_exceeded: { icon: 'close-circle-outline', color: Colors.error },
    goal_milestone: { icon: 'flag-outline', color: Colors.primary },
    goal_at_risk: { icon: 'alert-outline', color: Colors.warning },
    tip: { icon: 'bulb-outline', color: Colors.primary },
};

function inferAlertTypeFromId(alertId: string): AlertType {
    if (alertId.startsWith('anomaly-')) return 'anomaly';
    if (alertId.startsWith('budget-exceeded')) return 'budget_exceeded';
    if (alertId.startsWith('budget-warning')) return 'budget_warning';
    if (alertId.startsWith('goal-risk-')) return 'goal_at_risk';
    if (alertId.startsWith('goal-milestone-')) return 'goal_milestone';
    return 'tip';
}

function normalizeDismissedState(raw: unknown): DismissedAlertMap {
    if (!raw || typeof raw !== 'object') return {};

    const normalized: DismissedAlertMap = {};
    for (const [alertId, entry] of Object.entries(raw as Record<string, unknown>)) {
        if (!entry || typeof entry !== 'object') {
            if (typeof entry === 'number') {
                normalized[alertId] = {
                    dismissed_at: entry,
                    type: inferAlertTypeFromId(alertId),
                };
            }
            continue;
        }
        const dismissedAt = Number((entry as any).dismissed_at);
        const type = (entry as any).type as AlertType | undefined;
        if (!Number.isFinite(dismissedAt)) continue;
        normalized[alertId] = {
            dismissed_at: dismissedAt,
            type: type || inferAlertTypeFromId(alertId),
        };
    }
    return normalized;
}

function pruneExpiredDismissals(entries: DismissedAlertMap): DismissedAlertMap {
    const now = Date.now();
    const next: DismissedAlertMap = {};
    for (const [alertId, entry] of Object.entries(entries)) {
        const ttl = ALERT_TTL_MS[entry.type] ?? DEFAULT_TTL_MS;
        if (now - entry.dismissed_at < ttl) {
            next[alertId] = entry;
        }
    }
    return next;
}

export const SmartAlerts = ({
    transactions,
    budgetPercentage,
    primaryCurrency,
    serverAlerts = [],
    onDismiss,
    onViewTransaction,
}: SmartAlertsProps) => {
    const [dismissedMap, setDismissedMap] = useState<DismissedAlertMap>({});
    const [dismissedLoaded, setDismissedLoaded] = useState(false);
    const effectiveCurrency = primaryCurrency || transactions[0]?.currency || 'INR';

    useEffect(() => {
        const loadDismissed = async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                const parsed = raw ? JSON.parse(raw) : {};
                const normalized = normalizeDismissedState(parsed);
                const pruned = pruneExpiredDismissals(normalized);
                setDismissedMap(pruned);
                if (JSON.stringify(normalized) !== JSON.stringify(pruned)) {
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
                }
            } catch (error) {
                console.log('Failed to load dismissed smart alerts:', error);
                setDismissedMap({});
            } finally {
                setDismissedLoaded(true);
            }
        };

        loadDismissed();
    }, []);

    const isDismissed = (alertId: string): boolean => {
        const entry = dismissedMap[alertId];
        if (!entry) return false;
        const ttl = ALERT_TTL_MS[entry.type] ?? DEFAULT_TTL_MS;
        return Date.now() - entry.dismissed_at < ttl;
    };

    const alerts = useMemo(() => {
        const alerts: Alert[] = [];
        const txById = new Map(transactions.map((transaction) => [transaction.id, transaction]));

        // Server-provided alerts are added first (already prioritized by backend logic).
        for (const alert of serverAlerts) {
            if (isDismissed(alert.id)) continue;
            const linkedTransaction = alert.transaction_id ? txById.get(alert.transaction_id) : undefined;
            alerts.push({
                id: alert.id,
                type: alert.type,
                title: alert.title,
                message: alert.message,
                severity: alert.severity,
                transaction: linkedTransaction,
                actionable: Boolean(linkedTransaction),
            });
        }

        const hasBudgetAlert = alerts.some(
            (alert) => alert.type === 'budget_warning' || alert.type === 'budget_exceeded'
        );
        const hasAnomalyAlert = alerts.some((alert) => alert.type === 'anomaly');

        // Budget alerts get highest priority.
        if (!hasBudgetAlert && budgetPercentage >= 100 && !isDismissed('budget-exceeded')) {
            alerts.push({
                id: 'budget-exceeded',
                type: 'budget_exceeded',
                title: 'Budget Exceeded',
                message: `You've exceeded your monthly budget by ${Math.round(budgetPercentage - 100)}%`,
                severity: 'critical',
            });
        } else if (!hasBudgetAlert && budgetPercentage >= 90 && !isDismissed('budget-warning')) {
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
            .filter(t => t.is_anomaly && !isDismissed(`anomaly-${t.id}`))
            .sort((a, b) => new Date(b.transaction_at || b.created_at).getTime() - new Date(a.transaction_at || a.created_at).getTime())[0];
        if (!hasAnomalyAlert && anomaly) {
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
            && !isDismissed('luxury-share')
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
    }, [transactions, budgetPercentage, serverAlerts, dismissedMap, effectiveCurrency]);

    const handleDismiss = async (alert: Alert) => {
        const nextMap: DismissedAlertMap = {
            ...dismissedMap,
            [alert.id]: {
                dismissed_at: Date.now(),
                type: alert.type,
            },
        };
        setDismissedMap(nextMap);
        onDismiss?.(alert.id);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
        } catch (error) {
            console.log('Failed to persist dismissed smart alert:', error);
        }
    };

    if (!dismissedLoaded) return null;
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
                                        onPress={() => handleDismiss(alert)}
                                    >
                                        <Text style={styles.actionButtonTextSecondary}>It's Planned</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={() => handleDismiss(alert)}
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
