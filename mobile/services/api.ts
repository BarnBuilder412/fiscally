import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants';
import { AuthTokens, User, Transaction, Insight, ChatMessage } from '@/types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
};

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private normalizeTransaction(transaction: any): Transaction {
    return {
      ...transaction,
      amount: typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount),
    };
  }

  private async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private async setTokens(tokens: AuthTokens): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  }

  private async clearTokens(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokens();
      }
      const errorData = await response.json().catch(() => ({}));

      // Handle validation errors (array of errors) or single error
      let errorMessage = 'Request failed';
      if (Array.isArray(errorData.detail)) {
        // Pydantic validation errors - extract field and message
        errorMessage = errorData.detail.map((err: any) => {
          const field = err.loc?.[1] || 'field';
          const msg = err.msg?.replace('string', 'value').replace('ensure this value has at least', 'must have at least');
          return `${field}: ${msg}`;
        }).join(', ');
      } else if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthTokens> {
    const tokens = await this.request<AuthTokens>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await this.setTokens(tokens);
    return tokens;
  }

  async signup(email: string, password: string, name?: string): Promise<AuthTokens> {
    const tokens = await this.request<AuthTokens>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await this.setTokens(tokens);
    return tokens;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      await this.clearTokens();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/v1/auth/me');
  }

  // Profile
  async getProfile(): Promise<User> {
    return this.request<User>('/api/v1/profile');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Transactions
  async getTransactions(params?: {
    limit?: number;
    offset?: number;
    category?: string;
    start_date?: string;
    end_date?: string;
    merchant?: string;
    source?: 'manual' | 'voice' | 'sms' | 'receipt';
    spend_class?: 'need' | 'want' | 'luxury';
    is_anomaly?: boolean;
  }): Promise<{ transactions: Transaction[]; total: number; hasMore: boolean }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.category) queryParams.set('category', params.category);
    if (params?.start_date) queryParams.set('start_date', params.start_date);
    if (params?.end_date) queryParams.set('end_date', params.end_date);
    if (params?.merchant) queryParams.set('merchant', params.merchant);
    if (params?.source) queryParams.set('source', params.source);
    if (params?.spend_class) queryParams.set('spend_class', params.spend_class);
    if (typeof params?.is_anomaly === 'boolean') queryParams.set('is_anomaly', String(params.is_anomaly));

    const query = queryParams.toString();
    const response = await this.request<{ transactions: any[]; total: number; has_more: boolean }>(
      `/api/v1/transactions${query ? `?${query}` : ''}`
    );

    // Convert string amount to number and extract array
    return {
      transactions: response.transactions.map(t => this.normalizeTransaction(t)),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  async getTransactionById(transactionId: string): Promise<Transaction> {
    const transaction = await this.request<any>(`/api/v1/transactions/${transactionId}`);
    return this.normalizeTransaction(transaction);
  }

  async createTransaction(data: {
    amount: number;
    currency?: string;
    merchant?: string;
    category?: string;
    note?: string;
    source?: 'manual' | 'voice' | 'sms' | 'receipt';
    spend_class?: 'need' | 'want' | 'luxury';
    transaction_at?: string;
    raw_sms?: string;
  }): Promise<Transaction> {
    const transaction = await this.request<any>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.normalizeTransaction(transaction);
  }

  async updateTransaction(
    transactionId: string,
    data: {
      amount?: number;
      currency?: string;
      merchant?: string;
      category?: string;
      note?: string;
      spend_class?: 'need' | 'want' | 'luxury';
      transaction_at?: string;
    }
  ): Promise<Transaction> {
    const transaction = await this.request<any>(`/api/v1/transactions/${transactionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return this.normalizeTransaction(transaction);
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    await this.request(`/api/v1/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  async submitCategoryCorrection(transactionId: string, newCategory: string): Promise<Transaction> {
    const transaction = await this.request<any>(`/api/v1/transactions/${transactionId}/category-correction`, {
      method: 'POST',
      body: JSON.stringify({ new_category: newCategory }),
    });
    return this.normalizeTransaction(transaction);
  }

  async ingestSmsTransactionsBatch(
    transactions: Array<{
      amount: number;
      currency?: string;
      merchant?: string;
      category?: string;
      transaction_at?: string;
      raw_sms?: string;
      sms_sender?: string;
      dedupe_key?: string;
    }>
  ): Promise<{
    received_count: number;
    created_count: number;
    duplicate_count: number;
    failed_count: number;
    created_transaction_ids: string[];
  }> {
    return this.request('/api/v1/transactions/sms/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
  }

  async parseVoiceTransaction(audioUri: string): Promise<{
    amount: number;
    merchant?: string;
    category: string;
    confidence: number;
    needs_clarification: boolean;
    clarification_question?: string;
    transcript?: string;
  }> {
    const formData = new FormData();

    // Append file
    // @ts-ignore - React Native FormData has specific shape
    formData.append('file', {
      uri: audioUri,
      name: 'voice_input.m4a',
      type: 'audio/m4a',
    });

    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/api/v1/transactions/voice`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokens();
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Voice parsing failed');
    }

    return response.json();
  }

  async parseReceiptTransaction(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<{
    amount: number;
    currency: string;
    merchant?: string;
    category: string;
    spend_class?: 'need' | 'want' | 'luxury';
    confidence: number;
    needs_review: boolean;
    duplicate_suspected?: boolean;
    reason?: string;
    transaction?: Transaction;
  }> {
    const formData = new FormData();
    // @ts-ignore - React Native FormData file type
    formData.append('file', file);

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/api/v1/transactions/receipt`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Receipt parsing failed');
    }

    const payload = await response.json();
    if (payload?.transaction) {
      payload.transaction = this.normalizeTransaction(payload.transaction);
    }
    return payload;
  }

  // Chat
  async sendChatMessage(message: string): Promise<{
    response: string;
    memory_updated?: boolean;
    new_fact?: string;
    trace_id?: string;
    reasoning_steps?: Array<{
      step_type: string;
      content: string;
      data?: Record<string, any>;
    }>;
  }> {
    return this.request('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async sendChatFeedback(traceId: string, rating: 1 | 2): Promise<{ success: boolean }> {
    return this.request('/api/v1/chat/feedback', {
      method: 'POST',
      body: JSON.stringify({
        trace_id: traceId,
        rating,
      }),
    });
  }

  // Insights
  async getInsights(): Promise<{
    headline?: string;
    summary?: string;
    tip?: string;
    period_days?: number;
    total_spent?: number;
    transaction_count?: number;
  }> {
    return this.request('/api/v1/insights');
  }

  // Goals
  async syncGoals(goals: Array<{
    id: string;
    label: string;
    target_amount?: string;
    target_date?: string;
    priority?: number;
  }>): Promise<{ synced_count: number; goals: any[] }> {
    return this.request('/api/v1/goals/sync', {
      method: 'POST',
      body: JSON.stringify({ goals }),
    });
  }

  async getBudgetAnalysis(): Promise<{
    has_goals: boolean;
    total_monthly_savings_needed?: number;
    goals?: any[];
    tip?: string;
  }> {
    return this.request('/api/v1/goals/budget-analysis');
  }

  async getGoalProgress(): Promise<{
    monthly_salary: number;
    monthly_budget: number;
    monthly_expenses: number;
    monthly_savings: number;
    budget_used_percentage: number;
    expected_savings: number;
    savings_vs_expected: number;
    transaction_count: number;
    expenses_by_category: Record<string, number>;
    goals: Array<{
      id: string;
      label: string;
      icon?: string;
      color?: string;
      priority: number;
      target_amount: number;
      target_date?: string;
      current_saved: number;
      amount_needed: number;
      monthly_contribution: number;
      progress_percentage: number;
      months_to_complete?: number;
      projected_completion_date?: string;
      on_track: boolean;
    }>;
    total_goal_target: number;
    total_current_saved: number;
    unallocated_savings: number;
    tip?: string;
  }> {
    return this.request('/api/v1/goals/progress');
  }

  async saveToGoal(goalId: string, amount: number): Promise<{
    message: string;
    goal_id: string;
  }> {
    return this.request(`/api/v1/goals/save-amount?goal_id=${goalId}&amount=${amount}`, {
      method: 'POST',
    });
  }

  async updateFinancialProfile(data: {
    salary_range_id?: string;
    monthly_salary?: number;
    budget_range_id?: string;
    monthly_budget?: number;
  }): Promise<User> {
    return this.request('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        profile: {
          financial: data,
        },
      }),
    });
  }

  // Helper to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
}

export const api = new ApiClient();
