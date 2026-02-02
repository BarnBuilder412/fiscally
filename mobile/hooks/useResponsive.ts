import { useWindowDimensions } from 'react-native';

// Breakpoints based on common device widths
const BREAKPOINTS = {
  small: 320,   // iPhone SE, small Android
  medium: 375,  // iPhone 12/13/14
  large: 414,   // iPhone Plus/Max
  tablet: 768,  // iPad mini
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const isSmall = width < BREAKPOINTS.medium;
  const isMedium = width >= BREAKPOINTS.medium && width < BREAKPOINTS.large;
  const isLarge = width >= BREAKPOINTS.large && width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet;
  
  // Scaling factor based on screen width (base: 375 - iPhone 12)
  const scale = width / 375;
  const fontScale = Math.min(Math.max(scale, 0.85), 1.2);
  
  // Responsive spacing
  const rs = (size: number) => Math.round(size * scale);
  
  // Responsive font size (with bounds)
  const rf = (size: number) => Math.round(size * fontScale);
  
  // Calculate number of columns for grid based on screen width
  const getGridColumns = (minItemWidth: number = 80) => {
    const padding = 32; // horizontal padding
    const gap = 8;
    const availableWidth = width - padding;
    return Math.floor((availableWidth + gap) / (minItemWidth + gap));
  };
  
  // Calculate item width for grid
  const getGridItemWidth = (columns: number, gap: number = 8, padding: number = 16) => {
    const totalGaps = (columns - 1) * gap;
    const totalPadding = padding * 2;
    return (width - totalPadding - totalGaps) / columns;
  };

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    scale,
    fontScale,
    rs,
    rf,
    getGridColumns,
    getGridItemWidth,
  };
}
