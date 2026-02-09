import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { api } from '@/services/api';

export default function Index() {
    const [isReady, setIsReady] = useState(false);
    const [nextRoute, setNextRoute] = useState<'/(tabs)' | '/onboarding' | '/(auth)/login'>('/(auth)/login');

    useEffect(() => {
        async function resolveStartupRoute() {
            try {
                const [onboardingValue, authenticated] = await Promise.all([
                    AsyncStorage.getItem('is_onboarded'),
                    api.isAuthenticated(),
                ]);
                const hasOnboarded = onboardingValue === 'true';

                if (!authenticated) {
                    setNextRoute('/(auth)/login');
                } else if (!hasOnboarded) {
                    setNextRoute('/onboarding');
                } else {
                    setNextRoute('/(tabs)');
                }
            } catch (e) {
                console.error(e);
                setNextRoute('/(auth)/login');
            } finally {
                setIsReady(true);
                await SplashScreen.hideAsync();
            }
        }

        resolveStartupRoute();
    }, []);

    if (!isReady) {
        return null;
    }

    return <Redirect href={nextRoute} />;
}
