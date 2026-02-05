import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
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

type Step = 'welcome' | 'income' | 'budget' | 'goals' | 'sms' | 'complete';

const BUDGET_RANGES = [
  { id: 'below_20k', label: 'Less than ₹20,000' },
  { id: '20k_40k', label: '₹20,000 - ₹40,000' },
  { id: '40k_70k', label: '₹40,000 - ₹70,000' },
  { id: '70k_100k', label: '₹70,000 - ₹1,00,000' },
  { id: 'above_100k', label: 'More than ₹1,00,000' },
];

const SAVINGS_GOALS = [
  { id: 'emergency', label: 'Emergency Fund', icon: 'shield-checkmark' },
  { id: 'vacation', label: 'Vacation', icon: 'airplane' },
  { id: 'investment', label: 'Investment', icon: 'trending-up' },
  { id: 'gadget', label: 'New Gadget', icon: 'phone-portrait' },
  { id: 'home', label: 'Home/Rent', icon: 'home' },
  { id: 'education', label: 'Education', icon: 'school' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedIncome, setSelectedIncome] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const getStepNumber = () => {
    switch (step) {
      case 'income': return { current: 1, total: 5 };
      case 'budget': return { current: 2, total: 5 };
      case 'goals': return { current: 3, total: 5 };
      case 'sms': return { current: 4, total: 5 };
      case 'complete': return { current: 5, total: 5 };
      default: return { current: 0, total: 5 };
    }
  };

  const getProgress = () => {
    const { current, total } = getStepNumber();
    return (current / total) * 100;
  };

  const handleNext = () => {
    if (step === 'welcome') {
      setStep('income');
    } else if (step === 'income') {
      setStep('budget');
    } else if (step === 'budget') {
      setStep('goals');
    } else if (step === 'goals') {
      setStep('sms');
    } else if (step === 'sms') {
      setStep('complete');
    }
  };

  const handleBack = () => {
    if (step === 'income') {
      setStep('welcome');
    } else if (step === 'budget') {
      setStep('income');
    } else if (step === 'goals') {
      setStep('budget');
    } else if (step === 'sms') {
      setStep('goals');
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('is_onboarded', 'true');
      // Save budget and goals if needed
      if (selectedBudget) {
        await AsyncStorage.setItem('user_budget', selectedBudget);
      }
      if (selectedGoals.length > 0) {
        await AsyncStorage.setItem('user_goals', JSON.stringify(selectedGoals));
      }
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to save onboarding state', e);
      router.replace('/(tabs)');
    }
  };

  const handleAddExpense = () => {
    router.replace('/add-expense');
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const renderDots = () => {
    const steps: Step[] = ['income', 'budget', 'goals', 'sms', 'complete'];
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
      </View>
    </LinearGradient>
  );

  const renderIncomeStep = () => (
    <>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressStepText}>STEP {getStepNumber().current} OF {getStepNumber().total}</Text>
          <Text style={styles.progressStepText}>ONBOARDING</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${getProgress()}%` }]} />
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

  const renderBudgetStep = () => (
    <>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.headerSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressStepText}>STEP {getStepNumber().current} OF {getStepNumber().total}</Text>
          <Text style={styles.progressStepText}>BUDGET</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${getProgress()}%` }]} />
        </View>
      </View>

      <Text style={styles.stepTitle}>Set your monthly budget</Text>
      <Text style={styles.stepSubtitle}>
        How much do you want to spend each month? We'll help you stay on track.
      </Text>

      <View style={styles.optionsContainer}>
        {BUDGET_RANGES.map((range) => (
          <TouchableOpacity
            key={range.id}
            style={[
              styles.optionCard,
              selectedBudget === range.id && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedBudget(range.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionCardText}>{range.label}</Text>
            <View style={[
              styles.radioButton,
              selectedBudget === range.id && styles.radioButtonSelected
            ]}>
              {selectedBudget === range.id && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue →"
          onPress={handleNext}
          disabled={!selectedBudget}
          size="lg"
          style={styles.footerButton}
        />
      </View>
    </>
  );

  const renderGoalsStep = () => (
    <>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.headerSkipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressStepText}>STEP {getStepNumber().current} OF {getStepNumber().total}</Text>
          <Text style={styles.progressStepText}>GOALS</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${getProgress()}%` }]} />
        </View>
      </View>

      <Text style={styles.stepTitle}>What are you saving for?</Text>
      <Text style={styles.stepSubtitle}>
        Select your financial goals. We'll track your progress and give personalized tips.
      </Text>

      <View style={styles.goalsGrid}>
        {SAVINGS_GOALS.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              selectedGoals.includes(goal.id) && styles.goalCardSelected,
            ]}
            onPress={() => toggleGoal(goal.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.goalIcon,
              selectedGoals.includes(goal.id) && styles.goalIconSelected,
            ]}>
              <Ionicons
                name={goal.icon as any}
                size={24}
                color={selectedGoals.includes(goal.id) ? Colors.primary : Colors.gray500}
              />
            </View>
            <Text style={[
              styles.goalLabel,
              selectedGoals.includes(goal.id) && styles.goalLabelSelected,
            ]}>
              {goal.label}
            </Text>
            {selectedGoals.includes(goal.id) && (
              <View style={styles.goalCheck}>
                <Ionicons name="checkmark" size={12} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue →"
          onPress={handleNext}
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
      {/* Skip Button - Only for welcome and sms steps */}
      {(step === 'welcome' || step === 'sms') && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      {step === 'welcome' ? (
        renderWelcomeStep()
      ) : (
        <View style={styles.content}>
          {step === 'income' && renderIncomeStep()}
          {step === 'budget' && renderBudgetStep()}
          {step === 'goals' && renderGoalsStep()}
          {step === 'sms' && renderSmsStep()}
          {step === 'complete' && renderCompleteStep()}
        </View>
      )}

      {/* Dots - Show for steps after welcome */}
      {step !== 'welcome' && renderDots()}
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

  // Goals Step Styles
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  goalCard: {
    width: '47%',
    aspectRatio: 1.2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  goalIconSelected: {
    backgroundColor: Colors.primary + '20',
  },
  goalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: Colors.primary,
  },
  goalCheck: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
