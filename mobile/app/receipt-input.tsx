import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { api } from '@/services/api';
import { eventBus, Events } from '@/services/eventBus';
import { CATEGORIES, getCategoryIcon } from '@/constants/categories';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency';

type CaptureOption = 'camera' | 'gallery' | 'pdf';
type EditingField = 'amount' | 'merchant' | null;

interface ReceiptDraft {
  transactionId?: string;
  amount: string;
  currency: string;
  merchant: string;
  category: string;
  needsReview: boolean;
  duplicateSuspected: boolean;
  reason?: string;
  parsedPreview?: string;
  spendClass?: 'need' | 'want' | 'luxury';
  autoCreated: boolean;
}

export default function ReceiptInputScreen() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');

  const isEditable = !!draft && !draft.duplicateSuspected;

  const setDraftField = (field: keyof ReceiptDraft, value: string | boolean | undefined) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const sanitizeAmount = (value: string) => value.replace(/[^0-9.]/g, '');

  const closeEditor = () => {
    if (!draft || !editingField) return;
    if (editingField === 'amount') {
      const next = sanitizeAmount(editValue);
      setDraftField('amount', next || draft.amount);
    }
    if (editingField === 'merchant') {
      setDraftField('merchant', editValue.trim() || draft.merchant);
    }
    setEditingField(null);
    setEditValue('');
  };

  const uploadFile = async (file: { uri: string; name: string; type: string }) => {
    setProcessing(true);
    setStatus('Parsing receipt...');
    try {
      const result = await api.parseReceiptTransaction(file);
      const extractedItems = Array.isArray(result.extracted_items) ? result.extracted_items : [];
      const itemPreview = extractedItems
        .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
        .filter((name) => Boolean(name))
        .slice(0, 3)
        .join(', ');
      const txId = result.transaction?.id;
      setDraft({
        transactionId: txId,
        amount: String(result.amount ?? ''),
        currency: (result.currency || 'INR').toUpperCase(),
        merchant: result.merchant || 'Unknown merchant',
        category: result.category || 'other',
        needsReview: Boolean(result.needs_review),
        duplicateSuspected: Boolean(result.duplicate_suspected),
        reason: result.reason,
        parsedPreview: itemPreview || result.reason || 'Receipt parsed successfully.',
        spendClass: result.spend_class,
        autoCreated: Boolean(txId && !result.duplicate_suspected),
      });
    } catch (error: any) {
      Alert.alert('Receipt Parsing Failed', error?.message || 'Unable to parse this file.');
    } finally {
      setProcessing(false);
      setStatus(null);
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera permission is required to scan receipts.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      await uploadFile({
        uri: asset.uri,
        name: asset.fileName || `receipt-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      await uploadFile({
        uri: asset.uri,
        name: asset.fileName || `receipt-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await uploadFile({
      uri: asset.uri,
      name: asset.name || `invoice-${Date.now()}.pdf`,
      type: asset.mimeType || 'application/pdf',
    });
  };

  const handleOption = async (option: CaptureOption) => {
    if (processing) return;
    if (option === 'camera') await pickFromCamera();
    if (option === 'gallery') await pickFromGallery();
    if (option === 'pdf') await pickPdf();
  };

  const cleanupAutoCreatedDraft = async () => {
    if (draft?.autoCreated && draft.transactionId) {
      try {
        await api.deleteTransaction(draft.transactionId);
      } catch (error) {
        console.warn('Failed to delete auto-created receipt transaction:', error);
      }
    }
  };

  const handleRetry = async () => {
    if (processing) return;
    setProcessing(true);
    await cleanupAutoCreatedDraft();
    setDraft(null);
    setEditingField(null);
    setEditValue('');
    setProcessing(false);
  };

  const handleCancel = async () => {
    if (!draft) {
      router.back();
      return;
    }
    Alert.alert(
      'Discard receipt draft?',
      draft.autoCreated
        ? 'This auto-added receipt transaction will be removed.'
        : 'This draft will be discarded.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            await cleanupAutoCreatedDraft();
            setProcessing(false);
            router.back();
          },
        },
      ]
    );
  };

  const handleConfirm = async () => {
    if (!draft || processing) return;
    closeEditor();

    const amount = Number.parseFloat(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount before confirming.');
      return;
    }

    setProcessing(true);
    setStatus('Saving transaction...');
    try {
      if (draft.duplicateSuspected) {
        eventBus.emit(Events.TRANSACTION_UPDATED);
        router.replace('/(tabs)');
        return;
      }

      if (draft.transactionId) {
        await api.updateTransaction(draft.transactionId, {
          amount,
          merchant: draft.merchant || undefined,
          category: draft.category,
        });
        eventBus.emit(Events.TRANSACTION_UPDATED);
      } else {
        await api.createTransaction({
          amount,
          currency: draft.currency,
          merchant: draft.merchant || undefined,
          category: draft.category,
          source: 'receipt',
          note: 'Added from receipt',
        });
        eventBus.emit(Events.TRANSACTION_ADDED);
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Unable to save this receipt transaction.');
    } finally {
      setProcessing(false);
      setStatus(null);
    }
  };

  const renderPicker = () => {
    if (!draft || !isEditable) return null;
    return (
      <View style={styles.categoryPicker}>
        <Text style={styles.categoryPickerTitle}>Select Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryOption,
                draft.category === category.id && styles.categoryOptionSelected,
              ]}
              onPress={() => setDraftField('category', category.id)}
            >
              <Ionicons
                name={category.icon}
                size={22}
                color={draft.category === category.id ? Colors.primary : Colors.gray600}
              />
              <Text
                style={[
                  styles.categoryOptionText,
                  draft.category === category.id && styles.categoryOptionTextSelected,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderConfirmation = () => {
    if (!draft) return null;
    const symbol = getCurrencySymbol(draft.currency);

    return (
      <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.transcriptContainer}>
            <Text style={styles.voiceCapturedLabel}>RECEIPT EXTRACTED</Text>
            <Text style={styles.voiceTranscript}>
              {draft.parsedPreview || 'Receipt parsed successfully.'}
            </Text>
          </View>
          <View style={styles.waveformIcon}>
            <Ionicons name="receipt-outline" size={42} color={Colors.accent} />
          </View>
        </View>

        <Text style={styles.confirmTitle}>Confirm Transaction</Text>

        <LinearGradient
          colors={['#A49782', '#C6Baa2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.txnCard}
        >
          <View style={styles.txnRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="cash-outline" size={20} color={Colors.gray800} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>AMOUNT</Text>
                {editingField === 'amount' ? (
                  <View style={styles.editInputContainer}>
                    <Text style={styles.currencyInline}>{symbol}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editValue}
                      onChangeText={(v) => setEditValue(sanitizeAmount(v))}
                      keyboardType="numeric"
                      autoFocus
                      onBlur={closeEditor}
                      onSubmitEditing={closeEditor}
                    />
                  </View>
                ) : (
                  <Text style={styles.rowValue}>{formatCurrency(Number(draft.amount || 0), draft.currency)}</Text>
                )}
              </View>
            </View>
            {isEditable && editingField !== 'amount' && (
              <TouchableOpacity
                onPress={() => {
                  setEditingField('amount');
                  setEditValue(draft.amount);
                }}
              >
                <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.txnRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="storefront-outline" size={20} color={Colors.gray800} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>MERCHANT</Text>
                {editingField === 'merchant' ? (
                  <TextInput
                    style={[styles.editInput, styles.merchantInput]}
                    value={editValue}
                    onChangeText={setEditValue}
                    autoFocus
                    onBlur={closeEditor}
                    onSubmitEditing={closeEditor}
                  />
                ) : (
                  <Text style={styles.rowValue}>{draft.merchant}</Text>
                )}
              </View>
            </View>
            {isEditable && editingField !== 'merchant' && (
              <TouchableOpacity
                onPress={() => {
                  setEditingField('merchant');
                  setEditValue(draft.merchant);
                }}
              >
                <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.txnRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name={getCategoryIcon(draft.category || 'other')} size={20} color={Colors.gray800} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>CATEGORY</Text>
                <Text style={styles.rowValue}>{draft.category.replace('_', ' ')}</Text>
              </View>
            </View>
          </View>

          {draft.spendClass ? (
            <Text style={styles.metaText}>Spend class: {draft.spendClass.toUpperCase()}</Text>
          ) : null}
          {draft.needsReview ? (
            <Text style={styles.warningText}>Marked for review due to low confidence.</Text>
          ) : null}
          {draft.duplicateSuspected ? (
            <Text style={styles.warningText}>Possible duplicate detected. Existing transaction was reused.</Text>
          ) : null}
          {draft.reason ? <Text style={styles.metaText}>{draft.reason}</Text> : null}
        </LinearGradient>

        {renderPicker()}

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={processing}>
            <Text style={styles.confirmButtonText}>Confirm Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={processing}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.retryButton} onPress={handleRetry} disabled={processing}>
          <Ionicons name="refresh" size={18} color={Colors.primary} />
          <Text style={styles.retryText}>Try another receipt</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name={draft ? 'close' : 'chevron-back'} size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={{ width: 24 }} />
      </View>

      {!draft ? (
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Choose how you want to add your receipt. We'll parse it and show a confirmation before finalizing.
          </Text>

          <TouchableOpacity style={styles.optionCard} onPress={() => handleOption('camera')} disabled={processing}>
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Use Camera</Text>
              <Text style={styles.optionSubtitle}>Capture receipt now</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => handleOption('gallery')} disabled={processing}>
            <Ionicons name="images-outline" size={24} color={Colors.primary} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Upload Image</Text>
              <Text style={styles.optionSubtitle}>Select receipt from gallery</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={() => handleOption('pdf')} disabled={processing}>
            <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Upload PDF Invoice</Text>
              <Text style={styles.optionSubtitle}>Parse structured invoice text</Text>
            </View>
          </TouchableOpacity>

          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
      ) : (
        <>
          {renderConfirmation()}
          {status ? <Text style={styles.statusInline}>{status}</Text> : null}
        </>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  optionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  status: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  statusInline: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  resultScroll: {
    flex: 1,
  },
  resultContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  transcriptContainer: {
    backgroundColor: '#FFF9F2',
    width: '100%',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0C2',
    marginBottom: Spacing.lg,
  },
  voiceCapturedLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#D97706',
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  voiceTranscript: {
    fontSize: FontSize.lg,
    fontStyle: 'italic',
    color: Colors.gray800,
    textAlign: 'center',
    lineHeight: 26,
  },
  waveformIcon: {
    marginVertical: Spacing.sm,
    opacity: 0.85,
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
    marginBottom: Spacing.xl,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: 'rgba(50, 40, 30, 0.5)',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginLeft: 64,
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyInline: {
    fontSize: FontSize.lg,
    color: '#2D2723',
    fontWeight: FontWeight.bold,
    marginRight: Spacing.xs,
  },
  editInput: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
    minWidth: 80,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  merchantInput: {
    minWidth: 140,
  },
  metaText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: 'rgba(45, 39, 35, 0.85)',
  },
  warningText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: '#8B2E2E',
    fontWeight: FontWeight.medium,
  },
  categoryPicker: {
    width: '100%',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  categoryOption: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minWidth: 90,
  },
  categoryOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  categoryOptionText: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  categoryOptionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  actionContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  confirmButton: {
    backgroundColor: '#1F1D1B',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  cancelButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  retryButton: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
