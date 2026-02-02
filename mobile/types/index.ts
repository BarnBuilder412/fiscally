export interface User {
  id: string;
  email: string;
  name?: string;
  currency: string;
  income_range?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  merchant?: string;
  category: string;
  note?: string;
  source: 'manual' | 'voice' | 'sms';
  created_at: string;
  user_id: string;
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
