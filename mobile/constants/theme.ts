export const Colors = {
  // Primary palette – warm taupe inspired by Stitch designs
  primary: '#8B7E66',
  primaryLight: '#C4B69C',
  primaryDark: '#6B6052',
  
  // Secondary palette - Emerald
  secondary: '#5F9EA0',
  secondaryLight: '#7FB6B8',
  secondaryDark: '#4A7D7F',
  
  // Accent colors
  accent: '#C5A059',
  accentLight: '#E1C66A',
  
  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  
  // Grays for text, borders
  gray50: '#FAFAF8',
  gray100: '#F0ECE4',
  gray200: '#E8E2D6',
  gray300: '#D9D1C7',
  gray400: '#B8ACA2',
  gray500: '#8B7E73',
  gray600: '#6B5F55',
  gray700: '#4A403A',
  gray800: '#2D2723',
  gray900: '#1A1613',
  
  // Neutral backgrounds – cream / off-white tones
  background: '#F9F7F2',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F2ED',
  
  // Text colors
  textPrimary: '#4A4A4A',
  textSecondary: '#795548',
  textTertiary: '#8B7E73',
  textInverse: '#FFFFFF',
  
  // Category colors
  categoryFood: '#EF4444',
  categoryTransport: '#3B82F6',
  categoryShopping: '#8B5CF6',
  categoryBills: '#F59E0B',
  categoryEntertainment: '#EC4899',
  categoryHealth: '#10B981',
  categoryEducation: '#06B6D4',
  categoryOther: '#6B7280',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 32,
  hero: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
};
