import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Colors, 
  Spacing, 
  FontSize, 
  FontWeight, 
  BorderRadius,
} from '@/constants/theme';
import { getCategoryIcon } from '@/constants/categories';
import { Button } from '@/components';

type VoiceState = 'idle' | 'recording' | 'processing' | 'result';

interface ParsedResult {
  amount: number;
  merchant: string;
  category: string;
}

export default function VoiceInputScreen() {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (state === 'recording') {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('recording');
    setTranscript('');
    
    // Simulate live transcript
    setTimeout(() => setTranscript('spent'), 500);
    setTimeout(() => setTranscript('spent 450'), 1000);
    setTimeout(() => setTranscript('spent 450 on swiggy'), 1500);
  };

  const handlePressOut = () => {
    if (state !== 'recording') return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState('processing');
    
    // Simulate processing
    setTimeout(() => {
      setResult({
        amount: 450,
        merchant: 'Swiggy',
        category: 'food',
      });
      setState('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleEdit = () => {
    router.replace('/add-expense');
  };

  const handleRetry = () => {
    setState('idle');
    setTranscript('');
    setResult(null);
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            <Text style={styles.instruction}>Hold the button and speak</Text>
            <Text style={styles.example}>"spent 450 on swiggy"</Text>
          </>
        );
      
      case 'recording':
        return (
          <>
            <Animated.View 
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Ionicons name="mic" size={48} color={Colors.white} />
            </Animated.View>
            <Text style={styles.recordingText}>Recording...</Text>
            <View style={styles.waveformContainer}>
              {[...Array(10)].map((_, i) => (
                <Animated.View 
                  key={i}
                  style={[
                    styles.waveformBar,
                    { height: 10 + Math.random() * 30 }
                  ]}
                />
              ))}
            </View>
            {transcript && (
              <Text style={styles.transcript}>"{transcript}"</Text>
            )}
          </>
        );
      
      case 'processing':
        return (
          <>
            <View style={styles.processingIndicator}>
              <Ionicons name="sync" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.processingText}>Processing...</Text>
          </>
        );
      
      case 'result':
        return (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.successText}>Got it!</Text>
            
            <View style={styles.resultCard}>
              <Text style={styles.resultAmount}>₹{result?.amount}</Text>
              <Text style={styles.resultMerchant}>{result?.merchant}</Text>
              <View style={styles.resultCategory}>
                <Ionicons 
                  name={getCategoryIcon(result?.category || 'other')} 
                  size={16} 
                  color={Colors.textSecondary} 
                />
                <Text style={styles.resultCategoryText}>
                  {result?.category === 'food' ? 'Food Delivery' : result?.category}
                </Text>
              </View>
            </View>

            <View style={styles.resultActions}>
              <Button
                title="✓ Confirm"
                onPress={handleConfirm}
                variant="primary"
                style={styles.actionButton}
              />
              <Button
                title="✏️ Edit"
                onPress={handleEdit}
                variant="outline"
                style={styles.actionButton}
              />
            </View>
          </>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Input</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Mic Button */}
      {state !== 'result' && (
        <View style={styles.micButtonContainer}>
          {state === 'idle' && (
            <Text style={styles.holdHint}>Hold to record</Text>
          )}
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={state === 'processing'}
          >
            <LinearGradient
              colors={
                state === 'recording' 
                  ? [Colors.error, '#DC2626'] 
                  : [Colors.primary, Colors.primaryDark]
              }
              style={[
                styles.micButton,
                state === 'recording' && styles.micButtonRecording,
              ]}
            >
              <Ionicons 
                name={state === 'recording' ? 'mic' : 'mic-outline'} 
                size={40} 
                color={Colors.white} 
              />
            </LinearGradient>
          </Pressable>
          {state === 'recording' && (
            <Text style={styles.releaseHint}>Release to send</Text>
          )}
        </View>
      )}

      {/* Retry Button for result state */}
      {state === 'result' && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  instruction: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  example: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recordingIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  recordingText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
    marginBottom: Spacing.lg,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    marginBottom: Spacing.lg,
  },
  waveformBar: {
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  transcript: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  processingIndicator: {
    marginBottom: Spacing.lg,
  },
  processingText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginBottom: Spacing.xl,
  },
  resultCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xl,
  },
  resultAmount: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  resultMerchant: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  resultCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  resultCategoryIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  resultCategoryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  micButtonContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xxxl,
  },
  holdHint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  releaseHint: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.md,
    fontWeight: FontWeight.medium,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  retryText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
});
