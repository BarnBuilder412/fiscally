import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../lib/theme';
import KPICard from '../../components/KPICard';
import EngineCard from '../../components/EngineCard';

export default function DashboardScreen() {
const [isDarkMode, setIsDarkMode] = React.useState(true);

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScrollView
style={styles.scroll}
contentContainerStyle={styles.scrollContent}
showsVerticalScrollIndicator={false}
>
{/* Header */}
<View style={styles.header}>
<View style={styles.headerLeft}>
<View style={[styles.logo, shadows.md]}>
<MaterialCommunityIcons name="wallet" size={24} color={colors.primary} />
</View>
<View>
<Text style={styles.appName}>FISCALLY</Text>
<View style={styles.badge}>
<View style={styles.dot} />
<Text style={styles.badgeText}>AI ACTIVE</Text>
</View>
</View>
</View>
<View style={styles.headerActions}>
<TouchableOpacity>
<MaterialCommunityIcons
name={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'}
size={24}
color={colors.textDark}
/>
</TouchableOpacity>
<TouchableOpacity style={{ marginLeft: spacing.md }}>
<MaterialCommunityIcons name="bell" size={24} color={colors.textDark} />
</TouchableOpacity>
</View>
</View>

{/* KPI Cards */}
<Text style={styles.sectionTitle}>Key Metrics</Text>
<ScrollView
horizontal
showsHorizontalScrollIndicator={false}
style={styles.kpiScroll}
>
<KPICard label="Agent Savings" value="$1,240.50" change="+12.4%" changeType="positive" />
<KPICard label="Net Worth" value="$84.2k" change="+3.4%" changeType="positive" />
</ScrollView>

{/* Engine Status */}
<Text style={styles.sectionTitle}>Autonomous Engines</Text>

<EngineCard
icon="asterisk"
title="SubZero"
subtitle="Autonomous Negotiations"
status="3 ACTIVE TASKS"
statusColor={colors.primary}
progress={70}
/>

<EngineCard
icon="brain"
title="DopamineAudit"
subtitle="Spending Correlation"
status="HIGH VOLATILITY"
statusColor={colors.warning}
/>

<EngineCard
icon="chart-box"
title="ThesisFlow"
subtitle="Investment Analysis"
/>

{/* Demo Notice */}
<View style={[styles.demoCard, shadows.sm]}>
<MaterialCommunityIcons name="information" size={20} color={colors.primary} />
<Text style={styles.demoText}>Tap logo 5x to unlock demo shortcuts</Text>
</View>
</ScrollView>
</SafeAreaView>
);
}

import React from 'react';

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
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.xl,
marginTop: spacing.lg,
},
headerLeft: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.md,
},
logo: {
width: 50,
height: 50,
borderRadius: borderRadius.full,
backgroundColor: colors.bgCardLight,
justifyContent: 'center',
alignItems: 'center',
borderWidth: 2,
borderColor: colors.primary,
},
appName: {
...typography.h2,
color: colors.textDark,
fontWeight: '900',
},
badge: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.xs,
marginTop: spacing.xs,
},
dot: {
width: 6,
height: 6,
borderRadius: 3,
backgroundColor: colors.success,
},
badgeText: {
...typography.label,
color: colors.textMuted,
fontSize: 10,
},
headerActions: {
flexDirection: 'row',
alignItems: 'center',
},
sectionTitle: {
...typography.h3,
color: colors.textDark,
marginTop: spacing.lg,
marginBottom: spacing.md,
},
kpiScroll: {
marginBottom: spacing.xl,
marginHorizontal: -spacing.lg,
paddingHorizontal: spacing.lg,
},
demoCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.bgCardLight,
borderRadius: borderRadius.lg,
padding: spacing.lg,
marginTop: spacing.xl,
gap: spacing.md,
},
demoText: {
...typography.bodySmall,
color: colors.primary,
flex: 1,
},
});
