import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  BorderRadius,
  Shadows,
} from '@/constants/theme';
import { Card } from '@/components';

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

function SettingItem({
  icon,
  iconColor = Colors.primary,
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
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
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

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [smsTracking, setSmsTracking] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string; initials: string } | null>(null);

  const loadProfile = async () => {
    try {
      const userData = await api.getMe();
      if (userData) {
        // Name priority: 1. Top level name, 2. Profile identity name, 3. Extract from email
        let displayName = userData.name;

        if (!displayName && userData.profile?.identity?.name) {
          displayName = userData.profile.identity.name;
        }

        if (!displayName && userData.email) {
          const emailName = userData.email.split('@')[0];
          displayName = emailName
            .split(/[._]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        }

        const finalName = displayName || 'User';
        const initials = finalName
          .split(' ')
          .map(p => p[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        setUser({
          name: finalName,
          email: userData.email || '',
          initials
        });
      }
    } catch (error) {
      console.log('Failed to load profile:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.initials || 'K'}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Kaushal'}</Text>
          <View style={styles.proBadge}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
            <Text style={styles.proBadgeText}>PRO PLAN MEMBER</Text>
          </View>
          <Text style={styles.profileEmail}>{user?.email || 'kaushal@fiscally.ai'}</Text>
        </View>

        {/* Financial Preferences Section */}
        <Text style={styles.sectionLabel}>FINANCIAL PREFERENCES</Text>
        <Card padding="none" style={styles.settingsCard}>
          <SettingItem
            icon="wallet"
            iconColor="#22C55E"
            title="Monthly Income"
            subtitle="Set your income range"
            onPress={() => router.push('/preferences/income')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="cash"
            iconColor="#3B82F6"
            title="Monthly Budget"
            subtitle="Set your spending budget"
            onPress={() => router.push('/preferences/budget')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="flag"
            iconColor="#8B5CF6"
            title="Savings Goals"
            subtitle="Manage your financial goals"
            onPress={() => router.push('/preferences/goals')}
          />
        </Card>

        {/* Automation Section */}
        <Text style={styles.sectionLabel}>AUTOMATION</Text>
        <Card padding="none" style={styles.settingsCard}>
          <SettingItem
            icon="chatbox-ellipses"
            title="Auto SMS tracking"
            subtitle="Scan bank texts for expenses"
            showArrow={false}
            rightElement={
              <Switch
                value={smsTracking}
                onValueChange={setSmsTracking}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={smsTracking ? Colors.primary : Colors.white}
                ios_backgroundColor={Colors.gray200}
              />
            }
          />
        </Card>

        {/* General Section */}
        <Text style={styles.sectionLabel}>GENERAL</Text>
        <Card padding="none" style={styles.settingsCard}>
          <SettingItem
            icon="notifications"
            iconColor="#A68966"
            title="Notifications"
            showArrow={false}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={notifications ? Colors.primary : Colors.white}
                ios_backgroundColor={Colors.gray200}
              />
            }
          />
          <View style={styles.divider} />
          <SettingItem
            icon="download"
            title="Export data"
            subtitle="Coming Soon"
            showArrow={false}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="shield-checkmark"
            iconColor="#6B7F67"
            title="Privacy & Security"
            subtitle="Coming Soon"
            showArrow={false}
          />
        </Card>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={async () => {
            try {
              await AsyncStorage.removeItem('is_onboarded');
              router.replace('/onboarding');
            } catch (e) {
              console.error('Logout failed', e);
            }
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#B34B4B" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>FISCALLY AI V2.4.1 (BUILD 108)</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200 + '50',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.surface,
    ...Shadows.md,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  profileName: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.gray400,
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  settingsCard: {
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFE5E5',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: '#F2D7D7',
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#B34B4B',
  },
  versionText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: Colors.gray400,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: Spacing.xl,
  },
});
