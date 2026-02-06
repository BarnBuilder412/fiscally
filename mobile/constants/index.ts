export * from './theme';
export * from './categories';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const INCOME_RANGES = [
  { id: 'below_30k', label: 'Less than ₹30,000', value: '<30k' },
  { id: '30k_75k', label: '₹30,000 - ₹75,000', value: '30k-75k' },
  { id: '75k_150k', label: '₹75,000 - ₹1,50,000', value: '75k-1.5L' },
  { id: 'above_150k', label: 'More than ₹1,50,000', value: '>1.5L' },
  { id: 'prefer_not', label: 'Prefer not to say', value: 'not_specified' },
];
  