// FridgeHero Design System - Mobile Design Tokens

// Light Theme
export const lightTheme = {
  // Background Colors
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',

  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Border Colors
  borderPrimary: 'rgba(148, 163, 184, 0.2)',
  borderSecondary: 'rgba(148, 163, 184, 0.1)',

  // Card backgrounds
  cardBackground: '#FFFFFF',
  cardSecondary: '#F8FAFC',

  // Shadow
  shadowPrimary: '0 4px 12px rgba(0, 0, 0, 0.05)',
  shadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.04)',
};

// Dark Theme
export const darkTheme = {
  // Background Colors
  bgPrimary: '#0F172A',
  bgSecondary: '#1E293B',
  bgTertiary: '#334155',

  // Text Colors
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',

  // Border Colors
  borderPrimary: 'rgba(148, 163, 184, 0.2)',
  borderSecondary: 'rgba(148, 163, 184, 0.1)',

  // Card backgrounds
  cardBackground: '#1E293B',
  cardSecondary: '#334155',

  // Shadow
  shadowPrimary: '0 4px 12px rgba(0, 0, 0, 0.3)',
  shadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.2)',
};

// Theme-aware helper function
export const getThemeColors = (isDark: boolean) => {
  return isDark ? darkTheme : lightTheme;
};

export const designTokens = {
  colors: {
    // Primary Palette - Hero Green
    heroGreen: '#22C55E',
    
    // Supporting Colors
    alertAmber: '#F59E0B',
    expiredRed: '#EF4444',
    pureWhite: '#FFFFFF',
    deepCharcoal: '#1F2937',
    
    // Extended Color Palettes
    primary: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    
    // Color aliases for backward compatibility
    green: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    
    // Amber alias for warning colors
    amber: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    
    // Red alias for error colors
    red: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    
    // Semantic Colors
    fresh: '#22C55E',
    expiring: '#F59E0B',
    expired: '#EF4444',
    
    // Additional Theme Colors
    ocean: '#3B82F6',
    sunset: '#FB923C',
    lavender: '#A855F7',
    
    // Special Gradients (represented as start colors for mobile)
    heroMorning: '#22C55E',
    heroEvening: '#3B82F6',
    
    // Background Colors
    cardFresh: '#F0FDF4',
    cardWarning: '#FFFBEB',
    cardExpired: '#FEF2F2',
  },
  
  // Gradient definitions
  gradients: {
    amber: ['#FDE68A', '#F59E0B'],
    heroMorning: ['#22C55E', '#16A34A'],
    heroEvening: ['#3B82F6', '#1D4ED8'],
    cardFresh: ['#F0FDF4', '#DCFCE7'],
  },
  
  typography: {
    // Font Families
    primary: 'Inter',
    display: 'Poppins',
    mono: 'JetBrains Mono',
    
    // Font Sizes
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 40,
    },
    
    // Line Heights
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
    
    // Font Weights
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    // Text Styles for backward compatibility
    textStyles: {
      h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        lineHeight: 40,
      },
      h2: {
        fontSize: 24,
        fontWeight: '600' as const,
        lineHeight: 32,
      },
      h3: {
        fontSize: 20,
        fontWeight: '500' as const,
        lineHeight: 28,
      },
      body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
      },
      bodyMedium: {
        fontSize: 16,
        fontWeight: '500' as const,
        lineHeight: 24,
      },
      small: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
      },
      caption: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
      },
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  // Utility Functions
  getExpiryColor: (daysUntilExpiry: number): string => {
    if (daysUntilExpiry < 0) return designTokens.colors.expired;
    if (daysUntilExpiry <= 1) return designTokens.colors.alertAmber;
    if (daysUntilExpiry <= 3) return designTokens.colors.sunset;
    return designTokens.colors.heroGreen;
  },
  
  getExpiryBackgroundColor: (daysUntilExpiry: number): string => {
    if (daysUntilExpiry < 0) return designTokens.colors.cardExpired;
    if (daysUntilExpiry <= 3) return designTokens.colors.cardWarning;
    return designTokens.colors.cardFresh;
  },
  
  getDaysUntilExpiry: (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  },
  
  getTimeOfDay: (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  },
  
  // Animation Durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

// Export utility functions for backward compatibility
export const getExpiryColor = designTokens.getExpiryColor;

export const getExpiryGradient = (daysUntilExpiry: number): string[] => {
  if (daysUntilExpiry < 0) return [designTokens.colors.red[100], designTokens.colors.red[200]];
  if (daysUntilExpiry <= 3) return [designTokens.colors.amber[100], designTokens.colors.amber[200]];
  return [designTokens.colors.green[100], designTokens.colors.green[200]];
};

export const getContextualShadow = (context: 'card' | 'button' | 'modal' = 'card') => {
  switch (context) {
    case 'button':
      return designTokens.shadows.sm;
    case 'modal':
      return designTokens.shadows.xl;
    default:
      return designTokens.shadows.md;
  }
}; 