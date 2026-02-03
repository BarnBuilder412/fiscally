import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '@/constants/theme';
import { getCategoryIcon } from '@/constants/categories';
import { Button } from '@/components';
import { api } from '@/services/api';

type VoiceState = 'idle' | 'recording' | 'processing' | 'result';

interface ParsedResult {
  amount: string;
  merchant: string;
  category: string;
}

export default function VoiceInputScreen() {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

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
          useNativeDriver: (Platform.OS as string) !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: (Platform.OS as string) !== 'web',
        }),
      ])
    ).start();
  };

  const startRecording = async () => {
    try {
      if ((Platform.OS as string) === 'web') {
        alert('Voice input is not supported on web yet');
        return;
      }

      if (permissionResponse?.status !== 'granted') {
        const resp = await requestPermission();
        if (resp.status !== 'granted') {
          alert('Microphone permission is required');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setState('recording');
      setTranscript(''); // Clear previous transcript

      if ((Platform.OS as string) !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      alert('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Haptics
      if ((Platform.OS as string) !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setState('processing');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Upload and process
      console.log('Processing audio:', uri);
      const data = await api.parseVoiceTransaction(uri);

      setResult({
        amount: data.amount.toString(),
        merchant: data.merchant || 'Unknown',
        category: data.category,
      });
      setTranscript(`Spent ${data.amount} on ${data.merchant || 'unknown'}`);
      setState('result');

      if ((Platform.OS as string) !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to process recording', err);
      alert('Failed to process voice input. Please try again.');
      setState('idle');
    }
  };

  const handlePressIn = () => {
    startRecording();
  };

  const handlePressOut = () => {
    if (state === 'recording') {
      stopRecording();
    }
  };

  const handleConfirm = async () => {
    if (!result) return;

    try {
      if ((Platform.OS as string) !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await api.createTransaction({
        amount: parseFloat(result.amount),
        merchant: result.merchant,
        category: result.category,
        note: `Voice: ${transcript}`,
        source: 'voice',
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction. Please try again.');
    }
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
            {transcript ? (
              <Text style={styles.transcript}>"{transcript}"</Text>
            ) : null}
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
          <ScrollView
            style={styles.resultScroll}
            contentContainerStyle={styles.resultContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Section */}
            <View style={styles.topSection}>
              <View style={styles.transcriptContainer}>
                <Text style={styles.voiceCapturedLabel}>VOICE CAPTURED</Text>
                <Text style={styles.voiceTranscript}>
                  "{transcript || 'Spent 450 on lunch today'}"
                </Text>
              </View>

              <View style={styles.waveformIcon}>
                <Ionicons name="bar-chart" size={48} color={Colors.accent} />
              </View>
            </View>

            <Text style={styles.confirmTitle}>Confirm Transaction</Text>

            {/* Transaction Card */}
            <LinearGradient
              colors={['#A49782', '#C6Baa2']} // Gradient approximation
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.txnCard}
            >
              {/* Amount Row */}
              <View style={styles.txnRow}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="cash-outline" size={24} color={Colors.gray800} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>AMOUNT</Text>
                    <Text style={styles.rowValue}>₹{result?.amount}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleEdit}>
                  <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Merchant Row */}
              <View style={styles.txnRow}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="storefront-outline" size={24} color={Colors.gray800} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>MERCHANT</Text>
                    <Text style={styles.rowValue}>{result?.merchant}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleEdit}>
                  <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Category Row */}
              <View style={styles.txnRow}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={getCategoryIcon(result?.category || 'other')}
                      size={24}
                      color={Colors.gray800}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>CATEGORY</Text>
                    <Text style={styles.rowValue}>
                      {result?.category === 'food' ? 'Food & Dining' : result?.category}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleEdit}>
                  <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Actions */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Spacer */}
            <View style={{ height: 40 }} />
          </ScrollView>
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
    paddingHorizontal: 0, // Remove padding to allow full width usage if needed
  },
  resultScroll: {
    flex: 1,
    width: '100%',
  },
  resultContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  transcriptContainer: {
    backgroundColor: '#FFF9F2', // Light cream/orange tint
    width: '100%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0C2',
    marginBottom: Spacing.xl,
  },
  voiceCapturedLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#D97706', // Amber/Orange
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  voiceTranscript: {
    fontSize: FontSize.xl,
    fontStyle: 'italic',
    color: Colors.gray800,
    textAlign: 'center',
    lineHeight: 28,
  },
  waveformIcon: {
    marginVertical: Spacing.md,
    opacity: 0.8,
  },
  confirmTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.gray900,
    marginBottom: Spacing.lg,
  },
  txnCard: {
    width: '100%',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rowContent: {
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: 'rgba(50, 40, 30, 0.5)', // Transparent dark
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginLeft: 64, // Align with text
  },
  actionContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  confirmButton: {
    backgroundColor: '#1F1D1B', // Almost black
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  cancelButton: {
    backgroundColor: Colors.white,
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: Colors.gray600,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
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
    paddingBottom: Spacing.xxxl * 3, // Moved up significantly
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
