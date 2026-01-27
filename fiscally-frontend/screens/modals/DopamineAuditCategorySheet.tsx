import React, { useState } from 'react';
import {
View,
Text,
StyleSheet,
ScrollView,
TouchableOpacity,
Switch,
Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../lib/theme';
import Button from '../../components/Button';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EMOTIONS = ['Neutral', 'Stressed', 'Happy'];

interface CategorySheetProps {
category: string;
amount: number;
onClose: () => void;
}

export default function DopamineAuditCategorySheet({
category,
amount,
onClose,
}: CategorySheetProps) {
const [windDownEnabled, setWindDownEnabled] = useState(false);
const [timeRange, setTimeRange] = useState('7d');

// Mock heatmap data
const heatmapData = [
{ day: 'Mon', neutral: 20, stressed: 45, happy: 15 },
{ day: 'Tue', neutral: 30, stressed: 60, happy: 20 },
{ day: 'Wed', neutral: 15, stressed: 25, happy: 10 },
{ day: 'Thu', neutral: 35, stressed: 80, happy: 25 },
{ day: 'Fri', neutral: 25, stressed: 40, happy: 30 },
{ day: 'Sat', neutral: 40, stressed: 35, happy: 50 },
{ day: 'Sun', neutral: 20, stressed: 50, happy: 35 },
];

const maxValue = Math.max(
...heatmapData.flatMap((d) => [d.neutral, d.stressed, d.happy])
);

const getEmotionColor = (emotion: string) => {
switch (emotion) {
case 'Neutral':
return colors.neutral;
case 'Stressed':
return colors.energy;
case 'Happy':
return colors.primary;
default:
return colors.textMuted;
}
};

return (
<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
{/* Header */}
<View style={[styles.header, shadows.sm]}>
<TouchableOpacity onPress={onClose}>
<MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
</TouchableOpacity>
<View style={{ flex: 1, marginLeft: spacing.md }}>
<Text style={styles.headerTitle}>{category}</Text>
<Text style={styles.headerSubtitle}>${amount.toFixed(2)} this week</Text>
</View>
</View>

<ScrollView
style={styles.scroll}
contentContainerStyle={styles.scrollContent}
showsVerticalScrollIndicator={false}
>
{/* Pattern Analysis */}
<View style={[styles.card, shadows.sm]}>
<Text style={styles.cardTitle}>Your Pattern</Text>
<Text style={styles.insight}>
You spent 3.5x more after 11 PM on {category.toLowerCase()}.
</Text>
<Text style={styles.insightSecondary}>
Every late-night session ended in a purchase. We're seeing a pattern.
</Text>
</View>

{/* Time Range Toggle */}
<View style={styles.timeRangeContainer}>
{['7d', '30d', '90d'].map((range) => (
<TouchableOpacity
key={range}
style={[
styles.timeRangeButton,
timeRange === range && styles.timeRangeButtonActive,
]}
onPress={() => setTimeRange(range)}
>
<Text
style={[
styles.timeRangeText,
timeRange === range && styles.timeRangeTextActive,
]}
>
{range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30' : 'Last 90'}
</Text>
</TouchableOpacity>
))}
</View>

{/* Heatmap */}
<View style={[styles.heatmapCard, shadows.sm]}>
<Text style={styles.cardTitle}>Spending Heatmap</Text>

{/* Legend */}
<View style={styles.legend}>
{EMOTIONS.map((emotion) => (
<View key={emotion} style={styles.legendItem}>
<View
style={[
styles.legendDot,
{ backgroundColor: getEmotionColor(emotion) },
]}
/>
<Text style={styles.legendLabel}>{emotion}</Text>
</View>
))}
</View>

{/* Grid */}
<View style={styles.heatmapGrid}>
{heatmapData.map((dayData) => (
<View key={dayData.day} style={styles.dayColumn}>
<View style={styles.emotionBars}>
<View
style={[
styles.heatmapBar,
{
height: (dayData.neutral / maxValue) * 80,
backgroundColor: colors.neutral,
},
]}
/>
<View
style={[
styles.heatmapBar,
{
height: (dayData.stressed / maxValue) * 80,
backgroundColor: colors.energy,
},
]}
/>
<View
style={[
styles.heatmapBar,
{
height: (dayData.happy / maxValue) * 80,
backgroundColor: colors.primary,
},
]}
/>
</View>
<Text style={styles.dayLabel}>{dayData.day}</Text>
</View>
))}
</View>
</View>

{/* Wind Down Mode */}
<View style={[styles.card, shadows.sm]}>
<View style={styles.windDownHeader}>
<View>
<Text style={styles.cardTitle}>Wind Down Mode</Text>
<Text style={styles.cardSubtitle}>Break the impulse cycle</Text>
</View>
<Switch
value={windDownEnabled}
onValueChange={setWindDownEnabled}
trackColor={{ false: colors.borderLight, true: colors.primary }}
thumbColor={colors.bgCardLight}
/>
</View>
{windDownEnabled && (
<Text style={styles.windDownDesc}>
Purchases after midnight will have a 30-second approval delay. This gives you
time to reconsider impulse buys.
</Text>
)}
</View>

{/* Actions */}
<Button title="Set Spending Alert" onPress={() => {}} style={styles.actionButton} />

<View style={styles.helperBox}>
<MaterialCommunityIcons
name="lightbulb-on"
size={16}
color={colors.warning}
style={{ marginRight: spacing.sm }}
/>
<Text style={styles.helperText}>
Consider shopping during daytime hours when you're less vulnerable to stress-driven
impulses.
</Text>
</View>
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.bgLight,
},
header: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
backgroundColor: colors.bgCardLight,
borderBottomColor: colors.borderLight,
borderBottomWidth: 1,
},
headerTitle: {
...typography.h3,
color: colors.textDark,
},
headerSubtitle: {
...typography.bodySmall,
color: colors.textMuted,
marginTop: spacing.xs,
},
scroll: {
flex: 1,
},
scrollContent: {
paddingHorizontal: spacing.lg,
paddingVertical: spacing.lg,
},
card: {
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.lg,
},
cardTitle: {
...typography.h3,
color: colors.textDark,
marginBottom: spacing.md,
},
cardSubtitle: {
...typography.bodySmall,
color: colors.textMuted,
},
insight: {
...typography.body,
color: colors.textDark,
marginBottom: spacing.sm,
lineHeight: 24,
},
insightSecondary: {
...typography.bodySmall,
color: colors.textMuted,
},
timeRangeContainer: {
flexDirection: 'row',
gap: spacing.md,
marginBottom: spacing.lg,
},
timeRangeButton: {
flex: 1,
paddingVertical: spacing.sm,
paddingHorizontal: spacing.md,
borderRadius: borderRadius.md,
backgroundColor: colors.bgCardLight,
borderWidth: 1,
borderColor: colors.borderLight,
},
timeRangeButtonActive: {
backgroundColor: colors.primary,
borderColor: colors.primary,
},
timeRangeText: {
...typography.bodySmall,
color: colors.textMuted,
textAlign: 'center',
},
timeRangeTextActive: {
color: colors.bgCardLight,
fontWeight: '600',
},
heatmapCard: {
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.lg,
},
legend: {
flexDirection: 'row',
gap: spacing.lg,
marginBottom: spacing.lg,
},
legendItem: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.sm,
},
legendDot: {
width: 12,
height: 12,
borderRadius: 6,
},
legendLabel: {
...typography.bodySmall,
color: colors.textMuted,
},
heatmapGrid: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'flex-end',
height: 120,
gap: spacing.sm,
},
dayColumn: {
alignItems: 'center',
flex: 1,
},
emotionBars: {
flexDirection: 'row',
height: 80,
gap: spacing.xs,
alignItems: 'flex-end',
width: '100%',
},
heatmapBar: {
flex: 1,
borderRadius: borderRadius.sm,
},
dayLabel: {
...typography.label,
color: colors.textMuted,
fontSize: 10,
marginTop: spacing.sm,
},
windDownHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.md,
},
windDownDesc: {
...typography.bodySmall,
color: colors.textMuted,
marginTop: spacing.md,
lineHeight: 20,
},
actionButton: {
marginBottom: spacing.lg,
},
helperBox: {
flexDirection: 'row',
backgroundColor: colors.bgLight,
borderRadius: borderRadius.lg,
padding: spacing.md,
marginBottom: spacing.xl,
},
helperText: {
...typography.bodySmall,
color: colors.textMuted,
flex: 1,
lineHeight: 20,
},
});
