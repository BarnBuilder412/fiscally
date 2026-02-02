import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  Colors, 
  Spacing, 
  FontSize, 
  FontWeight, 
  BorderRadius 
} from '@/constants/theme';
import { Button } from '@/components';
import { INCOME_RANGES } from '@/constants';

const { width } = Dimensions.get('window');

type Step = 'income' | 'sms' | 'complete';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('income');
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const handleNext = () => {
    if (step === 'income') {
      setStep('sms');
    } else if (step === 'sms') {
      setStep('complete');
    }
  };

  const handleSkip = () => {
    if (step === 'income') {
      setStep('sms');
    } else if (step === 'sms') {
      setStep('complete');
    }
  };

  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  const handleAddExpense = () => {
    router.replace('/add-expense');
  };

  const renderDots = () => {
    const steps: Step[] = ['income', 'sms', 'complete'];
    return (
      <View style={styles.dotsContainer}>
        {steps.map((s) => (
          <View
            key={s}
            style={[
              styles.dot,
              step === s && styles.dotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderIncomeStep = () => (
    <>
      <Text style={styles.title}>What's your monthly income?</Text>
      <Text style={styles.subtitle}>This helps us give better insights</Text>

      <View style={styles.optionsContainer}>
        {INCOME_RANGES.map((range) => (
          <TouchableOpacity
            key={range.id}
            style={[
              styles.optionButton,
              selectedIncome === range.id && styles.optionButtonSelected,
            ]}
            onPress={() => setSelectedIncome(range.id)}
          >
            <View style={styles.radioOuter}>
              {selectedIncome === range.id && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.optionText,
                selectedIncome === range.id && styles.optionTextSelected,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Continue"
        onPress={handleNext}
        disabled={!selectedIncome}
        size="lg"
        style={styles.continueButton}
      />
    </>
  );

  const renderSmsStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles" size={64} color={Colors.primary} />
      </View>

      <Text style={styles.title}>Auto-track your expenses?</Text>
      <Text style={styles.subtitle}>
        We can read your bank SMS to automatically log transactions
      </Text>

      <View style={styles.benefitsCard}>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.benefitText}>Only reads bank SMS</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.benefitText}>Never personal messages</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.benefitText}>Processed on your device</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.benefitText}>Disable anytime</Text>
        </View>
      </View>

      <Button
        title="✓ Enable Auto-Tracking"
        onPress={() => {
          setSmsEnabled(true);
          handleNext();
        }}
        size="lg"
        style={styles.continueButton}
      />

      <TouchableOpacity onPress={handleSkip} style={styles.skipLink}>
        <Text style={styles.skipLinkText}>I'll add expenses manually</Text>
      </TouchableOpacity>
    </>
  );

  const renderCompleteStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Text style={styles.sparkle}>✨</Text>
      </View>

      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>
        Add your first expense, or we'll capture it automatically from SMS
      </Text>

      <Button
        title="+ Add First Expense"
        onPress={handleAddExpense}
        size="lg"
        style={styles.continueButton}
      />

      <Button
        title="🎤 Or speak: '200 coffee'"
        onPress={handleAddExpense}
        variant="outline"
        size="lg"
        style={styles.voiceButton}
      />

      <TouchableOpacity onPress={handleComplete} style={styles.skipLink}>
        <Text style={styles.skipLinkText}>Skip to Dashboard →</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      {step !== 'complete' && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={styles.content}>
        {step === 'income' && renderIncomeStep()}
        {step === 'sms' && renderSmsStep()}
        {step === 'complete' && renderCompleteStep()}
      </View>

      {/* Dots */}
      {renderDots()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.xl,
    zIndex: 1,
  },
  skipText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sparkle: {
    fontSize: 64,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: Spacing.xl,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: FontWeight.medium,
  },
  benefitsCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  benefitText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
  },
  continueButton: {
    marginBottom: Spacing.md,
  },
  voiceButton: {
    marginBottom: Spacing.lg,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipLinkText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray300,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
});
