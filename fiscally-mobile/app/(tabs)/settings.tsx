import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Switch,
    TouchableOpacity,
} from 'react-native';
import { Moon, Bell, Shield, ChevronRight, User, HelpCircle, LogOut } from 'lucide-react-native';

const colors = {
    background: '#F1EFE9',
    card: '#FFFFFF',
    primary: '#6366F1',
    foreground: '#2D3436',
    muted: '#9CA3AF',
    border: '#E2E2E2',
    danger: '#EF4444',
};

export default function SettingsScreen() {
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>CONFIG</Text>
                    <Text style={styles.headerSubtitle}>Settings & Preferences</Text>
                </View>

                {/* Profile Section */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <User size={28} color={colors.primary} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>User</Text>
                        <Text style={styles.profileEmail}>user@fiscally.app</Text>
                    </View>
                    <ChevronRight size={20} color={colors.muted} />
                </View>

                {/* Appearance */}
                <Text style={styles.sectionTitle}>APPEARANCE</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Moon size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: '#E5E7EB', true: colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                {/* Notifications */}
                <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Bell size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.settingLabel}>Push Notifications</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: '#E5E7EB', true: colors.primary }}
                            thumbColor="#FFF"
                        />
                    </View>
                </View>

                {/* Security */}
                <Text style={styles.sectionTitle}>SECURITY</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Shield size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.settingLabel}>Privacy & Security</Text>
                        </View>
                        <ChevronRight size={20} color={colors.muted} />
                    </TouchableOpacity>
                </View>

                {/* Support */}
                <Text style={styles.sectionTitle}>SUPPORT</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <HelpCircle size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.settingLabel}>Help Center</Text>
                        </View>
                        <ChevronRight size={20} color={colors.muted} />
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton}>
                    <LogOut size={18} color={colors.danger} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Fiscally v1.0.0</Text>
                    <Text style={styles.versionSubtext}>AI-Powered Financial Agent</Text>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        paddingVertical: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.foreground,
        letterSpacing: 2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    profileCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.foreground,
    },
    profileEmail: {
        fontSize: 13,
        color: colors.muted,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.muted,
        letterSpacing: 2,
        marginBottom: 12,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        fontSize: 15,
        color: colors.foreground,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        marginTop: 8,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.danger,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    versionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.muted,
    },
    versionSubtext: {
        fontSize: 11,
        color: colors.muted,
        marginTop: 4,
    },
});
