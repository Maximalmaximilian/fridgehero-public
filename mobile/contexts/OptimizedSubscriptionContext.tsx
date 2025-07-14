import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

interface SubscriptionState {
  isActive: boolean;
  isPremium: boolean;
  status: string | null;
  planId: string | null;
  isTrialing: boolean;
  daysLeftInTrial: number;
  trialEnd: string | null;
  loading: boolean;
  hasLoaded: boolean; // Track if initial load is complete
  limits: SubscriptionLimits;
}

interface SubscriptionContextType extends SubscriptionState {
  // Methods
  refreshSubscription: () => Promise<void>;
  enforceFreeLimitations: () => Promise<void>;
  checkFeatureAccess: (feature: string) => boolean;
  handlePremiumFeatureAccess: (featureName: string, onUpgrade?: () => void) => void;
  
  // Household management
  getHouseholdLimits: (householdId?: string) => Promise<any>;
  canCreateNewHousehold: () => boolean;
  getActiveHouseholdsCount: () => number;
  
  // UI helpers
  isReady: boolean; // True when subscription status has been loaded at least once
}

const defaultState: SubscriptionState = {
  isActive: false,
  isPremium: false,
  status: null,
  planId: null,
  isTrialing: false,
  daysLeftInTrial: 0,
  trialEnd: null,
  loading: true,
  hasLoaded: false,
  limits: {
    maxHouseholds: 1,
    maxItemsPerHousehold: 20,
    maxHouseholdMembers: 5,
    canCreateHouseholds: true,
    canAccessPremiumFeatures: false,
    householdOwnerHasPremium: false,
  },
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Hook for instant UI rendering with loading state
export const useSubscriptionWithSuspense = () => {
  const context = useSubscription();
  
  if (!context.isReady) {
    throw new Promise((resolve) => {
      const checkReady = () => {
        if (context.isReady) {
          resolve(true);
        } else {
          setTimeout(checkReady, 50);
        }
      };
      checkReady();
    });
  }
  
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [state, setState] = useState<SubscriptionState>(defaultState);
  const { user } = useAuth();
  const { households, selectedHousehold, refreshHouseholds } = useHousehold();
  
  // Refs for managing checks and preventing duplicate calls
  const lastCheckTimestamp = useRef<number>(0);
  const checkInProgress = useRef<boolean>(false);
  const subscriptionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const initialLoadComplete = useRef<boolean>(false);

  // Memoized computed values to prevent unnecessary re-renders
  const computedValues = useMemo(() => ({
    isReady: state.hasLoaded && !state.loading,
    canCreateNewHousehold: () => state.isPremium || households.length < 1,
    getActiveHouseholdsCount: () => households.length,
  }), [state.hasLoaded, state.loading, state.isPremium, households.length]);

  // Initialize and monitor subscription status
  useEffect(() => {
    if (user) {
      // Immediate check on user change
      refreshSubscription().then(() => {
        initialLoadComplete.current = true;
      });
      startPeriodicChecks();
      
      // Listen for app state changes
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && initialLoadComplete.current) {
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
      // Reset state when user logs out - but keep it as "loaded" for instant UI
      setState({
        ...defaultState,
        loading: false,
        hasLoaded: true,
      });
      initialLoadComplete.current = false;
    }
  }, [user]);

  // Monitor household changes to update limits
  useEffect(() => {
    if (user && selectedHousehold && state.hasLoaded) {
      updateHouseholdLimits();
    }
  }, [selectedHousehold, state.isPremium, state.hasLoaded]);

  const startPeriodicChecks = () => {
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
      
      // Only show loading for initial load
      if (!state.hasLoaded) {
        setState(prev => ({ ...prev, loading: true }));
      }
      
      console.log('📱 Refreshing subscription status...');
      const status = await stripeService.getSubscriptionStatus();
      
      // Check if status changed from Premium to Free
      const wasActive = state.isActive;
      const isNowActive = status.isActive;
      
      const newLimits = await calculateLimits(isNowActive);
      
      setState(prev => ({
        ...prev,
        isActive: isNowActive,
        isPremium: isNowActive,
        status: status.status,
        planId: status.planId,
        isTrialing: status.isTrialing,
        daysLeftInTrial: status.daysLeftInTrial,
        trialEnd: status.trialEnd,
        limits: newLimits,
        loading: false,
        hasLoaded: true,
      }));
      
      // If user was Premium and is now Free, enforce limitations
      if (wasActive && !isNowActive) {
        console.log('📱 Premium to Free downgrade detected - enforcing limitations');
        await enforceFreeLimitations();
      }
      
      lastCheckTimestamp.current = Date.now();
      console.log('📱 Subscription status updated:', isNowActive ? 'Premium' : 'Free');
      
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        hasLoaded: true,
      }));
    } finally {
      checkInProgress.current = false;
    }
  }, [user, state.isActive, state.hasLoaded]);

  const calculateLimits = async (isPremium: boolean): Promise<SubscriptionLimits> => {
    const baseLimits: SubscriptionLimits = {
      maxHouseholds: isPremium ? 999 : 1,
      maxItemsPerHousehold: isPremium ? -1 : 20, // -1 means unlimited
      maxHouseholdMembers: isPremium ? 20 : 5,
      canCreateHouseholds: true,
      canAccessPremiumFeatures: isPremium,
      householdOwnerHasPremium: false,
    };

    // Update household-specific limits
    if (selectedHousehold) {
      try {
        const householdLimits = await stripeService.checkFreeTierLimits(selectedHousehold.household_id);
        baseLimits.householdOwnerHasPremium = householdLimits.householdOwnerHasPremium;
      } catch (error) {
        console.error('Error getting household limits:', error);
      }
    }

    return baseLimits;
  };

  const updateHouseholdLimits = async () => {
    if (!selectedHousehold) return;
    
    try {
      const householdLimits = await stripeService.checkFreeTierLimits(selectedHousehold.household_id);
      setState(prev => ({
        ...prev,
        limits: {
          ...prev.limits,
          householdOwnerHasPremium: householdLimits.householdOwnerHasPremium,
        }
      }));
    } catch (error) {
      console.error('Error updating household limits:', error);
    }
  };

  const enforceFreeLimitations = async () => {
    try {
      console.log('📱 Enforcing Free limitations...');
      
      if (households.length > 1) {
        await handleMultipleHouseholdsDowngrade();
      }
      
      for (const household of households) {
        await enforceHouseholdMemberLimits(household.household_id);
      }
      
      await refreshHouseholds();
      console.log('📱 Free limitations enforced successfully');
      
    } catch (error) {
      console.error('Error enforcing free limitations:', error);
    }
  };

  const handleMultipleHouseholdsDowngrade = async () => {
    if (households.length <= 1) return;
    
    Alert.alert(
      '🔄 Premium Downgrade',
      `Free accounts can only have 1 active household. You currently have ${households.length} households.\n\nPlease select which household to keep active. The others will be temporarily locked until you upgrade to Premium again.`,
      [
        {
          text: 'Choose Household',
          onPress: () => showHouseholdSelectionModal(),
        },
      ],
      { cancelable: false }
    );
  };

  const showHouseholdSelectionModal = () => {
    const householdOptions = households.map((household) => ({
      text: `${household.households.name} ${household.role === 'owner' ? '(Owner)' : '(Member)'}`,
      onPress: () => activateSelectedHousehold(household.household_id),
    }));

    Alert.alert(
      'Select Active Household',
      'Choose which household to keep active:',
      [
        ...householdOptions,
        {
          text: 'Keep Current',
          onPress: () => selectedHousehold && activateSelectedHousehold(selectedHousehold.household_id),
        },
      ]
    );
  };

  const activateSelectedHousehold = async (householdId: string) => {
    try {
      const { error } = await supabase
        .from('household_members')
        .update({ is_active: true })
        .eq('household_id', householdId)
        .eq('user_id', user?.id);

      if (error) throw error;

      const otherHouseholdIds = households
        .filter(h => h.household_id !== householdId)
        .map(h => h.household_id);

      if (otherHouseholdIds.length > 0) {
        const { error: deactivateError } = await supabase
          .from('household_members')
          .update({ is_active: false })
          .in('household_id', otherHouseholdIds)
          .eq('user_id', user?.id);

        if (deactivateError) throw deactivateError;
      }

      Alert.alert(
        'Household Activated',
        'Your selected household is now active. Other households are locked until you upgrade to Premium.',
        [{ text: 'OK' }]
      );

      await refreshHouseholds();
    } catch (error) {
      console.error('Error activating household:', error);
      Alert.alert('Error', 'Failed to activate household. Please try again.');
    }
  };

  const enforceHouseholdMemberLimits = async (householdId: string) => {
    try {
      const { data: members } = await supabase
        .from('household_members')
        .select('user_id, role')
        .eq('household_id', householdId);

      if (!members || members.length <= 5) return;

      console.log(`Household ${householdId} has ${members.length} members (over free limit of 5)`);
      
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

  const checkFeatureAccess = useCallback((feature: string) => {
    switch (feature) {
      case 'multiple_households':
        return state.isPremium || households.length <= 1;
      case 'unlimited_items':
        return state.isPremium || state.limits.householdOwnerHasPremium;
      case 'barcode_scanning':
      case 'advanced_notifications':
      case 'waste_analytics':
      case 'recipe_export':
        return state.isPremium || state.limits.householdOwnerHasPremium;
      default:
        return true;
    }
  }, [state.isPremium, state.limits.householdOwnerHasPremium, households.length]);

  const handlePremiumFeatureAccess = useCallback((featureName: string, onUpgrade?: () => void) => {
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
              console.log('Navigate to Premium screen');
            }
          },
        },
      ]
    );
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo<SubscriptionContextType>(() => ({
    ...state,
    ...computedValues,
    refreshSubscription,
    enforceFreeLimitations,
    checkFeatureAccess,
    handlePremiumFeatureAccess,
    getHouseholdLimits,
  }), [
    state,
    computedValues,
    refreshSubscription,
    enforceFreeLimitations,
    checkFeatureAccess,
    handlePremiumFeatureAccess,
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}; 