export const Colors = {
  // Primary palette – Deep navy indigo (professional & trustworthy)
  primary: '#424874',
  primaryLight: '#5A6499',
  primaryDark: '#2E3352',

  // Secondary palette - Muted blue-purple
  secondary: '#A6B1E1',
  secondaryLight: '#C2CAF0',
  secondaryDark: '#8A96D0',

  // Accent colors - Soft lavender
  accent: '#DCD6F7',
  accentLight: '#F4EEFF',

  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Grays for text, borders - cool-toned to match indigo
  gray50: '#FAFAFD',
  gray100: '#F5F5FA',
  gray200: '#E8E8F2',
  gray300: '#D4D4E2',
  gray400: '#A8A8BE',
  gray500: '#7A7A96',
  gray600: '#5C5C74',
  gray700: '#424256',
  gray800: '#2C2C3C',
  gray900: '#1A1A24',

  // Neutral backgrounds – very light lavender from palette
  background: '#f9f8f3ff',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDE8F8',

  // Text colors
  textPrimary: '#1A1A24',
  textSecondary: '#5C5C74',
  textTertiary: '#7A7A96',
  textInverse: '#FFFFFF',

  // Category colors - vibrant & distinct
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
