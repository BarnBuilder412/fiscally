import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius,
} from '@/constants/theme';
import { Button, Input } from '@/components';
import { api } from '@/services/api';

type Step = 'email' | 'otp';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; otp?: string; password?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestOtp = async () => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await api.forgotPassword(email);
      setSuccessMessage(result.message);
      setStep('otp');
    } catch (err: any) {
      setErrors({ email: err.message || 'Failed to send reset code' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newErrors: typeof errors = {};
    if (!otp) {
      newErrors.otp = 'Reset code is required';
    } else if (otp.length !== 6) {
      newErrors.otp = 'Code must be 6 digits';
    }
    if (!newPassword) {
      newErrors.password = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await api.resetPassword(email, otp, newPassword);
      setSuccessMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (err: any) {
      setErrors({ otp: err.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === 'email' ? 'mail-outline' : 'key-outline'}
                size={36}
                color={Colors.primary}
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password?' : 'Enter Reset Code'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? "No worries! Enter your email and we'll send you a reset code."
                : 'Enter the 6-digit code and your new password.'}
            </Text>
          </View>

          {/* Success banner */}
          {successMessage ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Step 1: Email */}
          {step === 'email' && (
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.gray400} />}
              />

              <Button
                title="Send Reset Code"
                onPress={handleRequestOtp}
                loading={loading}
                size="lg"
                style={styles.submitButton}
              />
            </View>
          )}

          {/* Step 2: OTP + New Password */}
          {step === 'otp' && (
            <View style={styles.form}>
              <Input
                label="Reset Code"
                placeholder="123456"
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                error={errors.otp}
                leftIcon={<Ionicons name="keypad-outline" size={20} color={Colors.gray400} />}
              />

              <Input
                label="New Password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                error={errors.password}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={Colors.gray400} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.gray400}
                    />
                  </TouchableOpacity>
                }
              />

              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                size="lg"
                style={styles.submitButton}
              />

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  setStep('email');
                  setOtp('');
                  setNewPassword('');
                  setErrors({});
                  setSuccessMessage('');
                }}
              >
                <Text style={styles.resendText}>Didn't receive the code? Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Back to login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  successText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    flex: 1,
    fontWeight: FontWeight.medium,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  resendText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  loginText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
