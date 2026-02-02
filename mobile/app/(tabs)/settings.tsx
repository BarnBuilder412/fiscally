import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  Colors, 
  Spacing, 
  FontSize, 
  FontWeight, 
  BorderRadius 
} from '@/constants/theme';
import { Card } from '@/components';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

function SettingItem({ 
  icon, 
  iconColor = Colors.textPrimary, 
  title, 
  subtitle, 
  onPress, 
  rightElement,
  showArrow = true,
}: SettingItemProps) {
  return (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
      ))}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [smsTracking, setSmsTracking] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Spacing.xxxl + 60 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>K</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Kaushal</Text>
              <Text style={styles.profileEmail}>kaushal@example.com</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="pencil" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Tracking Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking</Text>
          <Card padding="none">
            <SettingItem
              icon="chatbubbles"
              iconColor={Colors.primary}
              title="SMS Auto-Tracking"
              subtitle="Automatically detect bank transactions"
              showArrow={false}
              rightElement={
                <Switch
                  value={smsTracking}
                  onValueChange={setSmsTracking}
                  trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                  thumbColor={smsTracking ? Colors.primary : Colors.gray100}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="mic"
              iconColor={Colors.secondary}
              title="Voice Input"
              subtitle="Add expenses by speaking"
              showArrow={false}
              rightElement={
                <Switch
                  value={voiceEnabled}
                  onValueChange={setVoiceEnabled}
                  trackColor={{ false: Colors.gray300, true: Colors.secondaryLight }}
                  thumbColor={voiceEnabled ? Colors.secondary : Colors.gray100}
                />
              }
            />
          </Card>
        </View>

        {/* Notifications Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card padding="none">
            <SettingItem
              icon="notifications"
              iconColor={Colors.warning}
              title="Push Notifications"
              subtitle="Transaction alerts and insights"
              showArrow={false}
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: Colors.gray300, true: Colors.accentLight }}
                  thumbColor={notifications ? Colors.warning : Colors.gray100}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="calendar"
              iconColor={Colors.info}
              title="Weekly Digest"
              subtitle="Sunday morning spending summary"
              showArrow={false}
              rightElement={
                <Switch
                  value={weeklyDigest}
                  onValueChange={setWeeklyDigest}
                  trackColor={{ false: Colors.gray300, true: Colors.info }}
                  thumbColor={weeklyDigest ? Colors.info : Colors.gray100}
                />
              }
            />
          </Card>
        </View>

        {/* Budget & Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget & Goals</Text>
          <Card padding="none">
            <SettingItem
              icon="wallet"
              iconColor={Colors.primary}
              title="Monthly Budget"
              subtitle="₹50,000"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="flag"
              iconColor={Colors.success}
              title="Savings Goals"
              subtitle="2 active goals"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="pricetags"
              iconColor={Colors.categoryEntertainment}
              title="Category Budgets"
              subtitle="Set limits per category"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <Card padding="none">
            <SettingItem
              icon="cash"
              iconColor={Colors.success}
              title="Currency"
              subtitle="INR (₹)"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="color-palette"
              iconColor={Colors.categoryEntertainment}
              title="Appearance"
              subtitle="Light"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="download"
              iconColor={Colors.info}
              title="Export Data"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Card padding="none">
            <SettingItem
              icon="help-circle"
              iconColor={Colors.primary}
              title="Help & FAQ"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbubble-ellipses"
              iconColor={Colors.secondary}
              title="Send Feedback"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text"
              iconColor={Colors.textSecondary}
              title="Privacy Policy"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Fiscally v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '1A',
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    marginTop: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.primary + '0D',
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Colors.error + '10',
    borderRadius: BorderRadius.lg,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  version: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
