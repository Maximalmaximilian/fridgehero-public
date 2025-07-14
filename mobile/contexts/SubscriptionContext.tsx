import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { stripeService } from '../lib/stripe';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
import { supabase } from '../lib/supabase';

interface SubscriptionLimits {
  maxHouseholds: number;
  maxItemsPerHousehold: number;
  maxHouseholdMembers: number;
  canCreateHouseholds: boolean;
  canAccessPremiumFeatures: boolean;
  householdOwnerHasPremium: boolean;
}

interface SubscriptionContextType {
  // Subscription state
  isActive: boolean;
  isPremium: boolean;
  status: string | null;
  planId: string | null;
  isTrialing: boolean;
  daysLeftInTrial: number;
  trialEnd: string | null;
  loading: boolean;
  hasLoaded: boolean; // Track if initial load is complete
  
  // Limitations
  limits: SubscriptionLimits;
  
  // Methods
  refreshSubscription: () => Promise<void>;
  enforceFreeLimitations: () => Promise<void>;
  checkFeatureAccess: (feature: string) => boolean;
  handlePremiumFeatureAccess: (featureName: string, onUpgrade?: () => void) => void;
  
  // Household management
  getHouseholdLimits: (householdId?: string) => Promise<any>;
  canCreateNewHousehold: () => boolean;
  getActiveHouseholdsCount: () => number;
  
  // Premium household downgrade management
  getPendingHouseholdNotifications: () => any[];
  clearPendingHouseholdNotification: (notificationId: string) => Promise<void>;
  getHouseholdDowngradeStatus: (householdId: string) => Promise<any>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscriptionData, setSubscriptionData] = useState({
    isActive: false,
    isPremium: false,
    status: null as string | null,
    planId: null as string | null,
    isTrialing: false,
    daysLeftInTrial: 0,
    trialEnd: null as string | null,
  });
  
  const [limits, setLimits] = useState<SubscriptionLimits>({
    maxHouseholds: 1,
    maxItemsPerHousehold: 20,
    maxHouseholdMembers: 5,
    canCreateHouseholds: true,
    canAccessPremiumFeatures: false,
    householdOwnerHasPremium: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { user } = useAuth();
  const { households, selectedHousehold, refreshHouseholds } = useHousehold();
  
  // Refs for managing checks and preventing duplicate calls
  const lastCheckTimestamp = useRef<number>(0);
  const checkInProgress = useRef<boolean>(false);
  const subscriptionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize and monitor subscription status
  useEffect(() => {
    if (user) {
      refreshSubscription();
      startPeriodicChecks();
      
      // Listen for app state changes to check subscription when app becomes active
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          const now = Date.now();
          const timeSinceLastCheck = now - lastCheckTimestamp.current;
          // Only check if it's been more than 5 minutes since last check
          if (timeSinceLastCheck > 300000) { // 5 minutes
            refreshSubscription();
          }
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => {
        subscription?.remove();
        if (subscriptionCheckInterval.current) {
          clearInterval(subscriptionCheckInterval.current);
        }
      };
    } else {
      // Reset state when user logs out
      setSubscriptionData({
        isActive: false,
        isPremium: false,
        status: null,
        planId: null,
        isTrialing: false,
        daysLeftInTrial: 0,
        trialEnd: null,
      });
      setLimits({
        maxHouseholds: 1,
        maxItemsPerHousehold: 20,
        maxHouseholdMembers: 5,
        canCreateHouseholds: true,
        canAccessPremiumFeatures: false,
        householdOwnerHasPremium: false,
      });
      setLoading(false);
      setHasLoaded(false);
    }
  }, [user]);

  // Monitor household changes to update limits
  useEffect(() => {
    if (user && selectedHousehold) {
      updateHouseholdLimits();
    }
  }, [selectedHousehold, subscriptionData.isPremium]);

  const startPeriodicChecks = () => {
    // Check subscription status every 30 minutes
    if (subscriptionCheckInterval.current) {
      clearInterval(subscriptionCheckInterval.current);
    }
    
    subscriptionCheckInterval.current = setInterval(() => {
      console.log('📱 Periodic subscription check (30 min)');
      refreshSubscription();
    }, 1800000); // 30 minutes
  };

  const refreshSubscription = useCallback(async () => {
    if (!user || checkInProgress.current) return;
    
    try {
      checkInProgress.current = true;
      setLoading(true);
      
      console.log('📱 Refreshing subscription status...');
      const status = await stripeService.getSubscriptionStatus();
      
      // Check if status changed from Premium to Free
      const wasActive = subscriptionData.isActive;
      const isNowActive = status.isActive;
      
      setSubscriptionData({
        isActive: isNowActive,
        isPremium: isNowActive,
        status: status.status,
        planId: status.planId,
        isTrialing: status.isTrialing,
        daysLeftInTrial: status.daysLeftInTrial,
        trialEnd: status.trialEnd,
      });
      
      // Update limits based on subscription status
      await updateSubscriptionLimits(isNowActive);
      
      // If user was Premium and is now Free, enforce limitations
      if (wasActive && !isNowActive) {
        console.log('📱 Premium to Free downgrade detected - enforcing limitations');
        await enforceFreeLimitations();
      }
      
      lastCheckTimestamp.current = Date.now();
      console.log('📱 Subscription status updated:', isNowActive ? 'Premium' : 'Free');
      
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setLoading(false);
      setHasLoaded(true);
      checkInProgress.current = false;
    }
  }, [user, subscriptionData.isActive]);

  const updateSubscriptionLimits = async (isPremium: boolean) => {
    const newLimits: SubscriptionLimits = {
      maxHouseholds: isPremium ? 999 : 1,
      maxItemsPerHousehold: isPremium ? -1 : 20, // -1 means unlimited
      maxHouseholdMembers: isPremium ? 20 : 5,
      canCreateHouseholds: true,
      canAccessPremiumFeatures: isPremium,
      householdOwnerHasPremium: false, // Will be updated in updateHouseholdLimits
    };
    
    setLimits(newLimits);
  };

  const updateHouseholdLimits = async () => {
    if (!selectedHousehold) return;
    
    try {
      const householdLimits = await stripeService.checkFreeTierLimits(selectedHousehold.household_id);
      setLimits(prev => ({
        ...prev,
        householdOwnerHasPremium: householdLimits.householdOwnerHasPremium,
      }));
    } catch (error) {
      console.error('Error updating household limits:', error);
    }
  };

  const enforceFreeLimitations = async () => {
    try {
      console.log('📱 Enforcing Free limitations...');
      
      // 1. Handle multiple households - lock extras
      if (households.length > 1) {
        await handleMultipleHouseholdsDowngrade();
      }
      
      // 2. Handle Premium household downgrades for households this user created
      await handlePremiumHouseholdDowngrades();
      
      // 3. Check and handle household member limits
      for (const household of households) {
        await enforceHouseholdMemberLimits(household.household_id);
      }
      
      // 4. Refresh household data to reflect changes
      await refreshHouseholds();
      
      console.log('📱 Free limitations enforced successfully');
      
    } catch (error) {
      console.error('Error enforcing free limitations:', error);
    }
  };

  const handleMultipleHouseholdsDowngrade = async () => {
    if (households.length <= 1) return;
    
    // Since HouseholdContext only provides active households, 
    // if user has multiple households, they're all active
    console.log(`📱 User has ${households.length} active households, needs to select one`);
    
    // The HouseholdsScreen will detect this condition and show the selection modal
    // We don't need to show an alert here - just log the situation
    console.log('📱 HouseholdsScreen will handle household selection modal');
  };

  const showHouseholdSelectionModal = () => {
    // This function is deprecated - HouseholdsScreen now handles the modal
    console.log('📱 Household selection is now handled by HouseholdsScreen modal');
  };

  const activateSelectedHousehold = async (householdId: string) => {
    try {
      console.log('📱 Activating household via SubscriptionContext:', householdId);
      
      // Use the new RPC function to properly switch households
      const { error } = await supabase.rpc('switch_active_household', {
        user_id_param: user?.id,
        new_household_id: householdId
      });

      if (error) {
        console.error('Error activating household:', error);
        throw error;
      }

      console.log('📱 Household activated successfully');
      await refreshHouseholds();
      
      return { success: true };
    } catch (error) {
      console.error('Error activating household:', error);
      return { success: false, error };
    }
  };

  const enforceHouseholdMemberLimits = async (householdId: string) => {
    try {
      const { data: members } = await supabase
        .from('household_members')
        .select('user_id, role')
        .eq('household_id', householdId);

      if (!members || members.length <= 5) return; // Within free limits

      // If over 5 members, need to handle this (but don't automatically remove members)
      console.log(`Household ${householdId} has ${members.length} members (over free limit of 5)`);
      
      // Just log for now - removing members automatically could be disruptive
      // The UI should handle displaying the limitation
      
    } catch (error) {
      console.error('Error checking household member limits:', error);
    }
  };

  const getHouseholdLimits = async (householdId?: string) => {
    try {
      return await stripeService.checkFreeTierLimits(householdId);
    } catch (error) {
      console.error('Error getting household limits:', error);
      return null;
    }
  };

  const canCreateNewHousehold = () => {
    return subscriptionData.isPremium || households.length < 1;
  };

  const getActiveHouseholdsCount = () => {
    return households.length;
  };

  const checkFeatureAccess = (feature: string) => {
    switch (feature) {
      case 'multiple_households':
        return subscriptionData.isPremium || households.length <= 1;
      case 'unlimited_items':
        return subscriptionData.isPremium || limits.householdOwnerHasPremium;
      case 'barcode_scanning':
      case 'advanced_notifications':
      case 'waste_analytics':
      case 'recipe_export':
        return subscriptionData.isPremium || limits.householdOwnerHasPremium;
      default:
        return true;
    }
  };

  const handlePremiumFeatureAccess = (featureName: string, onUpgrade?: () => void) => {
    Alert.alert(
      '🔒 Premium Feature',
      `${featureName} is a Premium feature. Upgrade to access all features and save more money!`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            if (onUpgrade) {
              onUpgrade();
            } else {
              // Navigate to premium screen (will need navigation context)
              console.log('Navigate to Premium screen');
            }
          },
        },
      ]
    );
  };

  const handlePremiumHouseholdDowngrades = async () => {
    try {
      console.log('📱 Checking for Premium households to downgrade...');
      
      // Find all households created by this user that have premium features (max_members > 5)
      const { data: premiumHouseholds, error } = await supabase
        .from('households')
        .select('id, name, max_members, created_by')
        .eq('created_by', user?.id)
        .gt('max_members', 5);

      if (error) {
        console.error('Error fetching premium households:', error);
        return;
      }

      if (!premiumHouseholds || premiumHouseholds.length === 0) {
        console.log('📱 No premium households found to downgrade');
        return;
      }

      console.log(`📱 Found ${premiumHouseholds.length} premium household(s) to downgrade`);

      // Downgrade each premium household
      for (const household of premiumHouseholds) {
        try {
          console.log(`📱 Downgrading household: ${household.name} (${household.id})`);
          
          const { data: result, error: downgradeError } = await supabase.rpc('downgrade_premium_household', {
            household_id_param: household.id,
            user_id_param: user?.id
          });

          if (downgradeError) {
            console.error(`Error downgrading household ${household.name}:`, downgradeError);
            continue;
          }

          if (result?.success) {
            console.log(`✅ Successfully downgraded household: ${household.name}`);
            
            // If members were made inactive due to overcapacity, we'll show a notification later
            if (result.members_made_inactive > 0) {
              console.log(`⚠️ ${result.members_made_inactive} members were made inactive in ${household.name}`);
              
              // Store this information for later notification
              await storePendingHouseholdNotification(household.id, {
                type: 'downgrade_overcapacity',
                householdName: household.name,
                membersAffected: result.members_made_inactive,
                originalMemberCount: result.original_member_count,
                currentMemberCount: result.current_member_count
              });
            }
          }
        } catch (error) {
          console.error(`Error processing household ${household.name}:`, error);
        }
      }
      
      console.log('📱 Premium household downgrade process completed');
      
    } catch (error) {
      console.error('Error in handlePremiumHouseholdDowngrades:', error);
    }
  };

  const storePendingHouseholdNotification = async (householdId: string, notificationData: any) => {
    try {
      // Store in user metadata or a notifications table for later display
      const currentUserData = user?.user_metadata || {};
      const pendingNotifications = currentUserData.pending_household_notifications || [];
      
      pendingNotifications.push({
        id: `${householdId}_${Date.now()}`,
        householdId,
        ...notificationData,
        createdAt: new Date().toISOString()
      });

      // Update user metadata with pending notifications
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentUserData,
          pending_household_notifications: pendingNotifications
        }
      });

      if (error) {
        console.error('Error storing pending notification:', error);
      }
    } catch (error) {
      console.error('Error in storePendingHouseholdNotification:', error);
    }
  };

  const getPendingHouseholdNotifications = () => {
    return user?.user_metadata?.pending_household_notifications || [];
  };

  const clearPendingHouseholdNotification = async (notificationId: string) => {
    try {
      const currentUserData = user?.user_metadata || {};
      const pendingNotifications = (currentUserData.pending_household_notifications || [])
        .filter((n: any) => n.id !== notificationId);

      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentUserData,
          pending_household_notifications: pendingNotifications
        }
      });

      if (error) {
        console.error('Error clearing pending notification:', error);
      }
    } catch (error) {
      console.error('Error in clearPendingHouseholdNotification:', error);
    }
  };

  const getHouseholdDowngradeStatus = async (householdId: string) => {
    try {
      const { data: result, error } = await supabase.rpc('get_household_downgrade_status', {
        household_id_param: householdId
      });

      if (error) {
        console.error('Error getting household downgrade status:', error);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Error in getHouseholdDowngradeStatus:', error);
      return null;
    }
  };

  const value: SubscriptionContextType = {
    // Subscription state
    isActive: subscriptionData.isActive,
    isPremium: subscriptionData.isPremium,
    status: subscriptionData.status,
    planId: subscriptionData.planId,
    isTrialing: subscriptionData.isTrialing,
    daysLeftInTrial: subscriptionData.daysLeftInTrial,
    trialEnd: subscriptionData.trialEnd,
    loading,
    hasLoaded,
    
    // Limitations
    limits,
    
    // Methods
    refreshSubscription,
    enforceFreeLimitations,
    checkFeatureAccess,
    handlePremiumFeatureAccess,
    
    // Household management
    getHouseholdLimits,
    canCreateNewHousehold,
    getActiveHouseholdsCount,
    
    // Premium household downgrade management
    getPendingHouseholdNotifications,
    clearPendingHouseholdNotification,
    getHouseholdDowngradeStatus,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 