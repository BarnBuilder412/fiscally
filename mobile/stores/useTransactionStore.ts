import { create } from 'zustand';
import { Transaction, CategorySpending, MonthlyStats } from '@/types';
import { api } from '@/services/api';

interface TransactionState {
  transactions: Transaction[];
  monthlyStats: MonthlyStats | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTransactions: (params?: { limit?: number; offset?: number; category?: string }) => Promise<void>;
  addTransaction: (data: {
    amount: number;
    merchant?: string;
    category: string;
    note?: string;
    source?: 'manual' | 'voice' | 'sms';
  }) => Promise<Transaction>;
  parseVoice: (audioBase64: string) => Promise<{
    amount: number;
    merchant?: string;
    category: string;
    confidence: number;
    needs_clarification: boolean;
    clarification_question?: string;
  }>;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  monthlyStats: null,
  isLoading: false,
  error: null,

  fetchTransactions: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await api.getTransactions(params);
      set({ transactions, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions', 
        isLoading: false 
      });
    }
  },

  addTransaction: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await api.createTransaction(data);
      set((state) => ({ 
        transactions: [transaction, ...state.transactions],
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
}));
