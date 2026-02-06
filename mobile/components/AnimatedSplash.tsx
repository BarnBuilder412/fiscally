import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    runOnJS,
    withSequence,
    withDelay,
    Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface Props {
    onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(1);
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        // 1. Initial pop in
        scale.value = withSpring(1, { damping: 12, stiffness: 100 });

        // 2. Expand and fade out
        setTimeout(() => {
            scale.value = withTiming(50, { duration: 1000, easing: Easing.ease });
            containerOpacity.value = withTiming(0, { duration: 800 }, () => {
                runOnJS(onFinish)();
            });
        }, 1500);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <Ionicons name="wallet-outline" size={64} color={Colors.white} />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E293B', // Dark elegant background
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
