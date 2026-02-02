import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

export default function Index() {
    const [isReady, setIsReady] = useState(false);
    const [hasOnboarded, setHasOnboarded] = useState(false);

    useEffect(() => {
        async function checkOnboarding() {
            try {
                const value = await AsyncStorage.getItem('is_onboarded');
                if (value === 'true') {
                    setHasOnboarded(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsReady(true);
                await SplashScreen.hideAsync();
            }
        }

        checkOnboarding();
    }, []);

    if (!isReady) {
        return null;
    }

    // If onboarded, go to tabs (dashboard)
    // If not, go to onboarding
    return <Redirect href={hasOnboarded ? "/(tabs)" : "/onboarding"} />;
}
