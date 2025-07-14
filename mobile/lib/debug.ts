import { Alert } from 'react-native';
import { supabase } from './supabase';

/**
 * DEBUG UTILITIES - FOR DEVELOPMENT ONLY
 * Remove this file before production deployment
 */

export class DebugService {
  /**
   * Set user subscription status for testing
   */
  static async setSubscriptionStatus(status: 'free' | 'active' | 'trialing' | 'canceled' | 'past_due'): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Debug Error', 'No user logged in');
        return false;
      }

      const now = new Date();
      let updateData: any = {
        subscription_status: status,
        updated_at: now.toISOString()
      };

      // Set appropriate fields based on status
      switch (status) {
        case 'free':
          updateData = {
            ...updateData,
            subscription_plan_id: null,
            subscription_period_end: null,
            subscription_cancel_at_period_end: false,
            trial_started_at: null,
            trial_end_at: null,
          };
          break;

        case 'active':
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          updateData = {
            ...updateData,
            subscription_plan_id: 'premium_monthly',
            subscription_period_end: nextMonth.toISOString(),
            subscription_cancel_at_period_end: false,
            subscription_stripe_customer_id: `debug_customer_${user.id}`,
            trial_started_at: null,
            trial_end_at: null,
          };
          break;

        case 'trialing':
          const trialEnd = new Date(now);
          trialEnd.setDate(trialEnd.getDate() + 7); // 7 days from now
          updateData = {
            ...updateData,
            subscription_plan_id: 'premium_monthly',
            subscription_period_end: null,
            subscription_cancel_at_period_end: false,
            trial_started_at: now.toISOString(),
            trial_end_at: trialEnd.toISOString(),
            has_used_trial: true,
          };
          break;

        case 'canceled':
          updateData = {
            ...updateData,
            subscription_cancel_at_period_end: true,
          };
          break;

        case 'past_due':
          // Keep existing subscription but mark as past due
          updateData = {
            ...updateData,
            subscription_plan_id: 'premium_monthly',
          };
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Debug: Failed to update subscription:', error);
        Alert.alert('Debug Error', 'Failed to update subscription status');
        return false;
      }

      console.log('🐛 Debug: Subscription status changed to:', status);
      Alert.alert(
        'Debug Success ✅', 
        `Subscription set to: ${status.toUpperCase()}\n\nNavigate to Dashboard to see the changes!`,
        [{ text: 'OK' }]
      );
      return true;
    } catch (error) {
      console.error('Debug: Error setting subscription:', error);
      Alert.alert('Debug Error', 'Failed to set subscription status');
      return false;
    }
  }

  /**
   * Reset trial eligibility (allow user to start trial again)
   */
  static async resetTrialEligibility(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update({
          has_used_trial: false,
          trial_started_at: null,
          trial_end_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Debug: Failed to reset trial:', error);
        return false;
      }

      Alert.alert('Debug Success', 'Trial eligibility reset - user can start trial again');
      return true;
    } catch (error) {
      console.error('Debug: Error resetting trial:', error);
      return false;
    }
  }

  /**
   * Start a trial that expires in X minutes (for testing expiration)
   */
  static async startExpiringTrial(minutesUntilExpiry: number = 2): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const now = new Date();
      const trialEnd = new Date(now.getTime() + (minutesUntilExpiry * 60 * 1000));

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'trialing',
          subscription_plan_id: 'premium_monthly',
          trial_started_at: now.toISOString(),
          trial_end_at: trialEnd.toISOString(),
          has_used_trial: true,
          updated_at: now.toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Debug: Failed to start expiring trial:', error);
        return false;
      }

      Alert.alert('Debug Success', `Trial will expire in ${minutesUntilExpiry} minutes`);
      return true;
    } catch (error) {
      console.error('Debug: Error starting expiring trial:', error);
      return false;
    }
  }

  /**
   * Get current subscription info for debugging
   */
  static async getSubscriptionInfo(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          subscription_status,
          subscription_plan_id,
          subscription_period_end,
          subscription_cancel_at_period_end,
          trial_started_at,
          trial_end_at,
          has_used_trial,
          subscription_stripe_customer_id
        `)
        .eq('id', user.id)
        .single();

      return profile;
    } catch (error) {
      console.error('Debug: Error getting subscription info:', error);
      return null;
    }
  }

  /**
   * Show current subscription status in an alert
   */
  static async showSubscriptionInfo(): Promise<void> {
    const info = await this.getSubscriptionInfo();
    if (!info) {
      Alert.alert('Debug Info', 'No subscription info found');
      return;
    }

    const statusText = `
Status: ${info.subscription_status || 'N/A'}
Plan: ${info.subscription_plan_id || 'N/A'}
Period End: ${info.subscription_period_end ? new Date(info.subscription_period_end).toLocaleDateString() : 'N/A'}
Cancel at Period End: ${info.subscription_cancel_at_period_end ? 'Yes' : 'No'}
Trial Started: ${info.trial_started_at ? new Date(info.trial_started_at).toLocaleDateString() : 'N/A'}
Trial End: ${info.trial_end_at ? new Date(info.trial_end_at).toLocaleDateString() : 'N/A'}
Has Used Trial: ${info.has_used_trial ? 'Yes' : 'No'}
Customer ID: ${info.subscription_stripe_customer_id || 'N/A'}
    `.trim();

    Alert.alert('Debug: Current Subscription', statusText);
  }
} 