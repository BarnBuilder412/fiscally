import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../lib/theme';
import Button from '../../components/Button';

export default function DopamineAuditScreen() {
const spendingData = [
{ day: 'Mon', neutral: 20, stressed: 45, happy: 15 },
{ day: 'Tue', neutral: 30, stressed: 60, happy: 20 },
{ day: 'Wed', neutral: 15, stressed: 25, happy: 10 },
{ day: 'Thu', neutral: 35, stressed: 80, happy: 25 },
{ day: 'Fri', neutral: 25, stressed: 40, happy: 30 },
{ day: 'Sat', neutral: 40, stressed: 35, happy: 50 },
{ day: 'Sun', neutral: 20, stressed: 50, happy: 35 },
];

const maxValue = Math.max(...spendingData.map((d) => Math.max(d.neutral, d.stressed, d.happy)));

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScrollView
style={styles.scroll}
contentContainerStyle={styles.scrollContent}
showsVerticalScrollIndicator={false}
>
{/* Header */}
<View style={styles.headerSection}>
<View>
<Text style={styles.title}>DopamineAudit</Text>
<Text style={styles.subtitle}>Spending Correlation</Text>
</View>
<View style={styles.badge}>
<Text style={styles.badgeText}>HIGH VOLATILITY</Text>
</View>
</View>

{/* Summary Card */}
<View style={[styles.summaryCard, shadows.md]}>
<Text style={styles.summaryHeadline}>
Spikes correlate with "Low Energy" periods.
</Text>
<Text style={styles.summarySubtext}>
You spent $340 this week. Stress drove $240 of it.
</Text>
<View style={styles.summaryStats}>
<View style={styles.stat}>
<Text style={styles.statValue}>3.5x</Text>
<Text style={styles.statLabel}>More after 11 PM</Text>
</View>
<View style={styles.stat}>
<Text style={styles.statValue}>$340</Text>
<Text style={styles.statLabel}>Total this week</Text>
</View>
</View>
</View>

{/* Chart Legend */}
<View style={styles.legend}>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.neutral }]} />
<Text style={styles.legendLabel}>Neutral</Text>
</View>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.energy }]} />
<Text style={styles.legendLabel}>Stressed</Text>
</View>
<View style={styles.legendItem}>
<View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
<Text style={styles.legendLabel}>Happy</Text>
</View>
</View>

{/* Bar Chart */}
<View style={[styles.chartContainer, shadows.sm]}>
{spendingData.map((data, idx) => (
<View key={idx} style={styles.chartColumn}>
<View style={styles.barsContainer}>
<View
style={[
styles.bar,
{
height: (data.neutral / maxValue) * 80,
backgroundColor: colors.neutral,
},
]}
/>
<View
style={[
styles.bar,
{
height: (data.stressed / maxValue) * 80,
backgroundColor: colors.energy,
},
]}
/>
<View
style={[
styles.bar,
{
height: (data.happy / maxValue) * 80,
backgroundColor: colors.primary,
},
]}
/>
</View>
<Text style={styles.dayLabel}>{data.day}</Text>
</View>
))}
</View>

{/* Category Breakdown */}
<Text style={styles.sectionTitle}>Category Breakdown</Text>

<TouchableOpacity style={[styles.categoryCard, shadows.sm]} activeOpacity={0.7}>
<View style={styles.categoryHeader}>
<Text style={styles.categoryName}>Shopping</Text>
<Text style={styles.categoryAmount}>$156</Text>
</View>
<Text style={styles.categorySubtext}>Clothes, Electronics, etc.</Text>
</TouchableOpacity>

<TouchableOpacity style={[styles.categoryCard, shadows.sm]} activeOpacity={0.7}>
<View style={styles.categoryHeader}>
<Text style={styles.categoryName}>Food Delivery</Text>
<Text style={styles.categoryAmount}>$89</Text>
</View>
<Text style={styles.categorySubtext}>Late-night snacks</Text>
</TouchableOpacity>

<TouchableOpacity style={[styles.categoryCard, shadows.sm]} activeOpacity={0.7}>
<View style={styles.categoryHeader}>
<Text style={styles.categoryName}>Entertainment</Text>
<Text style={styles.categoryAmount}>$67</Text>
</View>
<Text style={styles.categorySubtext}>Streaming, gaming</Text>
</TouchableOpacity>

{/* Action Button */}
<Button
title="Enable Wind Down Mode"
onPress={() => {}}
style={styles.actionButton}
/>

<Text style={styles.helperText}>
Purchases after midnight will have a 30-second approval delay. This helps break the impulse cycle.
</Text>
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.bgLight,
},
scroll: {
flex: 1,
},
scrollContent: {
paddingHorizontal: spacing.lg,
paddingBottom: spacing.xl,
},
headerSection: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'flex-start',
marginBottom: spacing.xl,
marginTop: spacing.lg,
},
title: {
...typography.h2,
color: colors.textDark,
},
subtitle: {
...typography.bodySmall,
color: colors.textMuted,
marginTop: spacing.xs,
},
badge: {
backgroundColor: colors.warning,
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: borderRadius.sm,
},
badgeText: {
...typography.label,
color: colors.bgCardLight,
fontSize: 11,
},
summaryCard: {
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.xl,
},
summaryHeadline: {
...typography.h3,
color: colors.textDark,
marginBottom: spacing.sm,
},
summarySubtext: {
...typography.body,
color: colors.textMuted,
marginBottom: spacing.lg,
},
summaryStats: {
flexDirection: 'row',
gap: spacing.lg,
},
stat: {
flex: 1,
},
statValue: {
...typography.h2,
color: colors.primary,
},
statLabel: {
...typography.bodySmall,
color: colors.textMuted,
marginTop: spacing.xs,
},
legend: {
flexDirection: 'row',
gap: spacing.lg,
marginBottom: spacing.lg,
paddingHorizontal: spacing.sm,
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
chartContainer: {
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.xl,
flexDirection: 'row',
justifyContent: 'space-around',
alignItems: 'flex-end',
height: 140,
},
chartColumn: {
alignItems: 'center',
gap: spacing.sm,
},
barsContainer: {
flexDirection: 'row',
height: 80,
gap: spacing.xs,
alignItems: 'flex-end',
},
bar: {
width: 6,
borderRadius: borderRadius.sm,
},
dayLabel: {
...typography.label,
color: colors.textMuted,
fontSize: 10,
},
sectionTitle: {
...typography.h3,
color: colors.textDark,
marginBottom: spacing.md,
},
categoryCard: {
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginBottom: spacing.md,
},
categoryHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.sm,
},
categoryName: {
...typography.body,
color: colors.textDark,
fontWeight: '600',
},
categoryAmount: {
...typography.h3,
color: colors.stress,
},
categorySubtext: {
...typography.bodySmall,
color: colors.textMuted,
},
actionButton: {
marginVertical: spacing.xl,
},
helperText: {
...typography.bodySmall,
color: colors.textMuted,
textAlign: 'center',
marginBottom: spacing.xl,
},
});
