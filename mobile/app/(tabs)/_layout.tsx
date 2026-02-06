import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface TabBarProps {
  state: { routes: { name: string }[]; index: number };
  navigation: { navigate: (name: string) => void };
}

type IconName = 'home' | 'home-outline' | 'trending-up' | 'trending-up-outline' |
  'wallet' | 'wallet-outline' | 'person' | 'person-outline' |
  'add' | 'chatbubble-ellipses' | 'chatbubble-ellipses-outline';

function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const tabs = [
    { name: 'index', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { name: 'activity', label: 'Activity', icon: 'pulse', iconOutline: 'pulse-outline' },
    { name: 'add', label: '', icon: 'add', isCenter: true },
    { name: 'trends', label: 'Trends', icon: 'trending-up', iconOutline: 'trending-up-outline' },
    { name: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
  ];

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {/* Floating Chat Button - Hide when on chat screen */}
      {state.routes[state.index].name !== 'chat' && (
        <TouchableOpacity
          style={[styles.floatingChatButton, { bottom: 70 + insets.bottom }]}
          onPress={() => router.push('/chat' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color={Colors.white} />
        </TouchableOpacity>
      )}

      <View style={styles.tabBar}>
        {tabs.map((tab, index) => {
          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.centerButtonContainer}
                onPress={() => router.push('/add-expense')}
                activeOpacity={0.9}
              >
                <View style={styles.centerButton}>
                  <Ionicons name="add" size={32} color={Colors.white} />
                </View>
              </TouchableOpacity>
            );
          }

          const routeIndex = state.routes.findIndex(r => r.name === tab.name);
          const isFocused = routeIndex !== -1 && state.index === routeIndex;
          const iconName = (isFocused ? tab.icon : tab.iconOutline) as IconName;

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => {
                if (routeIndex !== -1) {
                  navigation.navigate(state.routes[routeIndex].name);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? Colors.primary : Colors.gray400}
              />
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? Colors.primary : Colors.gray400 }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="trends" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface + 'F5',
    
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -30,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
  },
  floatingChatButton: {
    position: 'absolute',
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    zIndex: 10,
  },
});
