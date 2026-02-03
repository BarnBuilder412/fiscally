import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
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

export default function AddExpenseScreen() {
  const router = useRouter();
  const { getGridItemWidth, isSmall } = useResponsive();
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryItemWidth = getGridItemWidth(4, 8, 16);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        merchant: note || 'Manual Expense', // Using note as merchant/description for now
        category: selectedCategory,
        note: note,
        source: 'manual',
      });
      handleSafeBack();
    } catch (error: any) {
      alert(error.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoicePress = () => {
    router.push('/voice-input');
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    return numericValue;
  };

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
        >
          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
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
            title="💾  Save"
            onPress={handleSave}
            disabled={!amount || !selectedCategory}
            loading={isSubmitting}
            size="lg"
            style={styles.saveButton}
          />

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Voice Input */}
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleVoicePress}
          >
            <Ionicons name="mic" size={24} color={Colors.primary} />
            <View style={styles.voiceTextContainer}>
              <Text style={styles.voiceTitle}>Hold to speak</Text>
              <Text style={styles.voiceSubtitle}>"450 swiggy dinner"</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
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
    color: Colors.textPrimary,
    minWidth: 100,
    textAlign: 'center',
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
});
