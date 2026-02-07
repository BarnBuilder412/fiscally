export interface User {
  id: string;
  email: string;
  name?: string;
  currency: string;
  income_range?: string;
  created_at: string;
  profile?: any;
}

export interface Transaction {
  id: string;
  amount: number;
  currency?: string;
  merchant?: string;
  category: string;
  note?: string;
  source: 'manual' | 'voice' | 'sms' | 'receipt';
  spend_class?: 'need' | 'want' | 'luxury';
  spend_class_confidence?: string;
  spend_class_reason?: string;
  opik_trace_id?: string;
  transaction_at?: string;
  created_at: string;
  user_id: string;
  is_anomaly?: boolean;
  anomaly_reason?: string;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'prediction' | 'alert' | 'milestone';
  message: string;
  confidence: number;
  actionable: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  trace_id?: string;
  reasoning_steps?: ReasoningStep[];
}

export interface ReasoningStep {
  step_type: 'analyzing' | 'context' | 'pattern' | 'querying' | 'data' | 'calculating' | 'memory' | 'insight';
  content: string;
  data?: Record<string, any>;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyStats {
  total_spent: number;
  budget: number;
  budget_percentage: number;
  categories: CategorySpending[];
  comparison_to_last_month: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
