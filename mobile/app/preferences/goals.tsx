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

const SAVINGS_GOALS = [
    { id: 'emergency', label: 'Emergency Fund', icon: 'shield-checkmark', color: '#22C55E', description: '3-6 months of expenses' },
    { id: 'vacation', label: 'Vacation', icon: 'airplane', color: '#3B82F6', description: 'Travel and experiences' },
    { id: 'investment', label: 'Investment', icon: 'trending-up', color: '#8B5CF6', description: 'Stocks, mutual funds, etc.' },
    { id: 'gadget', label: 'New Gadget', icon: 'phone-portrait', color: '#EC4899', description: 'Electronics and tech' },
    { id: 'home', label: 'Home/Rent', icon: 'home', color: '#F59E0B', description: 'Housing expenses' },
    { id: 'education', label: 'Education', icon: 'school', color: '#06B6D4', description: 'Courses and learning' },
    { id: 'vehicle', label: 'Vehicle', icon: 'car', color: '#EF4444', description: 'Car, bike, etc.' },
    { id: 'wedding', label: 'Wedding', icon: 'heart', color: '#F472B6', description: 'Special celebrations' },
];

export default function GoalsPreferencesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSavedGoals();
    }, []);

    const loadSavedGoals = async () => {
        const saved = await AsyncStorage.getItem('user_goals');
        if (saved) {
            try {
                setSelectedGoals(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse goals:', e);
            }
        }
    };

    const toggleGoal = (goalId: string) => {
        setSelectedGoals(prev =>
            prev.includes(goalId)
                ? prev.filter(id => id !== goalId)
                : [...prev, goalId]
        );
    };

    const saveGoals = async () => {
        setSaving(true);
        await AsyncStorage.setItem('user_goals', JSON.stringify(selectedGoals));
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
                <Text style={styles.headerTitle}>Savings Goals</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                <Text style={styles.description}>
                    Select the goals you're saving for. We'll track your progress and provide personalized tips.
                </Text>

                <Text style={styles.selectedCount}>
                    {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected
                </Text>

                <View style={styles.goalsGrid}>
                    {SAVINGS_GOALS.map((goal) => {
                        const isSelected = selectedGoals.includes(goal.id);
                        return (
                            <TouchableOpacity
                                key={goal.id}
                                style={[
                                    styles.goalCard,
                                    isSelected && { borderColor: goal.color, backgroundColor: goal.color + '10' },
                                ]}
                                onPress={() => toggleGoal(goal.id)}
                            >
                                <View style={[styles.goalIcon, { backgroundColor: goal.color + '20' }]}>
                                    <Ionicons name={goal.icon as any} size={24} color={goal.color} />
                                </View>
                                <Text style={[styles.goalLabel, isSelected && { color: goal.color }]}>
                                    {goal.label}
                                </Text>
                                <Text style={styles.goalDescription}>{goal.description}</Text>
                                {isSelected && (
                                    <View style={[styles.checkBadge, { backgroundColor: goal.color }]}>
                                        <Ionicons name="checkmark" size={14} color={Colors.white} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveGoals}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Saving...' : 'Save Goals'}
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
        marginBottom: Spacing.md,
        lineHeight: 22,
    },
    selectedCount: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.primary,
        marginBottom: Spacing.lg,
    },
    goalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    goalCard: {
        width: '47%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.gray200,
        position: 'relative',
    },
    goalIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    goalLabel: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    goalDescription: {
        fontSize: FontSize.xs,
        color: Colors.gray500,
    },
    checkBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 22,
        height: 22,
        borderRadius: 11,
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
    saveButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.white,
    },
});
