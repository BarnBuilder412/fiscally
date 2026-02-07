import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { api } from '@/services/api';
import { eventBus, Events } from '@/services/eventBus';
import { formatCurrency } from '@/utils/currency';

type CaptureOption = 'camera' | 'gallery' | 'pdf';

export default function ReceiptInputScreen() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const uploadFile = async (file: { uri: string; name: string; type: string }) => {
    setProcessing(true);
    setStatus('Parsing receipt and auto-adding expense...');
    try {
      const result = await api.parseReceiptTransaction(file);
      eventBus.emit(Events.TRANSACTION_ADDED);
      const amount = formatCurrency(result.amount, result.currency || 'INR');
      const merchant = result.merchant || 'Unknown merchant';
      Alert.alert(
        'Expense Added',
        `${amount} at ${merchant}\nCategory: ${result.category.replace('_', ' ')}${result.needs_review ? '\nMarked for review due to low confidence.' : ''}`,
        [{ text: 'Done', onPress: () => router.replace('/(tabs)') }]
      );
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Choose how you want to add your receipt. We'll parse and auto-create the expense.
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

        {status && <Text style={styles.status}>{status}</Text>}
      </View>
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
});

