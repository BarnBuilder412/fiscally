import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

// Screens
import DashboardScreen from '../screens/tabs/DashboardScreen';
import SubZeroScreen from '../screens/tabs/SubZeroScreen';
import DopamineAuditScreen from '../screens/tabs/DopamineAuditScreen';
import ThesisFlowScreen from '../screens/tabs/ThesisFlowScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                id="RootTabNavigator"
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textMuted,
                    tabBarStyle: {
                        backgroundColor: colors.bgCardLight,
                        borderTopColor: colors.borderLight,
                        borderTopWidth: 1,
                    },
                }}
            >
                <Tab.Screen
                    name="Dashboard"
                    component={DashboardScreen}
                    options={{
                        tabBarIcon: ({ color }: { color: string }) => (
                            <MaterialCommunityIcons name="home" size={24} color={color} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="SubZero"
                    component={SubZeroScreen}
                    options={{
                        tabBarIcon: ({ color }: { color: string }) => (
                            <MaterialCommunityIcons name="asterisk" size={24} color={color} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="DopamineAudit"
                    component={DopamineAuditScreen}
                    options={{
                        tabBarIcon: ({ color }: { color: string }) => (
                            <MaterialCommunityIcons name="brain" size={24} color={color} />
                        ),
                    }}
                />
                <Tab.Screen
                    name="ThesisFlow"
                    component={ThesisFlowScreen}
                    options={{
                        tabBarIcon: ({ color }: { color: string }) => (
                            <MaterialCommunityIcons name="chart-line" size={24} color={color} />
                        ),
                    }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}