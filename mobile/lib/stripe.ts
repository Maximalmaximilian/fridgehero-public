import { Alert } from 'react-native';
import { supabase } from './supabase';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Free trial configuration
const FREE_TRIAL_DAYS = 7;
const FREE_TIER_ITEM_LIMIT = 20;
const FREE_TIER_HOUSEHOLD_MEMBER_LIMIT = 2;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  popular?: boolean;
  trialDays?: number;
}

interface SubscriptionStatus {
  isActive: boolean;
  planId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  status: 'free' | 'active' | 'canceled' | 'incomplete' | 'trialing' | 'past_due' | null;
  trialEnd: string | null;
  isTrialing: boolean;
  daysLeftInTrial: number;
}

interface TrialStatus {
  isTrialing: boolean;
  isEligibleForTrial: boolean;
  trialStarted: string | null;
  trialEnd: string | null;
  daysRemaining: number;
  hasUsedTrial: boolean;
}

// Available subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 5.99,
    currency: 'USD',
    interval: 'month',
    stripePriceId: 'price_premium_monthly', // Replace with actual Stripe price ID
    trialDays: FREE_TRIAL_DAYS,
    features: [
      'Unlimited items',
      'Smart notifications (3 days, 1 day before)',
      'Advanced barcode scanning',
      'Unlimited recipe suggestions',
      'Household sharing (up to 5 members)',
      'Waste tracking & monthly reports',
      'Priority support',
      'Recipe export & meal planning'
    ]
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: 59.99,
    currency: 'USD',
    interval: 'year',
    stripePriceId: 'price_premium_yearly', // Replace with actual Stripe price ID
    popular: true,
    trialDays: FREE_TRIAL_DAYS,
    features: [
      'All Premium Monthly features',
      '2 months free (20% savings)',
      'Advanced analytics dashboard',
      'Custom categories & tags',
      'Recipe recommendations AI',
      'Shopping list integration',
      'Early access to new features'
    ]
  }
];

class StripeService {
  private isInitialized = false;

  async initialize() {
    try {
      console.log('💳 Stripe: Initializing service...');
      
      if (!STRIPE_PUBLISHABLE_KEY) {
        console.warn('💳 Stripe: No publishable key found');
        return false;
      }

      // Note: For Expo Go, we'll simulate Stripe functionality
      // In production, you'd use @stripe/stripe-react-native
      this.isInitialized = true;
      console.log('💳 Stripe: Service initialized');
      return true;
    } catch (error) {
      console.error('💳 Stripe: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Get current subscription status for user including trial information
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { 
          isActive: false, 
          planId: null, 
          currentPeriodEnd: null, 
          cancelAtPeriodEnd: false, 
          status: 'free',
          trialEnd: null,
          isTrialing: false,
          daysLeftInTrial: 0
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          subscription_status, 
          subscription_plan_id, 
          subscription_period_end, 
          subscription_cancel_at_period_end,
          trial_started_at,
          trial_end_at,
          has_used_trial
        `)
        .eq('id', user.id)
        .single();

      if (!profile) {
        return { 
          isActive: false, 
          planId: null, 
          currentPeriodEnd: null, 
          cancelAtPeriodEnd: false, 
          status: 'free',
          trialEnd: null,
          isTrialing: false,
          daysLeftInTrial: 0
        };
      }

      const now = new Date();
      const trialEnd = profile.trial_end_at ? new Date(profile.trial_end_at) : null;
      const isTrialing = profile.subscription_status === 'trialing' && trialEnd && trialEnd > now;
      const daysLeftInTrial = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      return {
        isActive: profile.subscription_status === 'active' || isTrialing,
        planId: profile.subscription_plan_id,
        currentPeriodEnd: profile.subscription_period_end,
        cancelAtPeriodEnd: Boolean(profile.subscription_cancel_at_period_end ?? false),
        status: profile.subscription_status || 'free',
        trialEnd: profile.trial_end_at,
        isTrialing,
        daysLeftInTrial,
      };
    } catch (error) {
      console.error('💳 Stripe: Failed to get subscription status:', error);
      return { 
        isActive: false, 
        planId: null, 
        currentPeriodEnd: null, 
        cancelAtPeriodEnd: false, 
        status: 'free',
        trialEnd: null,
        isTrialing: false,
        daysLeftInTrial: 0
      };
    }
  }

  /**
   * Get detailed trial status for user
   */
  async getTrialStatus(): Promise<TrialStatus> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          isTrialing: false,
          isEligibleForTrial: true,
          trialStarted: null,
          trialEnd: null,
          daysRemaining: FREE_TRIAL_DAYS,
          hasUsedTrial: false
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          subscription_status,
          trial_started_at,
          trial_end_at,
          has_used_trial
        `)
        .eq('id', user.id)
        .single();

      if (!profile) {
        return {
          isTrialing: false,
          isEligibleForTrial: true,
          trialStarted: null,
          trialEnd: null,
          daysRemaining: FREE_TRIAL_DAYS,
          hasUsedTrial: false
        };
      }

      const now = new Date();
      const trialEnd = profile.trial_end_at ? new Date(profile.trial_end_at) : null;
      const isTrialing = profile.subscription_status === 'trialing' && trialEnd && trialEnd > now;
      const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : FREE_TRIAL_DAYS;

      return {
        isTrialing,
        isEligibleForTrial: !Boolean(profile.has_used_trial ?? false),
        trialStarted: profile.trial_started_at,
        trialEnd: profile.trial_end_at,
        daysRemaining,
        hasUsedTrial: Boolean(profile.has_used_trial ?? false)
      };
    } catch (error) {
      console.error('💳 Stripe: Failed to get trial status:', error);
      return {
        isTrialing: false,
        isEligibleForTrial: true,
        trialStarted: null,
        trialEnd: null,
        daysRemaining: FREE_TRIAL_DAYS,
        hasUsedTrial: false
      };
    }
  }

  /**
   * Start free trial for user
   */
  async startFreeTrial(planId: string = 'premium_monthly'): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to start your free trial');
        return false;
      }

      const trialStatus = await this.getTrialStatus();
      if (!trialStatus.isEligibleForTrial) {
        Alert.alert('Trial Already Used', 'You have already used your free trial. Would you like to subscribe now?');
        return false;
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        Alert.alert('Error', 'Invalid subscription plan');
        return false;
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + (FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000));

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'trialing',
          subscription_plan_id: planId,
          trial_started_at: now.toISOString(),
          trial_end_at: trialEnd.toISOString(),
          has_used_trial: true,
          updated_at: now.toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('💳 Stripe: Failed to start trial:', error);
        Alert.alert('Error', 'Failed to start free trial. Please try again.');
        return false;
      }

      console.log('💳 Stripe: Free trial started successfully');
      Alert.alert(
        '🎉 Welcome to Your 7-Day Free Trial!',
        `You now have unlimited access to all premium features until ${trialEnd.toLocaleDateString()}.\n\nEnjoy unlimited items, smart notifications, and much more!`
      );
      return true;
    } catch (error) {
      console.error('💳 Stripe: Error starting trial:', error);
      Alert.alert('Error', 'Failed to start free trial');
      return false;
    }
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToSubscription(planId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        Alert.alert('Error', 'Invalid subscription plan');
        return false;
      }

      // In Expo Go, show simulation alert
      return new Promise((resolve) => {
        Alert.alert(
          'Upgrade to Premium',
          `Continue with ${plan.name} for $${plan.price}/${plan.interval}?\n\nYour trial will convert to a paid subscription.`,
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => resolve(false)
            },
            { 
              text: 'Subscribe Now', 
              onPress: async () => {
                await this.simulateSuccessfulSubscription(planId, true);
                resolve(true);
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('💳 Stripe: Failed to convert trial:', error);
      return false;
    }
  }

  /**
   * Check if trial has expired and handle expiration
   */
  async checkTrialExpiration(): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();
      
      if (status.status === 'trialing' && status.daysLeftInTrial <= 0) {
        // Trial has expired
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Update status to free (trial expired)
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // Show expiration alert
        Alert.alert(
          'Trial Expired',
          'Your 7-day free trial has ended. Subscribe now to continue enjoying premium features!',
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Subscribe Now', onPress: () => this.showUpgradePrompt('continue premium access') }
          ]
        );

        return true; // Trial expired
      }

      return false; // Trial still active or not trialing
    } catch (error) {
      console.error('💳 Stripe: Error checking trial expiration:', error);
      return false;
    }
  }

  /**
   * Check if user has access to premium features (including trial)
   */
  async hasPremiumAccess(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return status.isActive; // This includes both active subscriptions and active trials
  }

  /**
   * Start subscription process with optional trial conversion
   */
  async startSubscription(planId: string, isTrialConversion: boolean = false): Promise<boolean> {
    try {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        Alert.alert('Error', 'Invalid subscription plan');
        return false;
      }

      // Check if user is eligible for trial first
      const trialStatus = await this.getTrialStatus();
      
      if (!isTrialConversion && trialStatus.isEligibleForTrial && plan.trialDays) {
        // Offer trial first
        return new Promise((resolve) => {
          Alert.alert(
            '🎉 Start Your Free Trial!',
            `Try ${plan.name} FREE for ${plan.trialDays} days!\n\nNo payment required. Cancel anytime.`,
            [
              { 
                text: 'Maybe Later', 
                style: 'cancel',
                onPress: () => resolve(false)
              },
              { 
                text: 'Start Free Trial', 
                onPress: async () => {
                  const started = await this.startFreeTrial(planId);
                  resolve(started);
                }
              },
              { 
                text: 'Subscribe Now', 
                onPress: async () => {
                  const subscribed = await this.processDirectSubscription(planId);
                  resolve(subscribed);
                }
              }
            ]
          );
        });
      } else {
        // Direct subscription (no trial available)
        return await this.processDirectSubscription(planId);
      }
    } catch (error) {
      console.error('💳 Stripe: Failed to start subscription:', error);
      Alert.alert('Error', 'Failed to process subscription');
      return false;
    }
  }

  /**
   * Process direct subscription without trial
   */
  private async processDirectSubscription(planId: string): Promise<boolean> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) return false;

    return new Promise((resolve) => {
      Alert.alert(
        'Start Subscription',
        `Subscribe to ${plan.name} for $${plan.price}/${plan.interval}?`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => resolve(false)
          },
          { 
            text: 'Subscribe', 
            onPress: async () => {
              await this.simulateSuccessfulSubscription(planId, false);
              resolve(true);
            }
          }
        ]
      );
    });
  }

  /**
   * Simulate successful subscription (enhanced for trial conversion)
   */
  private async simulateSuccessfulSubscription(planId: string, isTrialConversion: boolean = false) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) return;

      // Calculate period end
      const periodEnd = new Date();
      if (plan.interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Update user's subscription in database
      const updateData: any = {
        subscription_status: 'active',
        subscription_plan_id: planId,
        subscription_period_end: periodEnd.toISOString(),
        subscription_cancel_at_period_end: false,
        subscription_stripe_customer_id: `cus_simulated_${user.id}`,
        updated_at: new Date().toISOString()
      };

      // If converting from trial, clear trial data but keep has_used_trial as true
      if (isTrialConversion) {
        updateData.trial_started_at = null;
        updateData.trial_end_at = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('💳 Stripe: Failed to update subscription status:', error);
      } else {
        console.log('💳 Stripe: Subscription activated successfully');
        const message = isTrialConversion 
          ? 'Your trial has been converted to a paid subscription!'
          : 'Your subscription is now active!';
        
        Alert.alert(
          'Welcome to Premium! 🎉',
          `${message} Enjoy unlimited items, smart notifications, and all premium features!`
        );
      }
    } catch (error) {
      console.error('💳 Stripe: Error simulating subscription:', error);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      return new Promise((resolve) => {
        Alert.alert(
          'Cancel Subscription',
          'Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.',
          [
            { 
              text: 'Keep Subscription', 
              style: 'cancel',
              onPress: () => resolve(false)
            },
            { 
              text: 'Cancel', 
              style: 'destructive',
              onPress: async () => {
                await this.processCancellation(user.id);
                resolve(true);
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('💳 Stripe: Failed to cancel subscription:', error);
      Alert.alert('Error', 'Failed to cancel subscription');
      return false;
    }
  }

  private async processCancellation(userId: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('💳 Stripe: Failed to update cancellation status:', error);
      } else {
        console.log('💳 Stripe: Subscription marked for cancellation');
        Alert.alert(
          'Subscription Cancelled',
          'Your subscription will not renew at the end of the current period. You can reactivate anytime before then.'
        );
      }
    } catch (error) {
      console.error('💳 Stripe: Error processing cancellation:', error);
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('💳 Stripe: Failed to reactivate subscription:', error);
        Alert.alert('Error', 'Failed to reactivate subscription');
        return false;
      } else {
        console.log('💳 Stripe: Subscription reactivated');
        Alert.alert(
          'Subscription Reactivated! 🎉',
          'Your subscription will continue as normal and won\'t be cancelled.'
        );
        return true;
      }
    } catch (error) {
      console.error('💳 Stripe: Error reactivating subscription:', error);
      Alert.alert('Error', 'Failed to reactivate subscription');
      return false;
    }
  }

  /**
   * Check if user/household has reached free tier limits
   * Uses household owner's subscription status to determine household premium access
   */
  async checkFreeTierLimits(householdId?: string): Promise<{ 
    itemCount: number; 
    itemLimit: number; 
    hasReachedLimit: boolean;
    canAddMore: boolean;
    isHouseholdPremium: boolean;
    householdOwnerHasPremium: boolean;
    memberCount?: number;
    memberLimit?: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { 
          itemCount: 0, 
          itemLimit: FREE_TIER_ITEM_LIMIT, 
          hasReachedLimit: false, 
          canAddMore: true,
          isHouseholdPremium: false,
          householdOwnerHasPremium: false
        };
      }

      let targetHouseholdId = householdId;
      
      // If no household ID provided, get user's first household
      if (!targetHouseholdId) {
        const { data: membership } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!membership) {
          return { 
            itemCount: 0, 
            itemLimit: FREE_TIER_ITEM_LIMIT, 
            hasReachedLimit: false, 
            canAddMore: true,
            isHouseholdPremium: false,
            householdOwnerHasPremium: false
          };
        }
        targetHouseholdId = membership.household_id;
      }

      // Get household info and find the owner
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select(`
          id,
          name,
          created_by,
          household_members!inner (
            user_id,
            role
          )
        `)
        .eq('id', targetHouseholdId)
        .single();

      if (householdError || !household) {
        console.error('💳 Stripe: Error fetching household:', householdError);
        return { 
          itemCount: 0, 
          itemLimit: FREE_TIER_ITEM_LIMIT, 
          hasReachedLimit: false, 
          canAddMore: true,
          isHouseholdPremium: false,
          householdOwnerHasPremium: false
        };
      }

      // Find the household owner
      const owner = household.household_members.find(member => member.role === 'owner');
      const ownerId = owner?.user_id || household.created_by;

      if (!ownerId) {
        console.log('💳 Stripe: No household owner found, using free tier limits');
        return await this.getFreeTierLimitsForHousehold(targetHouseholdId || '');
      }

      // Check if household owner has premium using database function
      const { data: ownerPremiumCheck, error: premiumError } = await supabase
        .rpc('has_premium_access', { user_id: ownerId });

      if (premiumError) {
        console.error('💳 Stripe: Error checking owner premium:', premiumError);
        return await this.getFreeTierLimitsForHousehold(targetHouseholdId || '');
      }

      const householdOwnerHasPremium = Boolean(ownerPremiumCheck);

      console.log('💳 Stripe: Household premium check:', {
        householdId: targetHouseholdId,
        ownerId,
        householdOwnerHasPremium
      });

      // If household owner has premium, household gets unlimited items
      if (householdOwnerHasPremium) {
        return { 
          itemCount: 0, 
          itemLimit: -1, // Unlimited
          hasReachedLimit: false, 
          canAddMore: true,
          isHouseholdPremium: true,
          householdOwnerHasPremium: true
        };
      }

      // Otherwise, apply free tier limits
      return await this.getFreeTierLimitsForHousehold(targetHouseholdId || '');

    } catch (error) {
      console.error('💳 Stripe: Error checking household tier limits:', error);
      return { 
        itemCount: 0, 
        itemLimit: FREE_TIER_ITEM_LIMIT, 
        hasReachedLimit: false, 
        canAddMore: true,
        isHouseholdPremium: false,
        householdOwnerHasPremium: false
      };
    }
  }

  /**
   * Helper function to get free tier limits for non-premium households
   */
  private async getFreeTierLimitsForHousehold(householdId: string) {
    try {
      // Count active items for the specific household
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id')
        .eq('household_id', householdId)
        .eq('status', 'active');

      // Count household members
      const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId);

      if (itemsError) {
        console.error('💳 Stripe: Error counting items:', itemsError);
        return { 
          itemCount: 0, 
          itemLimit: FREE_TIER_ITEM_LIMIT, 
          hasReachedLimit: false, 
          canAddMore: true,
          isHouseholdPremium: false,
          householdOwnerHasPremium: false
        };
      }

      const itemCount = items?.length || 0;
      const memberCount = members?.length || 0;
      const itemLimit = FREE_TIER_ITEM_LIMIT;
      const memberLimit = FREE_TIER_HOUSEHOLD_MEMBER_LIMIT;
      const hasReachedLimit = itemCount >= itemLimit;

      console.log('💳 Stripe: Free household limits check:', { 
        itemCount, 
        itemLimit, 
        memberCount,
        memberLimit,
        hasReachedLimit, 
        householdId 
      });

      return {
        itemCount,
        itemLimit,
        hasReachedLimit,
        canAddMore: !hasReachedLimit,
        isHouseholdPremium: false,
        householdOwnerHasPremium: false,
        memberCount,
        memberLimit
      };
    } catch (error) {
      console.error('💳 Stripe: Error in free tier check:', error);
      return { 
        itemCount: 0, 
        itemLimit: FREE_TIER_ITEM_LIMIT, 
        hasReachedLimit: false, 
        canAddMore: true,
        isHouseholdPremium: false,
        householdOwnerHasPremium: false
      };
    }
  }

  /**
   * Show upgrade prompt when user hits limits
   */
  async showUpgradePrompt(feature: string = 'premium features'): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '🌟 Upgrade to Premium',
        `You've reached the free tier limit. Upgrade to Premium for unlimited ${feature} and much more!`,
        [
          { 
            text: 'Maybe Later', 
            style: 'cancel',
            onPress: () => resolve(false)
          },
          { 
            text: 'See Plans', 
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Get feature availability based on subscription
   */
  async getFeatureAvailability() {
    const hasPremium = await this.hasPremiumAccess();
    const limits = await this.checkFreeTierLimits();

    return {
      hasPremium,
      features: {
        unlimitedItems: hasPremium,
        smartNotifications: hasPremium,
        advancedBarcodeScanning: hasPremium,
        unlimitedRecipes: hasPremium,
        householdSharing: hasPremium,
        wasteTracking: hasPremium,
        prioritySupport: hasPremium,
        recipeExport: hasPremium,
      },
      limits: {
        maxItems: hasPremium ? -1 : limits.itemLimit,
        currentItems: limits.itemCount,
        canAddMore: hasPremium || limits.canAddMore,
        maxHouseholdMembers: hasPremium ? 5 : FREE_TIER_HOUSEHOLD_MEMBER_LIMIT,
        currentHouseholdMembers: limits.memberCount || 0,
        maxRecipeViews: hasPremium ? -1 : 3, // per week
      }
    };
  }

  /**
   * Format price display
   */
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }

  /**
   * Calculate savings for yearly plan
   */
  getYearlySavings(): { savings: number; percentage: number } {
    const monthly = SUBSCRIPTION_PLANS.find(p => p.id === 'premium_monthly');
    const yearly = SUBSCRIPTION_PLANS.find(p => p.id === 'premium_yearly');
    
    if (!monthly || !yearly) {
      return { savings: 0, percentage: 0 };
    }

    const yearlyEquivalent = monthly.price * 12;
    const savings = yearlyEquivalent - yearly.price;
    const percentage = Math.round((savings / yearlyEquivalent) * 100);

    return { savings, percentage };
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasStripeKey: !!STRIPE_PUBLISHABLE_KEY,
    };
  }
}

export const stripeService = new StripeService();
export type { SubscriptionPlan, SubscriptionStatus, TrialStatus }; 