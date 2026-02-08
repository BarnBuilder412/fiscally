import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '@/constants/theme';
import { CATEGORIES, getCategoryColor } from '@/constants/categories';
import { Button } from '@/components';
import { api } from '@/services/api';
import { useResponsive } from '@/hooks';
import { eventBus, Events } from '@/services/eventBus';
import { getCurrencySymbol } from '@/utils/currency';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { getGridItemWidth } = useResponsive();
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryItemWidth = getGridItemWidth(4, 8, 16);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('INR');

  // Track keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const profile = await api.getProfile();
        const code = profile?.profile?.identity?.currency || profile?.profile?.currency;
        if (code) setCurrencyCode(String(code).toUpperCase());
      } catch {
        // Keep default currency fallback.
      }
    };
    loadCurrency();
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(categoryId);
  };

  const handleSafeBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSave = async () => {
    if (!amount || !selectedCategory) return;

    setIsSubmitting(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await api.createTransaction({
        amount: parseFloat(amount),
        currency: currencyCode,
        merchant: note || 'Manual Expense', // Using note as merchant/description for now
        category: selectedCategory,
        note: note,
        source: 'manual',
      });
      // Emit event for instant updates across all screens
      eventBus.emit(Events.TRANSACTION_ADDED);
      handleSafeBack();
    } catch (error: any) {
      alert(error.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoicePress = () => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      router.push('/voice-input');
    });
  };

  const handleReceiptPress = () => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      router.push('/receipt-input' as any);
    });
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    return numericValue;
  };
  const hasManualAmount = amount.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSafeBack}>
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{getCurrencySymbol(currencyCode)}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.gray300}
              keyboardType="numeric"
              value={amount}
              onChangeText={(text) => setAmount(formatAmount(text))}
              autoFocus
              maxLength={8}
            />
          </View>

          {!hasManualAmount && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Or choose a quick capture mode</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.quickActionCard} onPress={handleVoicePress}>
                  <Ionicons name="mic" size={24} color={Colors.primary} />
                  <Text style={styles.quickActionTitle}>Hold to speak</Text>
                  <Text style={styles.quickActionSubtitle}>Voice expense entry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionCard} onPress={handleReceiptPress}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.quickActionTitle}>Upload receipt</Text>
                  <Text style={styles.quickActionSubtitle}>Photo, camera, or PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {hasManualAmount && (
            <>
              {/* Category Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        { width: categoryItemWidth, height: categoryItemWidth },
                        selectedCategory === category.id && {
                          borderColor: getCategoryColor(category.id),
                          borderWidth: 2,
                          backgroundColor: getCategoryColor(category.id) + '10',
                        },
                      ]}
                      onPress={() => handleCategorySelect(category.id)}
                    >
                      <Ionicons
                        name={category.icon}
                        size={24}
                        color={selectedCategory === category.id ? getCategoryColor(category.id) : Colors.gray500}
                      />
                      <Text
                        style={[
                          styles.categoryName,
                          selectedCategory === category.id && {
                            color: getCategoryColor(category.id),
                            fontWeight: FontWeight.semibold,
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note Input */}
              <View style={styles.section}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add note (optional)"
                  placeholderTextColor={Colors.gray400}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={200}
                />
              </View>

              {/* Save Button */}
              <Button
                title="Add Expense"
                onPress={handleSave}
                disabled={!amount || !selectedCategory}
                loading={isSubmitting}
                size="lg"
                style={styles.saveButton}
              />
            </>
          )}
        </ScrollView>

        {/* Floating Voice Button - Only visible when keyboard is active */}
        {keyboardVisible && !hasManualAmount && (
          <TouchableOpacity
            style={styles.floatingVoiceButton}
            onPress={handleVoicePress}
            activeOpacity={0.9}
          >
            <Ionicons name="mic" size={24} color={Colors.white} />
            <Text style={styles.floatingVoiceText}>Speak</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '1A',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  currencySymbol: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  amountInput: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary, // Match the Rupee symbol color
    minWidth: 100,
    textAlign: 'left', // Left align for proper cursor positioning
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryButton: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  categoryName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 60,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '2E',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  quickActionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.lg,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
  },
  voiceTextContainer: {
    marginLeft: Spacing.md,
    alignItems: 'center',
  },
  voiceTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  voiceSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  floatingVoiceButton: {
    position: 'absolute',
    bottom: 337,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    ...Shadows.lg,
    zIndex: 100,
    elevation: 10,
  },
  floatingVoiceText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
