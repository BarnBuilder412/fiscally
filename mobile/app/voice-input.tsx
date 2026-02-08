import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  Platform,
  TextInput,
  Keyboard,
  Alert,
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
import { getCategoryIcon, CATEGORIES } from '@/constants/categories';
import { api } from '@/services/api';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency';
import { eventBus, Events } from '@/services/eventBus';

type VoiceState = 'idle' | 'recording' | 'processing' | 'result';
type EditingField = 'amount' | 'merchant' | 'category' | null;

interface ParsedResult {
  amount: string;
  merchant: string;
  category: string;
}

// Minimum hold duration in milliseconds to start recording
const MIN_HOLD_DURATION = 200;

export default function VoiceInputScreen() {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Inline editing state
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const amountInputRef = useRef<TextInput>(null);
  const merchantInputRef = useRef<TextInput>(null);

  // Track press duration to differentiate tap vs hold
  const pressStartTime = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHolding = useRef<boolean>(false);

  useEffect(() => {
    if (state === 'recording') {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const profile = await api.getProfile();
        const code = profile?.profile?.identity?.currency || profile?.profile?.currency;
        if (code) setCurrencyCode(String(code).toUpperCase());
      } catch {
        // Keep fallback currency
      }
    };
    loadCurrency();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup in case user leaves screen mid-recording.
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [recording]);

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
        Alert.alert('Unsupported', 'Voice input is not supported on web yet.');
        return;
      }

      if (permissionResponse?.status !== 'granted') {
        const resp = await requestPermission();
        if (resp.status !== 'granted') {
          Alert.alert('Permission required', 'Microphone permission is required.');
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
      setClarificationQuestion(null);

      if ((Platform.OS as string) !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording failed', 'Failed to start recording.');
      isHolding.current = false;
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
      setClarificationQuestion(
        data.needs_clarification
          ? (data.clarification_question || 'Please verify the extracted details before confirming.')
          : null
      );
      // Use actual transcript from backend, fallback to a description if not available
      setTranscript(data.transcript || `Spent ${data.amount} on ${data.merchant || 'unknown'}`);
      setState('result');

      if ((Platform.OS as string) !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Failed to process recording', err);
      Alert.alert('Voice parsing failed', 'Failed to process voice input. Please try again.');
      setState('idle');
    }
  };

  const handlePressIn = () => {
    pressStartTime.current = Date.now();
    isHolding.current = false;

    // Start a timer to detect hold after MIN_HOLD_DURATION
    holdTimerRef.current = setTimeout(() => {
      isHolding.current = true;
      startRecording();
    }, MIN_HOLD_DURATION);
  };

  const handlePressOut = () => {
    const pressDuration = Date.now() - pressStartTime.current;

    // Clear the hold timer if it hasn't fired yet
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If it was a quick tap (not a hold), don't do anything
    if (pressDuration < MIN_HOLD_DURATION) {
      // It was just a tap, not a hold - ignore
      return;
    }

    // If we're recording (from a hold), stop recording
    if (state === 'recording' && isHolding.current) {
      stopRecording();
    }

    isHolding.current = false;
  };

  // Inline edit handlers
  const startEditing = (field: EditingField) => {
    if (!result || !field) return;

    setEditingField(field);
    switch (field) {
      case 'amount':
        setEditValue(result.amount);
        setTimeout(() => amountInputRef.current?.focus(), 100);
        break;
      case 'merchant':
        setEditValue(result.merchant);
        setTimeout(() => merchantInputRef.current?.focus(), 100);
        break;
      case 'category':
        // For category, we don't use text input, we'll show a picker
        break;
    }
  };

  const saveEdit = () => {
    if (!result || !editingField) return;

    switch (editingField) {
      case 'amount':
        setResult({ ...result, amount: editValue || '0' });
        break;
      case 'merchant':
        setResult({ ...result, merchant: editValue || 'Unknown' });
        break;
    }

    setEditingField(null);
    setEditValue('');
    Keyboard.dismiss();
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    Keyboard.dismiss();
  };

  const selectCategory = (categoryId: string) => {
    if (!result) return;
    setResult({ ...result, category: categoryId });
    setEditingField(null);
    if ((Platform.OS as string) !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    const parsedAmount = Number(result.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(
        'Invalid amount',
        clarificationQuestion || 'Please enter a valid amount before confirming.'
      );
      return;
    }

    try {
      if ((Platform.OS as string) !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await api.createTransaction({
        amount: parsedAmount,
        currency: currencyCode,
        merchant: (result.merchant || '').trim() || undefined,
        category: result.category,
        note: `Voice: ${transcript}`,
        source: 'voice',
      });
      eventBus.emit(Events.TRANSACTION_ADDED);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      Alert.alert('Save failed', 'Failed to create transaction. Please try again.');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setTranscript('');
    setResult(null);
    setClarificationQuestion(null);
    setEditingField(null);
  };

  const getCategoryDisplayName = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.instruction}>Hold the button and speak</Text>
            <Text style={styles.example}>"spent 450 on swiggy"</Text>
          </View>
        );

      case 'recording':
        return (
          <View style={styles.centeredContent}>
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
          </View>
        );

      case 'processing':
        return (
          <View style={styles.centeredContent}>
            <View style={styles.processingIndicator}>
              <Ionicons name="sync" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        );

      case 'result':
        const parsedAmount = Number(result?.amount || 0);
        const canConfirm = Number.isFinite(parsedAmount) && parsedAmount > 0;
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
                  "{transcript}"
                </Text>
              </View>

              <View style={styles.waveformIcon}>
                <Ionicons name="bar-chart" size={48} color={Colors.accent} />
              </View>
            </View>

            {clarificationQuestion && (
              <View style={styles.clarificationCard}>
                <Ionicons name="help-circle-outline" size={18} color={Colors.warning} />
                <Text style={styles.clarificationText}>{clarificationQuestion}</Text>
              </View>
            )}

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
                    {editingField === 'amount' ? (
                      <View style={styles.editInputContainer}>
                        <Text style={styles.currencySymbolInline}>{getCurrencySymbol(currencyCode)}</Text>
                        <TextInput
                          ref={amountInputRef}
                          style={styles.editInput}
                          value={editValue}
                          onChangeText={setEditValue}
                          keyboardType="numeric"
                          autoFocus
                          onBlur={saveEdit}
                          onSubmitEditing={saveEdit}
                          selectTextOnFocus
                        />
                        <TouchableOpacity onPress={saveEdit} style={styles.saveEditButton}>
                          <Ionicons name="checkmark" size={20} color={Colors.success} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.rowValue}>
                        {formatCurrency(Number(result?.amount || 0), currencyCode)}
                      </Text>
                    )}
                  </View>
                </View>
                {editingField !== 'amount' && (
                  <TouchableOpacity onPress={() => startEditing('amount')}>
                    <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                )}
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
                    {editingField === 'merchant' ? (
                      <View style={styles.editInputContainer}>
                        <TextInput
                          ref={merchantInputRef}
                          style={[styles.editInput, styles.merchantInput]}
                          value={editValue}
                          onChangeText={setEditValue}
                          autoFocus
                          onBlur={saveEdit}
                          onSubmitEditing={saveEdit}
                          selectTextOnFocus
                        />
                        <TouchableOpacity onPress={saveEdit} style={styles.saveEditButton}>
                          <Ionicons name="checkmark" size={20} color={Colors.success} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.rowValue}>{result?.merchant}</Text>
                    )}
                  </View>
                </View>
                {editingField !== 'merchant' && (
                  <TouchableOpacity onPress={() => startEditing('merchant')}>
                    <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                )}
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
                      {getCategoryDisplayName(result?.category || 'other')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEditingField(editingField === 'category' ? null : 'category')}>
                  <Ionicons
                    name={editingField === 'category' ? "close" : "pencil"}
                    size={20}
                    color="rgba(255,255,255,0.6)"
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Category Picker (shown when editing category) */}
            {editingField === 'category' && (
              <View style={styles.categoryPicker}>
                <Text style={styles.categoryPickerTitle}>Select Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryOption,
                        result?.category === category.id && styles.categoryOptionSelected,
                      ]}
                      onPress={() => selectCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon}
                        size={24}
                        color={result?.category === category.id ? Colors.primary : Colors.gray600}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          result?.category === category.id && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!canConfirm}
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
    paddingHorizontal: 0,
  },
  // Centered content for idle, recording, processing states
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
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
  clarificationCard: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: Colors.warning + '12',
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  clarificationText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
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
    flex: 1,
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
  // Inline editing styles
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbolInline: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
    marginRight: 2,
  },
  editInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  merchantInput: {
    minWidth: 120,
  },
  saveEditButton: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  // Category picker styles
  categoryPicker: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryPickerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  categoryOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  categoryOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
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
  confirmButtonDisabled: {
    opacity: 0.45,
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
