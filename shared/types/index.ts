export interface User {
  id: string;
  email: string;
  subscription_status: 'free' | 'premium';
  created_at: string;
  updated_at: string;
}

export interface FridgeItem {
  id: string;
  user_id: string;
  household_id?: string;
  name: string;
  barcode?: string;
  expiry_date: string;
  category: string;
  quantity: number;
  status: 'active' | 'used' | 'expired' | 'trashed';
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  max_members: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  image_url?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  item_id: string;
  type: 'expiry_soon' | 'expired' | 'system';
  message: string;
  read: boolean;
  sent_at: string;
}

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionFeatures {
  maxItems: number;
  notificationDays: number[];
  barcodeScanning: boolean;
  recipeLimit: number;
  householdMembers: number;
  wasteTracking: boolean;
} 