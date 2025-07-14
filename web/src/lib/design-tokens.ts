// FridgeHero Design System - Design Tokens for Web
// Mirrors the mobile design system for consistency

export const designTokens = {
  // Color System
  colors: {
    // Primary Colors
    heroGreen: '#22C55E',
    alertAmber: '#F59E0B', 
    expiredRed: '#EF4444',
    pureWhite: '#FFFFFF',
    deepCharcoal: '#1F2937',
    
    // Secondary Palette
    sage: '#84CC16',
    ocean: '#0EA5E9',
    sunset: '#FB923C',
    lavender: '#8B5CF6',
    
    // Semantic Colors
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
    
    // Contextual Colors
    fresh: '#22C55E',
    expiring: '#F59E0B',
    expired: '#EF4444',
  },
  
  // Spacing System (matches Tailwind)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Animation Durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
} as const;

// Helper functions for accessing design tokens
export const getExpiryColor = (daysUntilExpiry: number): string => {
  if (daysUntilExpiry < 0) return designTokens.colors.expiredRed;
  if (daysUntilExpiry <= 1) return designTokens.colors.alertAmber;
  if (daysUntilExpiry <= 3) return '#FBBF24'; // amber-400
  return designTokens.colors.heroGreen;
};

export const getExpiryStatus = (daysUntilExpiry: number): 'fresh' | 'expiring' | 'expired' => {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 1) return 'expiring';
  return 'fresh';
};

export const getExpiryText = (days: number): string => {
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
};

export const getTimeOfDayContext = (): 'morning' | 'evening' | 'default' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'default';
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Tailwind class helpers for dynamic styling
export const getExpiryClasses = (daysUntilExpiry: number) => {
  const status = getExpiryStatus(daysUntilExpiry);
  
  return {
    textColor: status === 'expired' ? 'text-error-600' : 
               status === 'expiring' ? 'text-warning-600' : 'text-primary-600',
    bgColor: status === 'expired' ? 'bg-error-50' : 
             status === 'expiring' ? 'bg-warning-50' : 'bg-primary-50',
    borderColor: status === 'expired' ? 'border-error-200' : 
                 status === 'expiring' ? 'border-warning-200' : 'border-primary-200',
    cardClass: status === 'expired' ? 'card-expired' : 
               status === 'expiring' ? 'card-warning' : 'card-fresh',
  };
};

export const getHeroWidgetContext = (urgentItems: number = 0) => {
  const timeContext = getTimeOfDayContext();
  
  if (urgentItems > 0) {
    return {
      title: '⚡ Action Needed',
      subtitle: `${urgentItems} item${urgentItems !== 1 ? 's' : ''} expiring soon`,
      action: 'Cook Now',
      bgClass: 'bg-warning-gradient',
      type: 'urgent' as const,
    };
  }

  switch (timeContext) {
    case 'morning':
      return {
        title: '🌅 Good Morning!',
        subtitle: 'Ready to add today\'s groceries?',
        action: 'Quick Add',
        bgClass: 'hero-morning',
        type: 'morning' as const,
      };
    case 'evening':
      return {
        title: '🍽️ Dinner Time',
        subtitle: 'Find recipes with your ingredients',
        action: 'Cook Now',
        bgClass: 'hero-evening',
        type: 'evening' as const,
      };
    default:
      return {
        title: '🏠 Your Kitchen',
        subtitle: 'Everything looks fresh and organized',
        action: 'View Fridge',
        bgClass: 'bg-card-fresh',
        type: 'default' as const,
      };
  }
}; 