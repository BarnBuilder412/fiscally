import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, shadows, borderRadius } from '../lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface KPICardProps {
label: string;
value: string;
change: string;
changeType: 'positive' | 'negative';
}

export default function KPICard({ label, value, change, changeType }: KPICardProps) {
const changeColor = changeType === 'positive' ? colors.success : colors.error;

return (
<View style={[styles.card, shadows.md]}>
<Text style={styles.label}>{label}</Text>
<Text style={styles.value}>{value}</Text>
<View style={styles.changeRow}>
<MaterialCommunityIcons
name={changeType === 'positive' ? 'trending-up' : 'trending-down'}
size={16}
color={changeColor}
/>
<Text style={[styles.change, { color: changeColor }]}>{change}</Text>
</View>
</View>
);
}

const styles = StyleSheet.create({
card: {
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginRight: spacing.lg,
minWidth: 160,
},
label: {
...typography.label,
color: colors.textMuted,
marginBottom: spacing.sm,
},
value: {
...typography.h2,
color: colors.primary,
marginBottom: spacing.sm,
},
changeRow: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.xs,
},
change: {
...typography.bodySmall,
fontWeight: '600',
},
});
