import { SubscriptionFeatures } from '../types';

export const FOOD_CATEGORIES = [
  'Dairy',
  'Meat',
  'Produce',
  'Pantry',
  'Beverages',
  'Frozen',
  'Leftovers',
  'Other'
] as const;

export const SUBSCRIPTION_FEATURES: Record<'free' | 'premium', SubscriptionFeatures> = {
  free: {
    maxItems: 20,
    notificationDays: [0], // Only day of expiry
    barcodeScanning: false,
    recipeLimit: 3,
    householdMembers: 1,
    wasteTracking: false
  },
  premium: {
    maxItems: Infinity,
    notificationDays: [3, 1, 0], // 3 days, 1 day, and day of expiry
    barcodeScanning: true,
    recipeLimit: Infinity,
    householdMembers: 2,
    wasteTracking: true
  }
};

export const APP_CONFIG = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_ITEMS_PER_PAGE: 20,
  RECIPE_CACHE_HOURS: 24,
  NOTIFICATION_HOUR: 9, // 9 AM local time
  MAX_INVITE_CODE_ATTEMPTS: 3,
  PREMIUM_PRICE_USD: 5.99
} as const;

export const ERROR_MESSAGES = {
  ITEM_LIMIT_REACHED: 'You have reached your item limit. Upgrade to Premium for unlimited items.',
  INVALID_INVITE_CODE: 'Invalid invite code. Please try again.',
  HOUSEHOLD_FULL: 'This household has reached its member limit.',
  SUBSCRIPTION_REQUIRED: 'This feature requires a Premium subscription.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again later.'
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'fridgehero_auth_token',
  USER_SETTINGS: 'fridgehero_user_settings',
  RECIPE_CACHE: 'fridgehero_recipe_cache',
  ONBOARDING_COMPLETE: 'fridgehero_onboarding_complete'
} as const; 