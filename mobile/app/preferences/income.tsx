import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
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

export default function IncomePreferencesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [exactIncome, setExactIncome] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSavedIncome();
    }, []);

    const loadSavedIncome = async () => {
        const saved = await AsyncStorage.getItem('user_income');
        if (saved) setExactIncome(saved);
    };

    const saveIncome = async () => {
        if (!exactIncome) return;
        setSaving(true);

        // Save locally
        await AsyncStorage.setItem('user_income', exactIncome);

        // Sync to backend for goal progress calculations
        try {
            await api.updateFinancialProfile({
                monthly_salary: parseInt(exactIncome.replace(/,/g, '')),
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
                    Enter your exact monthly income. This helps calculate precise savings allocations for your goals.
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Monthly Income (₹)</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 85000"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                        value={exactIncome}
                        onChangeText={setExactIncome}
                    />
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={[styles.saveButton, !exactIncome && styles.saveButtonDisabled]}
                    onPress={saveIncome}
                    disabled={!exactIncome || saving}
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
    inputContainer: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    textInput: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.gray200,
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

