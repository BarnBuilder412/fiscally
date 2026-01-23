import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LayoutGrid, Box, TrendingUp, Settings, Hexagon } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#6366F1',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                },
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0,
                    height: 80,
                    paddingBottom: 20,
                    paddingTop: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    elevation: 8,
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dash',
                    tabBarIcon: ({ color, size }) => <LayoutGrid size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="saving"
                options={{
                    title: 'Saving',
                    tabBarIcon: ({ color, size }) => <Hexagon size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="trends"
                options={{
                    title: 'Trends',
                    tabBarIcon: ({ color, size }) => <TrendingUp size={22} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Config',
                    tabBarIcon: ({ color, size }) => <Settings size={22} color={color} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    centerButton: {
        position: 'absolute',
        top: -30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerButtonInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#3D3D3D',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
