// Centralized Premium Features Configuration
// This file ensures consistent premium messaging across all screens

export interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
  benefit: string;
  freeLimit?: string;
  premiumFeature: string;
}

export interface FreeLimitation {
  icon: string;
  limitation: string;
  pain: string;
  cost: string;
}

// === CORE PREMIUM FEATURES ===
export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: 'infinite',
    title: 'Unlimited Items',
    description: 'Track unlimited food items across all your households',
    benefit: 'Never hit storage limits again',
    freeLimit: 'Only 20 items',
    premiumFeature: 'Unlimited items'
  },
  {
    icon: 'home',
    title: 'Multiple Households', 
    description: 'Manage multiple households - home, office, vacation house',
    benefit: 'Perfect for families and multiple locations',
    freeLimit: 'Only 1 household',
    premiumFeature: 'Unlimited households'
  },
  {
    icon: 'scan',
    title: 'Barcode Scanner',
    description: 'Instantly add items by scanning barcodes with full nutrition data',
    benefit: 'Add items 10x faster with accurate details',
    freeLimit: 'Manual entry only',
    premiumFeature: 'Barcode scanning + nutrition data'
  },
  {
    icon: 'restaurant',
    title: 'Smart Recipe AI',
    description: 'Get unlimited AI-generated recipes using your exact ingredients',
    benefit: 'Never waste food or run out of meal ideas',
    freeLimit: 'No recipe suggestions',
    premiumFeature: 'Unlimited AI recipes'
  },
  {
    icon: 'list',
    title: 'Smart Shopping Lists',
    description: 'AI-powered shopping lists based on usage patterns and preferences',
    benefit: 'Buy only what you need, save money',
    freeLimit: 'Manual shopping lists',
    premiumFeature: 'AI-generated smart lists'
  },
  {
    icon: 'analytics',
    title: 'Waste Analytics',
    description: 'Track savings, waste patterns, and environmental impact over time',
    benefit: 'Optimize spending and reduce waste',
    freeLimit: 'No analytics',
    premiumFeature: 'Detailed waste tracking & insights'
  }
];

// === FREE TIER LIMITATIONS ===
export const FREE_LIMITATIONS: FreeLimitation[] = [
  {
    icon: 'ban',
    limitation: 'Maximum 20 items',
    pain: 'Hit limits within first week of use',
    cost: 'Miss out on $50+ monthly savings'
  },
  {
    icon: 'ban', 
    limitation: 'Only 1 household',
    pain: 'No family coordination possible',
    cost: 'Duplicate purchases waste $100+'
  },
  {
    icon: 'ban',
    limitation: 'No barcode scanning',
    pain: 'Slow manual entry every time',
    cost: 'Waste 3+ hours weekly on data entry'
  },
  {
    icon: 'ban',
    limitation: 'No recipe suggestions',
    pain: 'Ingredients expire before you use them',
    cost: 'Lose $75+ monthly on wasted food'
  },
  {
    icon: 'ban',
    limitation: 'No smart shopping lists',
    pain: 'Forget items, buy duplicates',
    cost: 'Overspend $125+ monthly'
  },
  {
    icon: 'ban',
    limitation: 'No analytics or insights',
    pain: 'Can\'t optimize spending patterns',
    cost: 'Miss money-saving opportunities'
  }
];

// === PRICING CONFIGURATION ===
export const PRICING = {
  monthly: {
    price: 5.99,
    displayPrice: '$5.99',
    period: 'month',
    stripePriceId: 'price_monthly_premium',
    planId: 'premium_monthly'
  },
  yearly: {
    price: 59.99,
    displayPrice: '$59.99', 
    period: 'year',
    stripePriceId: 'price_yearly_premium',
    planId: 'premium_yearly',
    monthlyEquivalent: 5.00,
    savings: '$11.89/year',
    savingsPercentage: '17%'
  }
};

// === PREMIUM MESSAGING ===
export const PREMIUM_MESSAGING = {
  tagline: 'Unlock the full power of FridgeHero',
  subtitle: 'Save money, reduce waste, eat better',
  
  socialProof: {
    userCount: '10,000+',
    avgSavings: '$89',
    wasteReduction: '40%',
    rating: '4.9',
    reviewCount: '2,500+'
  },
  
  guarantees: [
    '7-day free trial',
    '30-day money-back guarantee', 
    'Cancel anytime',
    'No hidden fees'
  ],
  
  ctaText: {
    primary: 'Start Your Free Trial',
    secondary: 'Upgrade to Premium',
    trial: 'Try Free for 7 Days'
  }
};

// === HELPER FUNCTIONS ===
export const isPremiumRequired = (feature: string): boolean => {
  const premiumFeatures = [
    'barcode_scanner',
    'recipes',
    'shopping_list', 
    'analytics',
    'multiple_households',
    'unlimited_items'
  ];
  return premiumFeatures.includes(feature);
};

export const getFreeLimitMessage = (itemCount: number): string => {
  const remaining = Math.max(0, 20 - itemCount);
  if (remaining === 0) return 'Item limit reached! Upgrade for unlimited items.';
  if (remaining <= 3) return `Only ${remaining} items left! Upgrade for unlimited items.`;
  return `${remaining} items remaining on free plan`;
};

export const getPremiumCtaForFeature = (feature: string): string => {
  const ctas: { [key: string]: string } = {
    barcode_scanner: 'Unlock Barcode Scanner',
    recipes: 'Unlock Smart Recipes', 
    shopping_list: 'Unlock Smart Shopping',
    analytics: 'Unlock Waste Analytics',
    multiple_households: 'Unlock Multiple Households',
    unlimited_items: 'Unlock Unlimited Items'
  };
  return ctas[feature] || 'Upgrade to Premium';
}; 