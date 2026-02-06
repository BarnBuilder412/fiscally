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

export const getCategoryIcon = (id: string): IoniconsName => {
  // Check direct match first
  const match = getCategoryById(id);
  if (match) return match.icon;

  // Check subcategory mapping
  const parentId = SUB_CATEGORY_MAPPING[id] || 'other';
  return getCategoryById(parentId)?.icon || 'wallet';
};

// Agentic Subcategory Mapping - Maps specific AI tags to broad categories
export const SUB_CATEGORY_MAPPING: Record<string, string> = {
  // Food
  'food_delivery': 'food',
  'restaurant': 'food',
  'grocery': 'food',
  'coffee': 'food',
  'drinks': 'food',

  // Transport
  'uber': 'transport',
  'taxi': 'transport',
  'fuel': 'transport',
  'bus': 'transport',
  'train': 'transport',
  'flight': 'transport',

  // Shopping
  'clothing': 'shopping',
  'electronics': 'shopping',
  'amazon': 'shopping',
  'online_shopping': 'shopping',

  // Bills
  'rent': 'bills',
  'electricity': 'bills',
  'internet': 'bills',
  'phone': 'bills',
  'subscription': 'bills',

  // Entertainment
  'movies': 'entertainment',
  'games': 'entertainment',
  'streaming': 'entertainment',
  'concert': 'entertainment',

  // Health
  'doctor': 'health',
  'pharmacy': 'health',
  'gym': 'health',

  // Education
  'books': 'education',
  'course': 'education',
  'tuition': 'education',
};

export const getParentCategory = (subCategoryId: string): string => {
  return SUB_CATEGORY_MAPPING[subCategoryId] || subCategoryId;
};

export const getCategoryColor = (id: string): string => {
  // Check direct match first
  const match = getCategoryById(id);
  if (match) return match.color;

  // Check subcategory mapping
  const parentId = SUB_CATEGORY_MAPPING[id] || 'other';
  return getCategoryById(parentId)?.color || Colors.categoryOther;
};
