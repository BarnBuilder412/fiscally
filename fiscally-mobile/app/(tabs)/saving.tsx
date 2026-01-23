import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { ChevronLeft, Info, Shield, Zap, Bot, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { subzeroAPI, Subscription, NegotiationMessage, NegotiationStatus } from '../../lib/subzero-api';

// Design colors matching the web frontend
const colors = {
    background: '#F1EFE9',
    card: '#FFFFFF',
    primary: '#6366F1',
    foreground: '#2D3436',
    muted: '#9CA3AF',
    border: '#E2E2E2',
    success: '#10B981',
    danger: '#EF4444',
};

type ViewMode = 'list' | 'negotiating' | 'result';

export default function SavingScreen() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [negotiation, setNegotiation] = useState<NegotiationStatus | null>(null);
    const [messages, setMessages] = useState<NegotiationMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        loadSubscriptions();
    }, []);

    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            const data = await subzeroAPI.getSubscriptions();
            setSubscriptions(data);
        } catch (err) {
            setError('Failed to load subscriptions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const simulateNegotiationFlow = async (negotiationId: string) => {
        // 1. Initial Status
        const status = await subzeroAPI.getNegotiationStatus(negotiationId);
        setNegotiation(status);
        setMessages(status.messages);

        // 2. Simulate "Connecting"
        await new Promise(r => setTimeout(r, 1500));
        setMessages(prev => [...prev, {
            role: 'system',
            content: 'Connected to Adobe Support Agent (Automated).',
            timestamp: new Date().toISOString()
        }]);

        // 3. Simulate "Vendor Response"
        await new Promise(r => setTimeout(r, 2000));
        setMessages(prev => [...prev, {
            role: 'vendor',
            content: 'Hello. I see you want to cancel. May I ask why you are leaving us today?',
            timestamp: new Date().toISOString()
        }]);

        // 4. Simulate "Agent Reply"
        await new Promise(r => setTimeout(r, 1500));
        setMessages(prev => [...prev, {
            role: 'agent',
            content: 'User intended to cancel due to high cost. Please process immediate refund per consumer rights policy.',
            timestamp: new Date().toISOString()
        }]);

        // 5. Simulate "Offer"
        await new Promise(r => setTimeout(r, 2500));
        const offerMsg: NegotiationMessage = {
            role: 'vendor',
            content: 'We can offer you 2 months free to stay. Would that work for you?',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, offerMsg]);

        // Update negotiation state to show decision
        setNegotiation(prev => prev ? ({
            ...prev,
            vendor_offer: {
                offer_type: 'retention',
                description: 'Adobe offered 2 months free ($109.98 value) to keep your subscription.',
                requires_user_decision: true
            }
        }) : null);
    };

    const startNegotiation = async (subscription: Subscription) => {
        setSelectedSubscription(subscription);
        setViewMode('negotiating');
        setMessages([]);
        setLoading(true);
        setError(null);

        try {
            const response = await subzeroAPI.startNegotiation({
                merchant_name: subscription.merchant_name,
                amount: subscription.amount,
                goal: 'full_refund',
            });

            // Start the simulation
            simulateNegotiationFlow(response.negotiation_id);

        } catch (err) {
            setError('Failed to start negotiation');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUserDecision = async (decision: 'accept' | 'reject') => {
        if (!negotiation) return;

        setLoading(true);
        try {
            const status = await subzeroAPI.submitDecision(negotiation.id, decision);
            setNegotiation(status);

            if (status.status === 'completed') {
                setViewMode('result');
            }
        } catch (err) {
            setError('Failed to submit decision');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetNegotiation = () => {
        setViewMode('list');
        setSelectedSubscription(null);
        setNegotiation(null);
        setMessages([]);
        setError(null);
    };

    const renderSubscriptionList = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>YOUR SUBSCRIPTIONS</Text>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {subscriptions.map((sub) => (
                <View key={sub.id} style={styles.subscriptionCard}>
                    <View style={styles.subscriptionInfo}>
                        <Text style={styles.merchantName}>{sub.merchant_name}</Text>
                        <Text style={styles.billingInfo}>
                            ${sub.amount.toFixed(2)} / {sub.billing_frequency}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.negotiateButton}
                        onPress={() => startNegotiation(sub)}
                    >
                        <Text style={styles.negotiateButtonText}>NEGOTIATE</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );

    const renderNegotiationChat = () => (
        <View style={styles.content}>
            {selectedSubscription && (
                <View style={styles.targetCard}>
                    {/* Placeholder for Merchant Image - using a gradient/color block for now */}
                    <View style={styles.targetImagePlaceholder}>
                        <Text style={styles.targetImageText}>{selectedSubscription.merchant_name.substring(0, 2).toUpperCase()}</Text>
                    </View>

                    <View style={styles.targetContent}>
                        <Text style={styles.targetLabel}>TARGET ENTITY</Text>
                        <Text style={styles.targetName}>{selectedSubscription.merchant_name}</Text>
                        <View style={styles.targetAmountRow}>
                            <Text style={styles.amountLabel}>Billing Amount</Text>
                            <View style={styles.evidenceBadge}>
                                <Text style={styles.evidenceText}>EVIDENCE</Text>
                            </View>
                        </View>
                        <Text style={styles.amountValue}>${selectedSubscription.amount.toFixed(2)} <Text style={styles.amountPeriod}>/ mo</Text></Text>
                    </View>
                </View>
            )}

            <View style={styles.leverageCard}>
                <View style={styles.leverageHeader}>
                    <View style={styles.leverageIcon}>
                        <Zap size={14} color="#FFF" />
                    </View>
                    <Text style={styles.leverageTitle}>STRATEGIC LEVERAGE</Text>
                    <Text style={styles.leverageScore}>78%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: '78%' }]} />
                </View>
                <Text style={styles.leverageText}>Analyzing Adobe policy updates... Settlement probable.</Text>
            </View>

            <Text style={styles.sectionTitle}>TACTICAL FEED</Text>

            <ScrollView
                ref={scrollViewRef}
                style={styles.chatContainer}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((msg, index) => (
                    <View key={index} style={styles.messageRow}>
                        <View style={[
                            styles.messageIcon,
                            msg.role === 'agent' && { backgroundColor: '#1F2937' },
                            msg.role === 'vendor' && { backgroundColor: colors.primary },
                            msg.role === 'system' && { backgroundColor: colors.muted },
                        ]}>
                            {msg.role === 'agent' && <Bot size={16} color="#FFF" />}
                            {msg.role === 'vendor' && <Shield size={16} color="#FFF" />}
                            {msg.role === 'system' && <Info size={16} color="#FFF" />}
                        </View>
                        <View style={[
                            styles.messageBubble,
                            msg.role === 'vendor' && { backgroundColor: 'rgba(99, 102, 241, 0.08)' },
                            msg.role === 'system' && { backgroundColor: '#F3F4F6' },
                        ]}>
                            <Text style={styles.messageRoleText}>
                                {msg.role === 'agent' ? 'SUBZERO AGENT' : msg.role.toUpperCase()}
                            </Text>
                            <Text style={styles.messageContent}>{msg.content}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {negotiation?.vendor_offer?.requires_user_decision && (
                <View style={styles.decisionPanel}>
                    <Text style={styles.decisionTitle}>STRATEGIC DECISION</Text>
                    <Text style={styles.decisionDescription}>
                        {negotiation.vendor_offer.description}
                    </Text>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleUserDecision('accept')}
                        disabled={loading}
                    >
                        <Text style={styles.acceptButtonText}>Accept 2 Free Months</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleUserDecision('reject')}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.rejectButtonText}>PUSH FOR FULL REFUND</Text>}
                    </TouchableOpacity>

                    <View style={styles.securityRow}>
                        <View style={styles.securityItem}>
                            <Shield size={12} color={colors.muted} />
                            <Text style={styles.securityText}>SECURE PROTOCOL</Text>
                        </View>
                        <View style={styles.securityItem}>
                            <Zap size={12} color={colors.muted} />
                            <Text style={styles.securityText}>AI ENFORCED</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const renderResult = () => (
        <View style={styles.content}>
            <View style={styles.resultCard}>
                {negotiation?.outcome?.outcome_type === 'refund_approved' ? (
                    <>
                        <View style={[styles.resultIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <CheckCircle size={36} color={colors.success} />
                        </View>
                        <Text style={styles.resultTitle}>Success! 🎉</Text>
                        <Text style={styles.resultDescription}>{negotiation.outcome.description}</Text>
                        <Text style={styles.resultAmount}>
                            ${negotiation.outcome.amount_saved.toFixed(2)} Saved
                        </Text>
                    </>
                ) : negotiation?.outcome?.outcome_type === 'refund_denied' ? (
                    <>
                        <View style={[styles.resultIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                            <XCircle size={36} color={colors.danger} />
                        </View>
                        <Text style={styles.resultTitle}>Denied</Text>
                        <Text style={styles.resultDescription}>{negotiation?.outcome?.description}</Text>
                    </>
                ) : (
                    <>
                        <View style={[styles.resultIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                            <AlertCircle size={36} color={colors.primary} />
                        </View>
                        <Text style={styles.resultTitle}>Completed</Text>
                        <Text style={styles.resultDescription}>{negotiation?.outcome?.description}</Text>
                    </>
                )}

                {negotiation?.outcome?.confirmation_message && (
                    <Text style={styles.confirmationMsg}>{negotiation.outcome.confirmation_message}</Text>
                )}

                <TouchableOpacity style={styles.backButton} onPress={resetNegotiation}>
                    <Text style={styles.backButtonText}>Back to Subscriptions</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={viewMode === 'list' ? () => router.back() : resetNegotiation}
                >
                    <ChevronLeft size={24} color={colors.foreground} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                        {viewMode === 'negotiating' && <View style={styles.activeDot} />}
                        <Text style={styles.headerTitle}>
                            {viewMode === 'list' ? 'SUBZERO' :
                                viewMode === 'negotiating' ? 'NEGOTIATION ACTIVE' : 'COMPLETE'}
                        </Text>
                    </View>
                    <Text style={styles.headerSubtitle}>
                        {viewMode === 'list' ? 'Subscription Rescue' : 'SubZero Agent v2.4.1'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.headerButton}>
                    <Info size={20} color={colors.foreground} />
                </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {error && (
                <View style={styles.errorBanner}>
                    <AlertCircle size={16} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {viewMode === 'list' && renderSubscriptionList()}
                {viewMode === 'negotiating' && renderNegotiationChat()}
                {viewMode === 'result' && renderResult()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.foreground,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    headerSubtitle: {
        fontSize: 10,
        color: colors.muted,
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.muted,
        letterSpacing: 2,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    subscriptionCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    subscriptionInfo: {
        flex: 1,
    },
    merchantName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.foreground,
    },
    billingInfo: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 4,
    },
    negotiateButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 10,
    },
    negotiateButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    targetCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    targetImagePlaceholder: {
        height: 120,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetImageText: {
        fontSize: 40,
        fontWeight: '900',
        color: '#C7D2FE',
    },
    targetContent: {
        padding: 20,
    },
    targetLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    targetName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.foreground,
        marginBottom: 8,
    },
    targetAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    amountLabel: {
        fontSize: 14,
        color: colors.muted,
    },
    evidenceBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    evidenceText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    amountValue: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.foreground,
    },
    amountPeriod: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.muted,
    },
    leverageCard: {
        backgroundColor: '#F8F8F6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    leverageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    leverageIcon: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    leverageTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.foreground,
        letterSpacing: 1,
        flex: 1,
    },
    leverageScore: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.primary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    leverageText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    chatContainer: {
        maxHeight: 300,
        marginBottom: 16,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    messageIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    messageBubble: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderTopLeftRadius: 4,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageRoleText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.muted,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    messageContent: {
        fontSize: 14,
        color: colors.foreground,
        lineHeight: 20,
    },
    decisionPanel: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 8,
    },
    decisionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.muted,
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 12,
    },
    decisionDescription: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.foreground,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    acceptButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    acceptButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
        textAlign: 'center',
    },
    rejectButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    rejectButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    securityRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    securityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    securityText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
    },
    resultCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    resultIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    resultTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.foreground,
        marginBottom: 8,
    },
    resultDescription: {
        fontSize: 14,
        color: colors.muted,
        textAlign: 'center',
        marginBottom: 16,
    },
    resultAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: 8,
    },
    confirmationMsg: {
        fontSize: 13,
        color: '#6B7280',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 28,
    },
    backButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    errorText: {
        fontSize: 13,
        color: colors.danger,
    },
});
