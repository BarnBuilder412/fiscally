import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
  Shadows,
} from '@/constants/theme';
import { Button } from '@/components';
import { INCOME_RANGES } from '@/constants';

const { width } = Dimensions.get('window');

type Step = 'welcome' | 'income' | 'sms' | 'complete';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const handleNext = () => {
    if (step === 'welcome') {
      setStep('income');
    } else if (step === 'income') {
      setStep('sms');
    } else if (step === 'sms') {
      setStep('complete');
    }
  };

  const handleSkip = () => {
    if (step === 'welcome') {
      setStep('income');
    } else if (step === 'income') {
      setStep('sms');
    } else if (step === 'sms') {
      setStep('complete');
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('is_onboarded', 'true');
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to save onboarding state', e);
      router.replace('/(tabs)');
    }
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

  const renderWelcomeStep = () => (
    <LinearGradient
      colors={[Colors.background, '#EAE0D5']}
      style={styles.welcomeContainer}
    >
      <View style={styles.welcomeContent}>
        <View style={styles.logoContainer}>
          <SimpleLogo />
        </View>
        <Text style={styles.welcomeTitle}>Fiscally</Text>

        <View style={styles.heroContainer}>
          <LinearGradient
            colors={['#4A4A4A', '#2D2723']}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Abstract lines simulation */}
            <View style={styles.abstractLine1} />
            <View style={styles.abstractLine2} />
          </LinearGradient>
        </View>

        <Text style={styles.heroHeadline}>
          Your AI-powered{'\n'}expense companion
        </Text>
        <Text style={styles.heroSubtext}>
          Effortless tracking and intelligent{'\n'}insights for your daily finances.
        </Text>

        <Button
          title="Get Started"
          onPress={handleNext}
          size="lg"
          style={styles.getStartedButton}
          textStyle={styles.getStartedText}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderIncomeStep = () => (
    <>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.headerSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressStepText}>STEP 2 OF 5</Text>
          <Text style={styles.progressStepText}>ONBOARDING</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '40%' }]} />
        </View>
      </View>

      <Text style={styles.stepTitle}>What's your monthly income?</Text>
      <Text style={styles.stepSubtitle}>
        This helps our AI calibrate your spending limits and personal savings goals.
      </Text>

      <View style={styles.optionsContainer}>
        {INCOME_RANGES.map((range) => (
          <TouchableOpacity
            key={range.id}
            style={[
              styles.optionCard,
              selectedIncome === range.id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedIncome(range.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionCardText}>{range.label}</Text>
            <View style={[
              styles.radioButton,
              selectedIncome === range.id && styles.radioButtonSelected
            ]}>
              {selectedIncome === range.id && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue →"
          onPress={handleNext}
          disabled={!selectedIncome}
          size="lg"
          style={styles.footerButton}
        />
      </View>
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
      {/* Content */}
      {step === 'welcome' ? (
        renderWelcomeStep()
      ) : (
        <View style={styles.content}>
          {step === 'income' && renderIncomeStep()}
          {step === 'sms' && renderSmsStep()}
          {step === 'complete' && renderCompleteStep()}
        </View>
      )}

      {/* Dots - Only show for SMS and Complete */}
      {(step === 'sms' || step === 'complete') && renderDots()}
    </SafeAreaView>
  );
}

const SimpleLogo = () => (
  <View style={{
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EAE0D5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6C8B5'
  }}>
    <Ionicons name="wallet-outline" size={32} color={Colors.textSecondary} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  heroContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.lg,
  },
  heroCard: {
    flex: 1,
    position: 'relative',
  },
  abstractLine1: {
    position: 'absolute',
    top: '20%',
    left: '-10%',
    width: '120%',
    height: 100,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.3)',
    transform: [{ rotate: '-15deg' }],
  },
  abstractLine2: {
    position: 'absolute',
    top: '40%',
    left: '-10%',
    width: '120%',
    height: 100,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.3)',
    transform: [{ rotate: '-12deg' }],
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 34,
  },
  heroSubtext: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  getStartedButton: {
    backgroundColor: '#3E3630',
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  getStartedText: {
    color: '#EAE0D5',
    fontWeight: FontWeight.bold,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#C5A059',
  },

  // Income Step Styles
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  headerSkipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#2D2723',
  },
  progressContainer: {
    marginBottom: Spacing.xl,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressStepText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#EAE0D5',
    borderRadius: 2,
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2D2723',
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
    marginBottom: Spacing.md,
    lineHeight: 40,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    color: '#64748B',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.black,
    height: 64,
  },
  optionCardSelected: {
    backgroundColor: '#FFFBEB', // Light yellow/cream bg
  },
  optionCardText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#0F172A',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#0F172A',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: Spacing.xl,
  },
  footerButton: {
    backgroundColor: '#1E293B',
    borderRadius: BorderRadius.full,
  },

  // Existing/Shared Styles
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
    paddingHorizontal: Spacing.xl,
    paddingTop: 20,
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
