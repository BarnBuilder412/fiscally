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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Request failed');
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
  }): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.category) queryParams.set('category', params.category);

    const query = queryParams.toString();
    const response = await this.request<{ transactions: any[] }>(`/api/v1/transactions${query ? `?${query}` : ''}`);

    // Convert string amount to number and extract array
    return response.transactions.map(t => ({
      ...t,
      amount: parseFloat(t.amount),
    }));
  }

  async createTransaction(data: {
    amount: number;
    merchant?: string;
    category: string;
    note?: string;
    source?: 'manual' | 'voice' | 'sms';
  }): Promise<Transaction> {
    return this.request<Transaction>('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async parseVoiceTransaction(audioUri: string): Promise<{
    amount: number;
    merchant?: string;
    category: string;
    confidence: number;
    needs_clarification: boolean;
    clarification_question?: string;
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

  // Chat
  async sendChatMessage(message: string): Promise<{
    response: string;
    insights?: Insight[];
  }> {
    return this.request('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
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
    return this.request('/api/v1/chat/insights', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Helper to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }
}

export const api = new ApiClient();
