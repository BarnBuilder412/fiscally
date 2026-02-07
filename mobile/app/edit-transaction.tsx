import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { CATEGORIES } from '@/constants/categories';
import { Button } from '@/components';
import { api } from '@/services/api';
import { eventBus, Events } from '@/services/eventBus';
import { Transaction } from '@/types';

export default function EditTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const transactionId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('other');

  useEffect(() => {
    const load = async () => {
      if (!transactionId) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getTransactionById(transactionId);
        setTransaction(data);
        setAmount(String(Math.round(data.amount)));
        setMerchant(data.merchant || '');
        setNote(data.note || '');
        setCategory(data.category || 'other');
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load transaction');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [transactionId]);

  const handleSave = async () => {
    if (!transactionId || !amount) return;
    setSaving(true);
    try {
      await api.updateTransaction(transactionId, {
        amount: parseFloat(amount),
        merchant: merchant || undefined,
        note: note || undefined,
        category,
      });
      eventBus.emit(Events.TRANSACTION_UPDATED);
      router.back();
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Unable to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!transactionId) return;
    Alert.alert('Delete transaction?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await api.deleteTransaction(transactionId);
            eventBus.emit(Events.TRANSACTION_DELETED);
            router.back();
          } catch (error: any) {
            Alert.alert('Delete Failed', error?.message || 'Unable to delete transaction');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Transaction not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Expense</Text>
        <TouchableOpacity onPress={handleDelete} disabled={deleting}>
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={Colors.gray400}
        />

        <Text style={styles.label}>Merchant</Text>
        <TextInput
          style={styles.input}
          value={merchant}
          onChangeText={setMerchant}
          placeholder="Merchant name"
          placeholderTextColor={Colors.gray400}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.chip, category === item.id && styles.chipActive]}
              onPress={() => setCategory(item.id)}
            >
              <Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Need/Want/Luxury</Text>
        <Text style={styles.readOnlyValue}>
          {(transaction.spend_class || 'Not classified yet').toUpperCase()}
        </Text>

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Optional note"
          placeholderTextColor={Colors.gray400}
        />

        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving || deleting}
          size="lg"
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: Spacing.sm,
  },
  label: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  readOnlyValue: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  chipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  saveButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
});
