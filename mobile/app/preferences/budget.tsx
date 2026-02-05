import React, { useState, useEffect } from 'react';
import {
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

const BUDGET_RANGES = [
    { id: 'below_20k', label: 'Below ₹20,000', description: 'Tight budget, focus on essentials' },
    { id: '20k_40k', label: '₹20,000 - ₹40,000', description: 'Moderate spending' },
    { id: '40k_70k', label: '₹40,000 - ₹70,000', description: 'Comfortable budget' },
    { id: '70k_100k', label: '₹70,000 - ₹1,00,000', description: 'Flexible spending' },
    { id: 'above_100k', label: 'Above ₹1,00,000', description: 'Premium lifestyle' },
];

export default function BudgetPreferencesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSavedBudget();
    }, []);

    const loadSavedBudget = async () => {
        const saved = await AsyncStorage.getItem('user_budget');
        if (saved) setSelectedBudget(saved);
    };

    const saveBudget = async () => {
        if (!selectedBudget) return;
        setSaving(true);
        await AsyncStorage.setItem('user_budget', selectedBudget);
        eventBus.emit(Events.PREFERENCES_CHANGED);
        setSaving(false);
        router.back();
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
                                    {range.label}
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
