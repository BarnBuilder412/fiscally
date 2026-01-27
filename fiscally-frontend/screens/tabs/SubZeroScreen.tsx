import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../lib/theme';
import Button from '../../components/Button';
import SubZeroNegotiationModal from '../modals/SubZeroNegotiationModal';

interface Dispute {
  id: string;
  merchant: string;
  amount: number;
  status: 'negotiating' | 'won' | 'pending';
  lastMessage: string;
  date: string;
}

const mockDisputes: Dispute[] = [
  {
    id: '1',
    merchant: 'Amazon',
    amount: 47.99,
    status: 'negotiating',
    lastMessage: 'I found similar cases where merchants refunded 85%...',
    date: 'Today',
  },
  {
    id: '2',
    merchant: 'Uber',
    amount: 32.50,
    status: 'won',
    lastMessage: 'Refund approved. Expected in 3-5 business days.',
    date: 'Yesterday',
  },
  {
    id: '3',
    merchant: 'Spotify',
    amount: 14.99,
    status: 'pending',
    lastMessage: 'Escalating to merchant disputes team...',
    date: '2 days ago',
  },
];

const statusColors: Record<string, string> = {
  negotiating: colors.warning,
  won: colors.success,
  pending: colors.info,
};

const statusLabels: Record<string, string> = {
  negotiating: 'Negotiating',
  won: 'Won',
  pending: 'Pending',
};

export default function SubZeroScreen() {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);

  const renderDispute = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={[styles.disputeCard, shadows.sm]}
      activeOpacity={0.7}
      onPress={() => {
        setSelectedDispute(item);
        setShowNegotiationModal(true);
      }}
    >
      <View style={styles.disputeHeader}>
        <View style={styles.merchantInfo}>
          <View style={styles.merchantIcon}>
            <MaterialCommunityIcons name="store" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.merchantName}>{item.merchant}</Text>
            <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
          <Text style={styles.statusText}>{statusLabels[item.status]}</Text>
        </View>
      </View>
      <Text style={styles.lastMessage} numberOfLines={2}>
        {item.lastMessage}
      </Text>
      <Text style={styles.date}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.title}>SubZero</Text>
              <Text style={styles.subtitle}>Autonomous Negotiations</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3 ACTIVE</Text>
            </View>
          </View>

          {/* New Negotiation Button */}
          <Button
            title="+ New Negotiation"
            onPress={() => {}}
            style={styles.newButton}
          />

          {/* Active Disputes */}
          <Text style={styles.sectionTitle}>Active Disputes</Text>
          <FlatList
            data={mockDisputes}
            renderItem={renderDispute}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Negotiation Modal */}
      {selectedDispute && (
        <Modal
          visible={showNegotiationModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowNegotiationModal(false)}
        >
          <SubZeroNegotiationModal
            merchant={selectedDispute.merchant}
            amount={selectedDispute.amount}
            onClose={() => {
              setShowNegotiationModal(false);
              setSelectedDispute(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textDark,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.label,
    color: colors.bgCardLight,
    fontSize: 11,
  },
  newButton: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  disputeCard: {
    backgroundColor: colors.bgCardLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  merchantIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantName: {
    ...typography.body,
    color: colors.textDark,
    fontWeight: '600',
  },
  amount: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.label,
    color: colors.bgCardLight,
    fontSize: 10,
  },
  lastMessage: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  date: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 11,
  },
});