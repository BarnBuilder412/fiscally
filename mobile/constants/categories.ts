import { Colors } from './theme';
import { Ionicons } from '@expo/vector-icons';

export type IoniconsName = keyof typeof Ionicons.glyphMap;

export interface Category {
  id: string;
  name: string;
  icon: IoniconsName;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'fast-food', color: Colors.categoryFood },
  { id: 'transport', name: 'Transport', icon: 'car', color: Colors.categoryTransport },
  { id: 'shopping', name: 'Shopping', icon: 'cart', color: Colors.categoryShopping },
  { id: 'bills', name: 'Bills', icon: 'receipt', color: Colors.categoryBills },
  { id: 'entertainment', name: 'Fun', icon: 'game-controller', color: Colors.categoryEntertainment },
  { id: 'health', name: 'Health', icon: 'medical', color: Colors.categoryHealth },
  { id: 'education', name: 'Education', icon: 'book', color: Colors.categoryEducation },
  { id: 'other', name: 'Other', icon: 'add-circle', color: Colors.categoryOther },
];

export const getCategoryById = (id: string): Category | undefined => {
  return CATEGORIES.find((cat: Category) => cat.id === id);
};

export const getCategoryColor = (id: string): string => {
  return getCategoryById(id)?.color || Colors.categoryOther;
};

export const getCategoryIcon = (id: string): IoniconsName => {
  return getCategoryById(id)?.icon || 'wallet';
};
