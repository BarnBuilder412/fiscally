import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, shadows, borderRadius } from '../lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EngineCardProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    subtitle: string;
    status?: string;
    statusColor?: string;
    progress?: number;
    onPress?: () => void;
}

export default function EngineCard({
    icon,
    title,
    subtitle,
    status,
    statusColor = colors.primary,
    progress,
    onPress,
}: EngineCardProps) {
    return (
        <TouchableOpacity
            style={[styles.card, shadows.md]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.titleSection}>
                    <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
                    <View style={{ marginLeft: spacing.md }}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>
                </View>
                {progress !== undefined && (
                    <View style={styles.progressRing}>
                        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                    </View>
                )}
            </View>
            {status && (
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.bgCardLight,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginVertical: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    title: {
        ...typography.h3,
        color: colors.textDark,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        marginTop: spacing.md,
    },
    statusText: {
        ...typography.label,
        color: colors.bgCardLight,
        fontSize: 11,
    },
    progressRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        ...typography.h3,
        color: colors.primary,
    },
});
