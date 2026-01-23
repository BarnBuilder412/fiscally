// SubZero API Service (Mobile Mock)

// Types
export interface Subscription {
    id: string;
    merchant_name: string;
    amount: number;
    billing_frequency: string;
}

export interface NegotiationMessage {
    role: 'agent' | 'vendor' | 'system' | 'user';
    content: string;
    timestamp: string;
}

export interface VendorOffer {
    offer_type: 'refund' | 'retention' | 'rejection';
    amount?: number;
    description: string;
    free_months?: number;
    discount_percent?: number;
    requires_user_decision: boolean;
}

export interface NegotiationOutcome {
    outcome_type: string;
    amount_saved: number;
    description: string;
    confirmation_message?: string;
}

export interface NegotiationStatus {
    id: string;
    merchant_name: string;
    amount: number;
    goal: string;
    status: string;
    current_phase: string;
    messages: NegotiationMessage[];
    vendor_offer?: VendorOffer;
    outcome?: NegotiationOutcome;
}

export interface NegotiationRequest {
    merchant_name: string;
    amount: number;
    goal: 'full_refund' | 'partial_refund' | 'better_deal' | 'cancel_only';
    user_note?: string;
}

export interface NegotiationResponse {
    negotiation_id: string;
    status: string;
    message: string;
}

// Mock Data
const MOCK_SUBSCRIPTIONS: Subscription[] = [
    { id: '1', merchant_name: 'Adobe Creative Cloud', amount: 54.99, billing_frequency: 'mo' },
    { id: '2', merchant_name: 'Netflix Premium', amount: 22.99, billing_frequency: 'mo' },
    { id: '3', merchant_name: 'Gym Membership', amount: 45.00, billing_frequency: 'mo' },
];

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Functions
export const subzeroAPI = {
    // Get all subscriptions
    async getSubscriptions(): Promise<Subscription[]> {
        await delay(800); // Simulate network delay
        return MOCK_SUBSCRIPTIONS;
    },

    // Start a new negotiation
    async startNegotiation(request: NegotiationRequest): Promise<NegotiationResponse> {
        await delay(1000);
        return {
            negotiation_id: `neg_${Date.now()}`,
            status: 'active',
            message: 'Negotiation started',
        };
    },

    // Get negotiation status (Simulates the flow)
    async getNegotiationStatus(negotiationId: string): Promise<NegotiationStatus> {
        // In a real app, this would fetch the current state.
        // For the mock, we'll return a static "initial" state that the UI will append to.
        // The UI component will handle the "simulation" of incoming messages for the demo.
        return {
            id: negotiationId,
            merchant_name: 'Adobe Creative Cloud',
            amount: 54.99,
            goal: 'full_refund',
            status: 'active',
            current_phase: 'negotiating',
            messages: [
                {
                    role: 'system',
                    content: 'Connecting to Adobe Support via Secure Channel...',
                    timestamp: new Date().toISOString(),
                },
                {
                    role: 'agent',
                    content: 'Analyzing vendor policy... Refund probability: 78%.',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
    },

    // Submit user decision
    async submitDecision(negotiationId: string, decision: 'accept' | 'reject'): Promise<NegotiationStatus> {
        await delay(1500);

        if (decision === 'accept') {
            return {
                id: negotiationId,
                merchant_name: 'Adobe Creative Cloud',
                amount: 54.99,
                goal: 'full_refund',
                status: 'completed',
                current_phase: 'completed',
                messages: [],
                outcome: {
                    outcome_type: 'retention_accepted',
                    amount_saved: 109.98, // 2 months * 54.99
                    description: 'You accepted 2 free months.',
                    confirmation_message: 'Your next billing date has been pushed to March 2026.',
                }
            };
        } else {
            return {
                id: negotiationId,
                merchant_name: 'Adobe Creative Cloud',
                amount: 54.99,
                goal: 'full_refund',
                status: 'completed',
                current_phase: 'completed',
                messages: [],
                outcome: {
                    outcome_type: 'refund_approved',
                    amount_saved: 54.99,
                    description: 'Full refund processed successfully.',
                    confirmation_message: 'Funds will appear in your account in 3-5 business days.',
                }
            };
        }
    },
};
