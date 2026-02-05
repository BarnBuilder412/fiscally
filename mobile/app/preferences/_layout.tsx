import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function PreferencesLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
            }}
        >
            <Stack.Screen name="income" />
            <Stack.Screen name="budget" />
            <Stack.Screen name="goals" />
        </Stack>
    );
}
