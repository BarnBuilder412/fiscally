export * from './theme';
export * from './categories';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const INCOME_RANGES = [
  { id: 'below_30k', label: 'Less than 30k', value: '<30k' },
  { id: '30k_75k', label: '30k - 75k', value: '30k-75k' },
  { id: '75k_150k', label: '75k - 150k', value: '75k-150k' },
  { id: 'above_150k', label: 'More than 150k', value: '>150k' },
  { id: 'prefer_not', label: 'Prefer not to say', value: 'not_specified' },
];
  
