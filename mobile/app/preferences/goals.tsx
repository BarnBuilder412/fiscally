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
import { api } from '@/services/api';
import { GoalDetailForm, GoalDetailData } from '@/components/GoalDetailForm';

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
    const [goalDetails, setGoalDetails] = useState<Record<string, GoalDetailData>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSavedGoals();
    }, []);

    const loadSavedGoals = async () => {
        const saved = await AsyncStorage.getItem('user_goals');
        const savedDetails = await AsyncStorage.getItem('user_goal_details');
        if (saved) {
            try {
                setSelectedGoals(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse goals:', e);
            }
        }
        if (savedDetails) {
            try {
                setGoalDetails(JSON.parse(savedDetails));
            } catch (e) {
                console.error('Failed to parse goal details:', e);
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

    const handleGoalDetailChange = (goalId: string, data: GoalDetailData) => {
        setGoalDetails(prev => ({
            ...prev,
            [goalId]: data,
        }));
    };

    const saveGoals = async () => {
        setSaving(true);

        // Save locally
        await AsyncStorage.setItem('user_goals', JSON.stringify(selectedGoals));
        await AsyncStorage.setItem('user_goal_details', JSON.stringify(goalDetails));

        // Sync to backend for goal progress tracking
        try {
            const goalsToSync = selectedGoals.map((goalId, index) => {
                const details = goalDetails[goalId] || {};
                const goalInfo = SAVINGS_GOALS.find(g => g.id === goalId);
                return {
                    id: goalId,
                    label: goalInfo?.label || goalId,
                    target_amount: details.amount || undefined,
                    target_date: details.date || undefined,
                    priority: index + 1, // Priority based on order: 1 = highest priority
                };
            });
            await api.syncGoals(goalsToSync);
        } catch (error) {
            console.warn('Failed to sync goals to backend:', error);
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

                {/* Priority Ordering Section */}
                {selectedGoals.length > 1 && (
                    <View style={styles.detailsSection}>
                        <Text style={styles.detailsSectionTitle}>🎯 Set Priority Order</Text>
                        <Text style={styles.detailsSectionSubtitle}>
                            Drag goals to reorder. Higher priority goals get savings allocated first.
                        </Text>

                        {selectedGoals.map((goalId, index) => {
                            const goal = SAVINGS_GOALS.find(g => g.id === goalId);
                            if (!goal) return null;

                            const moveUp = () => {
                                if (index === 0) return;
                                const newOrder = [...selectedGoals];
                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                setSelectedGoals(newOrder);
                            };

                            const moveDown = () => {
                                if (index === selectedGoals.length - 1) return;
                                const newOrder = [...selectedGoals];
                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                setSelectedGoals(newOrder);
                            };

                            return (
                                <View key={goal.id} style={styles.priorityItem}>
                                    <View style={styles.priorityRank}>
                                        <Text style={styles.priorityRankText}>{index + 1}</Text>
                                    </View>
                                    <View style={[styles.priorityIcon, { backgroundColor: goal.color + '20' }]}>
                                        <Ionicons name={goal.icon as any} size={18} color={goal.color} />
                                    </View>
                                    <Text style={styles.priorityLabel}>{goal.label}</Text>
                                    <View style={styles.priorityButtons}>
                                        <TouchableOpacity
                                            onPress={moveUp}
                                            style={[styles.priorityBtn, index === 0 && styles.priorityBtnDisabled]}
                                            disabled={index === 0}
                                        >
                                            <Ionicons name="chevron-up" size={20} color={index === 0 ? Colors.gray300 : Colors.textPrimary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={moveDown}
                                            style={[styles.priorityBtn, index === selectedGoals.length - 1 && styles.priorityBtnDisabled]}
                                            disabled={index === selectedGoals.length - 1}
                                        >
                                            <Ionicons name="chevron-down" size={20} color={index === selectedGoals.length - 1 ? Colors.gray300 : Colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Goal Details Section */}
                {selectedGoals.length > 0 && (
                    <View style={styles.detailsSection}>
                        <Text style={styles.detailsSectionTitle}>Set Your Targets</Text>
                        <Text style={styles.detailsSectionSubtitle}>
                            Configure amounts and dates for your selected goals
                        </Text>

                        {selectedGoals.map((goalId) => {
                            const goal = SAVINGS_GOALS.find(g => g.id === goalId);
                            if (!goal) return null;

                            return (
                                <GoalDetailForm
                                    key={goal.id}
                                    goalId={goal.id}
                                    goalLabel={goal.label}
                                    goalIcon={goal.icon}
                                    goalColor={goal.color}
                                    data={goalDetails[goal.id] || { amount: '', date: '' }}
                                    onChange={handleGoalDetailChange}
                                />
                            );
                        })}
                    </View>
                )}
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
    detailsSection: {
        marginTop: Spacing.xl,
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
    },
    detailsSectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    detailsSectionSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    priorityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    priorityRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    priorityRankText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: Colors.white,
    },
    priorityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    priorityLabel: {
        flex: 1,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.textPrimary,
    },
    priorityButtons: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    priorityBtn: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priorityBtnDisabled: {
        opacity: 0.4,
    },
});
