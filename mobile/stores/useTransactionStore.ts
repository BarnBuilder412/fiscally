import { create } from 'zustand';
import { Transaction, CategorySpending, MonthlyStats } from '@/types';
import { api } from '@/services/api';

interface TransactionState {
  transactions: Transaction[];
  monthlyStats: MonthlyStats | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  currentOffset: number;
  currentCategory: string | null;

  fetchTransactions: (params?: {
    limit?: number;
    category?: string;
    reset?: boolean;
  }) => Promise<void>;
  fetchMoreTransactions: () => Promise<void>;
  addTransaction: (data: {
    amount: number;
    merchant?: string;
    category: string;
    note?: string;
    source?: 'manual' | 'voice' | 'sms' | 'receipt';
    spend_class?: 'need' | 'want' | 'luxury';
  }) => Promise<Transaction>;
  updateTransaction: (
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
  ) => Promise<Transaction>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  parseVoice: (audioBase64: string) => Promise<{
    amount: number;
    merchant?: string;
    category: string;
    confidence: number;
    needs_clarification: boolean;
    clarification_question?: string;
  }>;
  clearError: () => void;
  resetTransactions: () => void;
}

const PAGE_SIZE = 20;

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  monthlyStats: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  total: 0,
  hasMore: false,
  currentOffset: 0,
  currentCategory: null,

  fetchTransactions: async (params) => {
    const { reset = true, limit = PAGE_SIZE, category } = params || {};

    if (reset) {
      set({ isLoading: true, error: null, currentOffset: 0, currentCategory: category || null });
    }

    try {
      const response = await api.getTransactions({
        limit,
        offset: 0,
        category: category || undefined
      });

      set({
        transactions: response.transactions,
        total: response.total,
        hasMore: response.hasMore,
        currentOffset: response.transactions.length,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        isLoading: false
      });
    }
  },

  fetchMoreTransactions: async () => {
    const { hasMore, isLoadingMore, currentOffset, currentCategory } = get();

    if (!hasMore || isLoadingMore) return;

    set({ isLoadingMore: true, error: null });

    try {
      const response = await api.getTransactions({
        limit: PAGE_SIZE,
        offset: currentOffset,
        category: currentCategory || undefined
      });

      set((state) => ({
        transactions: [...state.transactions, ...response.transactions],
        total: response.total,
        hasMore: response.hasMore,
        currentOffset: state.currentOffset + response.transactions.length,
        isLoadingMore: false
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load more transactions',
        isLoadingMore: false
      });
    }
  },

  addTransaction: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await api.createTransaction(data);
      set((state) => ({
        transactions: [transaction, ...state.transactions],
        total: state.total + 1,
        isLoading: false
      }));
      return transaction;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add transaction',
        isLoading: false
      });
      throw error;
    }
  },

  updateTransaction: async (transactionId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.updateTransaction(transactionId, data);
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === transactionId ? { ...t, ...updated } : t)),
        isLoading: false,
      }));
      return updated;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update transaction',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteTransaction: async (transactionId) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteTransaction(transactionId);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== transactionId),
        total: Math.max(0, state.total - 1),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete transaction',
        isLoading: false,
      });
      throw error;
    }
  },

  parseVoice: async (audioBase64) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.parseVoiceTransaction(audioBase64);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to parse voice',
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  resetTransactions: () => set({
    transactions: [],
    total: 0,
    hasMore: false,
    currentOffset: 0,
    currentCategory: null
  }),
}));
