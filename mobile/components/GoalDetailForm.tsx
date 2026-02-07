import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
    Colors,
    Spacing,
    FontSize,
    FontWeight,
    BorderRadius,
} from '@/constants/theme';
import { getCurrencySymbol } from '@/utils/currency';

export interface GoalDetailData {
    amount: string;
    date: string;
}

interface GoalDetailFormProps {
    goalId: string;
    goalLabel: string;
    goalIcon: string;
    goalColor: string;
    data: GoalDetailData;
    onChange: (goalId: string, data: GoalDetailData) => void;
    compact?: boolean;
    currencyCode?: string;
}

export function GoalDetailForm({
    goalId,
    goalLabel,
    goalIcon,
    goalColor,
    data,
    onChange,
    compact = false,
    currencyCode = 'INR',
}: GoalDetailFormProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (event.type === 'set' && selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            onChange(goalId, { ...data, date: dateStr });
            if (Platform.OS === 'ios') {
                setShowDatePicker(false);
            }
        } else if (event.type === 'dismissed') {
            setShowDatePicker(false);
        }
    };

    const parsedDate = data.date ? new Date(data.date) : new Date();

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            {!compact && (
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: goalColor + '20' }]}>
                        <Ionicons name={goalIcon as any} size={compact ? 20 : 28} color={goalColor} />
                    </View>
                    <Text style={styles.title}>{goalLabel}</Text>
                </View>
            )}

            <View style={styles.formRow}>
                <View style={[styles.inputWrapper, compact && styles.inputWrapperCompact]}>
                    <Text style={styles.label}>Target Amount ({getCurrencySymbol(currencyCode)})</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 1,00,000"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                        value={data.amount}
                        onChangeText={(text) => onChange(goalId, { ...data, amount: text })}
                    />
                </View>

                <View style={[styles.inputWrapper, compact && styles.inputWrapperCompact]}>
                    <Text style={styles.label}>Target Date</Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={data.date ? styles.dateText : styles.datePlaceholder}>
                            {data.date || 'Select date'}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color={Colors.gray500} />
                    </TouchableOpacity>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={parsedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginBottom: Spacing.md,
    },
    containerCompact: {
        padding: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.textPrimary,
        flex: 1,
    },
    formRow: {
        gap: Spacing.md,
    },
    inputWrapper: {
        marginBottom: Spacing.sm,
    },
    inputWrapperCompact: {
        marginBottom: Spacing.xs,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
        marginLeft: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
    dateInput: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateText: {
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
    datePlaceholder: {
        fontSize: FontSize.md,
        color: Colors.gray400,
    },
});
