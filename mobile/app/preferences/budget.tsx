import React, { useState, useEffect } from 'react';
import {
    Alert,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Colors,
    Spacing,
    FontSize,
    FontWeight,
    BorderRadius,
} from '@/constants/theme';
import { eventBus, Events } from '@/services/eventBus';
import { api } from '@/services/api';
import { formatCurrency } from '@/utils/currency';

const BUDGET_RANGES = [
    { id: 'below_20k', min: 0, max: 20000, description: 'Tight budget, focus on essentials' },
    { id: '20k_40k', min: 20000, max: 40000, description: 'Moderate spending' },
    { id: '40k_70k', min: 40000, max: 70000, description: 'Comfortable budget' },
    { id: '70k_100k', min: 70000, max: 100000, description: 'Flexible spending' },
    { id: 'above_100k', min: 100000, max: null, description: 'Premium lifestyle' },
];

export default function BudgetPreferencesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [currencyCode, setCurrencyCode] = useState('INR');

    useEffect(() => {
        loadSavedBudget();
        loadCurrency();
    }, []);

    const loadSavedBudget = async () => {
        const saved = await AsyncStorage.getItem('user_budget');
        if (saved) setSelectedBudget(saved);
    };

    const loadCurrency = async () => {
        try {
            const profile = await api.getProfile();
            const code = profile?.profile?.identity?.currency || profile?.profile?.currency;
            if (code) setCurrencyCode(String(code).toUpperCase());
        } catch {
            // Keep default currency fallback.
        }
    };

    const formatRangeLabel = (range: { min: number; max: number | null }) => {
        if (range.max === null) {
            return `Above ${formatCurrency(range.min, currencyCode)}`;
        }
        if (range.min <= 0) {
            return `Below ${formatCurrency(range.max, currencyCode)}`;
        }
        return `${formatCurrency(range.min, currencyCode)} - ${formatCurrency(range.max, currencyCode)}`;
    };

    const saveBudget = async () => {
        if (!selectedBudget) return;
        setSaving(true);

        try {
            const budgetMap: Record<string, number> = {
                'below_20k': 15000,
                '20k_40k': 30000,
                '40k_70k': 55000,
                '70k_100k': 85000,
                'above_100k': 120000,
            };
            await api.updateFinancialProfile({
                budget_range_id: selectedBudget,
                monthly_budget: budgetMap[selectedBudget] || undefined,
            });
            await AsyncStorage.setItem('user_budget', selectedBudget);
            eventBus.emit(Events.PREFERENCES_CHANGED);
            router.back();
        } catch (error) {
            console.warn('Failed to sync budget to backend:', error);
            Alert.alert(
                'Save failed',
                'Budget could not be synced to backend. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Monthly Budget</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                <Text style={styles.description}>
                    Set your monthly spending budget. We'll help you track your progress and alert you when you're nearing your limit.
                </Text>

                <View style={styles.optionsContainer}>
                    {BUDGET_RANGES.map((range) => (
                        <TouchableOpacity
                            key={range.id}
                            style={[
                                styles.optionCard,
                                selectedBudget === range.id && styles.optionCardSelected,
                            ]}
                            onPress={() => setSelectedBudget(range.id)}
                        >
                            <View style={styles.optionContent}>
                                <Text style={[
                                    styles.optionLabel,
                                    selectedBudget === range.id && styles.optionLabelSelected,
                                ]}>
                                    {formatRangeLabel(range)}
                                </Text>
                                <Text style={styles.optionDescription}>{range.description}</Text>
                            </View>
                            {selectedBudget === range.id && (
                                <View style={styles.checkmark}>
                                    <Ionicons name="checkmark" size={18} color={Colors.white} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={[styles.saveButton, !selectedBudget && styles.saveButtonDisabled]}
                    onPress={saveBudget}
                    disabled={!selectedBudget || saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Text>
                </TouchableOpacity>
            </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.textPrimary,
    },
    content: {
        flex: 1,
        padding: Spacing.lg,
    },
    description: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    optionsContainer: {
        gap: Spacing.md,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.gray200,
    },
    optionCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    optionContent: {
        flex: 1,
    },
    optionLabel: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textPrimary,
    },
    optionLabelSelected: {
        color: Colors.primary,
    },
    optionDescription: {
        fontSize: FontSize.sm,
        color: Colors.gray500,
        marginTop: 2,
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        backgroundColor: Colors.background,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: Colors.gray300,
    },
    saveButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.white,
    },
});
