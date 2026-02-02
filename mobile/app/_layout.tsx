import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Colors, Spacing } from '@/constants/theme';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();



  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="add-expense"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="voice-input"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="transactions"
          options={{
            headerShown: true,
            title: 'Transactions',
            headerTintColor: Colors.textPrimary,
            headerStyle: { backgroundColor: Colors.surface },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, marginLeft: Spacing.lg }}>
                <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </>
  );
}
