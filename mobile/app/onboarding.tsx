import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
import { api } from '@/services/api';
import { requestSmsPermissions, startSmsTracking, stopSmsTracking } from '@/services/smsTracking';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency';

const { width } = Dimensions.get('window');

type Step = 'welcome' | 'income' | 'budget' | 'goals' | 'goal_details' | 'sms' | 'complete';

const SAVINGS_GOALS = [
  { id: 'emergency', label: 'Emergency Fund', icon: 'shield-checkmark', color: '#22C55E' },
  { id: 'vacation', label: 'Vacation', icon: 'airplane', color: '#3B82F6' },
  { id: 'investment', label: 'Investment', icon: 'trending-up', color: '#8B5CF6' },
  { id: 'gadget', label: 'New Gadget', icon: 'phone-portrait', color: '#EC4899' },
  { id: 'home', label: 'Home/Rent', icon: 'home', color: '#F59E0B' },
  { id: 'education', label: 'Education', icon: 'school', color: '#06B6D4' },
  { id: 'vehicle', label: 'Vehicle', icon: 'car', color: '#EF4444' },
  { id: 'wedding', label: 'Wedding', icon: 'heart', color: '#F472B6' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [exactIncome, setExactIncome] = useState('');
  const [exactBudget, setExactBudget] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalDetails, setGoalDetails] = useState<Record<string, { amount: string, date: string }>>({});
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('INR');
  const currencySymbol = getCurrencySymbol(currencyCode);

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const profile = await api.getProfile();
        const code = profile?.profile?.identity?.currency || profile?.profile?.currency;
        if (code) setCurrencyCode(String(code).toUpperCase());
      } catch {
        // Keep fallback currency during onboarding.
      }
    };
    loadCurrency();
  }, []);

  const getStepNumber = () => {
    switch (step) {
      case 'income': return { current: 1, total: 6 };
      case 'budget': return { current: 2, total: 6 };
      case 'goals': return { current: 3, total: 6 };
      case 'goal_details': return { current: 4, total: 6 };
      case 'sms': return { current: 5, total: 6 };
      case 'complete': return { current: 6, total: 6 };
      default: return { current: 0, total: 6 };
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
      if (selectedGoals.length > 0) {
        setStep('goal_details');
        setCurrentGoalIndex(0);
      } else {
        setStep('sms');
      }
    } else if (step === 'goal_details') {
      if (currentGoalIndex < selectedGoals.length - 1) {
        setCurrentGoalIndex(prev => prev + 1);
      } else {
        setStep('sms');
      }
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
    } else if (step === 'goal_details') {
      if (currentGoalIndex > 0) {
        setCurrentGoalIndex(prev => prev - 1);
      } else {
        setStep('goals');
      }
    } else if (step === 'sms') {
      if (selectedGoals.length > 0) {
        setStep('goal_details');
        setCurrentGoalIndex(selectedGoals.length - 1);
      } else {
        setStep('goals');
      }
    }
  };

  const handleSkip = () => {
    if (step === 'goal_details') {
      // Skip current detail
      if (currentGoalIndex < selectedGoals.length - 1) {
        setCurrentGoalIndex(prev => prev + 1);
      } else {
        setStep('sms');
      }
      return;
    }
    handleNext();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('is_onboarded', 'true');

      const parsedIncome = exactIncome ? parseInt(exactIncome.replace(/[^0-9]/g, ''), 10) : NaN;
      const parsedBudget = exactBudget ? parseInt(exactBudget.replace(/[^0-9]/g, ''), 10) : NaN;
      const normalizedIncome = Number.isFinite(parsedIncome) ? parsedIncome : undefined;
      const normalizedBudget = Number.isFinite(parsedBudget) ? parsedBudget : undefined;

      // Save normalized exact values for local fallback.
      if (normalizedIncome) {
        await AsyncStorage.setItem('user_income', String(normalizedIncome));
      }
      if (normalizedBudget) {
        await AsyncStorage.setItem('user_budget', String(normalizedBudget));
      }

      // Sync financial profile to backend
      try {
        await api.updateFinancialProfile({
          monthly_salary: normalizedIncome,
          monthly_budget: normalizedBudget,
        });
        console.log('Financial profile synced');
      } catch (syncError) {
        console.warn('Failed to sync financial profile:', syncError);
      }

      if (selectedGoals.length > 0) {
        await AsyncStorage.setItem('user_goals', JSON.stringify(selectedGoals));

        // Sync goals to backend for AI context
        try {
          const goalsToSync = selectedGoals.map(goalId => {
            const goalInfo = SAVINGS_GOALS.find(g => g.id === goalId);
            const details = goalDetails[goalId] || { amount: '', date: '' };
            return {
              id: goalId,
              label: goalInfo?.label || goalId,
              target_amount: details.amount || undefined,
              target_date: details.date || undefined,
            };
          });
          await api.syncGoals(goalsToSync);
          console.log('Goals synced to backend');
        } catch (syncError) {
          console.warn('Failed to sync goals to backend:', syncError);
        }
      }
      if (smsEnabled) {
        try {
          const result = await startSmsTracking();
          if (!result.started) {
            console.warn('SMS tracking did not start:', result.reason);
          }
        } catch (smsError) {
          console.warn('Failed to start SMS tracking:', smsError);
        }
      } else {
        await stopSmsTracking();
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

  const handleEnableSms = async () => {
    if (Platform.OS === 'android') {
      const granted = await requestSmsPermissions();
      if (!granted) {
        setSmsEnabled(false);
        return;
      }
    }
    setSmsEnabled(true);
    handleNext();
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const renderDots = () => {
    const steps: Step[] = ['income', 'budget', 'goals', 'goal_details', 'sms', 'complete'];
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
        Enter your exact monthly income for precise savings calculations.
      </Text>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Monthly Income ({currencySymbol})</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 85000"
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
            value={exactIncome}
            onChangeText={setExactIncome}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue →"
          onPress={handleNext}
          disabled={!exactIncome}
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
        Enter how much you plan to spend each month. Savings = Income - Budget.
      </Text>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Monthly Budget ({currencySymbol})</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 50000"
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
            value={exactBudget}
            onChangeText={setExactBudget}
          />
        </View>
        {exactIncome && exactBudget && (
          <View style={styles.savingsPreview}>
            <Text style={styles.savingsPreviewLabel}>Expected Monthly Savings:</Text>
            <Text style={styles.savingsPreviewValue}>
              {formatCurrency(
                Math.max(0, parseInt(exactIncome.replace(/,/g, '')) - parseInt(exactBudget.replace(/,/g, ''))),
                currencyCode
              )}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue →"
          onPress={handleNext}
          disabled={!exactBudget}
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

      <ScrollView
        style={styles.goalsScrollView}
        contentContainerStyle={styles.goalsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>What are you saving for?</Text>
        <Text style={styles.stepSubtitle}>
          Select your financial goals. We'll track your progress and give personalized tips.
        </Text>

        <View style={styles.goalsGrid}>
          {SAVINGS_GOALS.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  isSelected && { borderColor: goal.color, backgroundColor: goal.color + '15' },
                ]}
                onPress={() => toggleGoal(goal.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.goalIcon,
                  { backgroundColor: goal.color + '20' },
                ]}>
                  <Ionicons
                    name={goal.icon as any}
                    size={24}
                    color={goal.color}
                  />
                </View>
                <Text style={[
                  styles.goalLabel,
                  isSelected && { color: goal.color },
                ]}>
                  {goal.label}
                </Text>
                {isSelected && (
                  <View style={[styles.goalCheck, { backgroundColor: goal.color }]}>
                    <Ionicons name="checkmark" size={12} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.goalSelectedCount}>
          {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected
        </Text>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Button
          title="Continue →"
          onPress={handleNext}
          size="lg"
          style={styles.footerButton}
        />
      </View>
    </>
  );

  const renderGoalDetailsStep = () => {
    const currentGoalId = selectedGoals[currentGoalIndex];
    const currentGoal = SAVINGS_GOALS.find(g => g.id === currentGoalId);

    if (!currentGoal) return null;

    const details = goalDetails[currentGoalId] || { amount: '', date: '' };

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
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
            <Text style={styles.progressStepText}>GOAL DETAILS ({currentGoalIndex + 1}/{selectedGoals.length})</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${getProgress()}%` }]} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <View style={[styles.goalIcon, { backgroundColor: currentGoal.color + '20', width: 64, height: 64, borderRadius: 32 }]}>
              <Ionicons name={currentGoal.icon as any} size={32} color={currentGoal.color} />
            </View>
            <Text style={[styles.stepTitle, { marginTop: Spacing.md, textAlign: 'center' }]}>
              {currentGoal.label}
            </Text>
            <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
              Set your target for this goal.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount ({currencySymbol})</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1,00,000"
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
                value={details.amount}
                onChangeText={(text) => setGoalDetails(prev => ({
                  ...prev,
                  [currentGoalId]: { ...prev[currentGoalId], amount: text, date: prev[currentGoalId]?.date || '' }
                }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Date (Optional)</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={details.date ? styles.dateInputText : styles.dateInputPlaceholder}>
                  {details.date || 'Select date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.gray500} />
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={details.date ? new Date(details.date) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (event.type === 'set' && selectedDate) {
                  const dateStr = selectedDate.toISOString().split('T')[0];
                  setGoalDetails(prev => ({
                    ...prev,
                    [currentGoalId]: { ...prev[currentGoalId], date: dateStr, amount: prev[currentGoalId]?.amount || '' }
                  }));
                  if (Platform.OS === 'ios') {
                    setShowDatePicker(false);
                  }
                } else if (event.type === 'dismissed') {
                  setShowDatePicker(false);
                }
              }}
            />
          )}
        </ScrollView>

        <View style={styles.stickyFooter}>
          <Button
            title={currentGoalIndex < selectedGoals.length - 1 ? "Next Goal →" : "Continue →"}
            onPress={handleNext}
            disabled={!details.amount}
            size="lg"
            style={styles.footerButton}
          />
        </View>
      </KeyboardAvoidingView>
    );
  };

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
        onPress={handleEnableSms}
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
          {step === 'goal_details' && renderGoalDetailsStep()}
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
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300
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
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  getStartedText: {
    color: Colors.textInverse,
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
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primaryLight + '20',
  },
  optionCardText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: Spacing.xl,
  },
  footerButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },

  // Goal Details Styles
  formContainer: {
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  datePickerButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  dateInputPlaceholder: {
    fontSize: FontSize.md,
    color: Colors.gray400,
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
  goalSelectedCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  goalsScrollView: {
    flex: 1,
  },
  goalsScrollContent: {
    paddingBottom: Spacing.lg,
  },
  stickyFooter: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.background,
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
  savingsPreview: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  savingsPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  savingsPreviewValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});
