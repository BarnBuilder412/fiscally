import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    runOnJS,
    Easing
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

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
            <Animated.Image
                source={require('../assets/logo-mark.png')}
                style={[styles.logo, logoStyle]}
                resizeMode="contain"
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
    },
    logo: {
        width: 120,
        height: 120,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
});
