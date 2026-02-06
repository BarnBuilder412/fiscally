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
import { INCOME_RANGES } from '@/constants';
import { eventBus, Events } from '@/services/eventBus';
import { api } from '@/services/api';

export default function IncomePreferencesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedIncome, setSelectedIncome] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSavedIncome();
    }, []);

    const loadSavedIncome = async () => {
        const saved = await AsyncStorage.getItem('user_income');
        if (saved) setSelectedIncome(saved);
    };

    const saveIncome = async () => {
        if (!selectedIncome) return;
        setSaving(true);

        // Save locally
        await AsyncStorage.setItem('user_income', selectedIncome);

        // Sync to backend for goal progress calculations
        try {
            const salaryMap: Record<string, number> = {
                'below_30k': 25000,
                '30k_75k': 52500,
                '75k_150k': 112500,
                'above_150k': 200000,
            };
            await api.updateFinancialProfile({
                salary_range_id: selectedIncome,
                monthly_salary: salaryMap[selectedIncome] || undefined,
            });
        } catch (error) {
            console.warn('Failed to sync income to backend:', error);
        }

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
                <Text style={styles.headerTitle}>Monthly Income</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                <Text style={styles.description}>
                    Select your monthly income range. This helps us provide better insights and budgeting recommendations.
                </Text>

                <View style={styles.optionsContainer}>
                    {INCOME_RANGES.map((range) => (
                        <TouchableOpacity
                            key={range.id}
                            style={[
                                styles.optionCard,
                                selectedIncome === range.id && styles.optionCardSelected,
                            ]}
                            onPress={() => setSelectedIncome(range.id)}
                        >
                            <View style={styles.optionContent}>
                                <Text style={[
                                    styles.optionLabel,
                                    selectedIncome === range.id && styles.optionLabelSelected,
                                ]}>
                                    {range.label}
                                </Text>
                            </View>
                            {selectedIncome === range.id && (
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
                    style={[styles.saveButton, !selectedIncome && styles.saveButtonDisabled]}
                    onPress={saveIncome}
                    disabled={!selectedIncome || saving}
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
