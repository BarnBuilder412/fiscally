// SubZero API Service
import { API_BASE_URL, fetchAPI } from './api';

// Types
export interface Subscription {
    id: string;
    merchant_name: string;
    amount: number;
    billing_frequency: string;
}

export interface VendorPolicy {
    merchant_name: string;
    refund_window_days: number;
    pro_rated_refund: boolean;
    retention_offers: string[];
    refund_difficulty: 'easy' | 'medium' | 'hard';
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

// API Functions
export const subzeroAPI = {
    // Get all subscriptions
    async getSubscriptions(): Promise<Subscription[]> {
        return fetchAPI<Subscription[]>('/subzero/subscriptions');
    },

    // Get vendor policies
    async getVendorPolicies(): Promise<VendorPolicy[]> {
        return fetchAPI<VendorPolicy[]>('/subzero/vendor-policies');
    },

    // Start a new negotiation
    async startNegotiation(request: NegotiationRequest): Promise<NegotiationResponse> {
        return fetchAPI<NegotiationResponse>('/subzero/negotiations', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    },

    // Get negotiation status
    async getNegotiationStatus(negotiationId: string): Promise<NegotiationStatus> {
        return fetchAPI<NegotiationStatus>(`/subzero/negotiations/${negotiationId}`);
    },

    // Submit user decision
    async submitDecision(negotiationId: string, decision: 'accept' | 'reject'): Promise<NegotiationStatus> {
        return fetchAPI<NegotiationStatus>(`/subzero/negotiations/${negotiationId}/decision`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        });
    },

    // Stream negotiation updates (SSE)
    streamNegotiation(negotiationId: string, onMessage: (event: MessageEvent) => void) {
        const eventSource = new EventSource(`${API_BASE_URL}/subzero/negotiations/${negotiationId}/stream`);

        eventSource.onmessage = onMessage;

        eventSource.addEventListener('message', (e) => onMessage(e));
        eventSource.addEventListener('vendor_offer', (e) => onMessage(e));
        eventSource.addEventListener('outcome', (e) => onMessage(e));
        eventSource.addEventListener('complete', (e) => {
            onMessage(e);
            eventSource.close();
        });
        eventSource.addEventListener('error', (e) => {
            console.error('SSE Error:', e);
            eventSource.close();
        });

        return eventSource;
    },
};
