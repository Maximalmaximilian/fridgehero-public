import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useSubscription } from '../contexts/OptimizedSubscriptionContext';

export interface PremiumFeatureConfig {
  feature: string;
  title: string;
  description: string;
  upgradeMessage?: string;
}

// Hook for checking and handling Premium feature access
export const usePremiumFeatureAccess = (config: PremiumFeatureConfig) => {
  const { checkFeatureAccess, handlePremiumFeatureAccess } = useSubscription();
  
  const hasAccess = useMemo(() => 
    checkFeatureAccess(config.feature), 
    [checkFeatureAccess, config.feature]
  );
  
  const requestAccess = useCallback((onUpgrade?: () => void) => {
    if (hasAccess) return true;
    
    const message = config.upgradeMessage || 
      `${config.title} is a Premium feature. ${config.description}`;
    
    handlePremiumFeatureAccess(message, onUpgrade);
    return false;
  }, [hasAccess, config, handlePremiumFeatureAccess]);
  
  const showFeatureInfo = useCallback(() => {
    Alert.alert(
      `🔒 ${config.title}`,
      config.description,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => requestAccess(),
        },
      ]
    );
  }, [config, requestAccess]);
  
  return {
    hasAccess,
    requestAccess,
    showFeatureInfo,
    isLocked: !hasAccess,
  };
};

// Hook for household limitations
export const useHouseholdLimits = () => {
  const { 
    isPremium, 
    limits, 
    getActiveHouseholdsCount,
    canCreateNewHousehold,
    handlePremiumFeatureAccess 
  } = useSubscription();
  
  const activeCount = useMemo(() => getActiveHouseholdsCount(), [getActiveHouseholdsCount]);
  const maxHouseholds = limits.maxHouseholds;
  const canCreate = canCreateNewHousehold();
  
  const checkCreateHouseholdAccess = useCallback((onUpgrade?: () => void) => {
    if (canCreate) return true;
    
    handlePremiumFeatureAccess(
      'Multiple Households',
      onUpgrade
    );
    return false;
  }, [canCreate, handlePremiumFeatureAccess]);
  
  return {
    activeCount,
    maxHouseholds,
    canCreate,
    checkCreateAccess: checkCreateHouseholdAccess,
    isAtLimit: activeCount >= maxHouseholds && !isPremium,
    percentUsed: isPremium ? 0 : (activeCount / maxHouseholds) * 100,
  };
};

// Hook for item limitations
export const useItemLimits = (householdId?: string) => {
  const { isPremium, limits, getHouseholdLimits } = useSubscription();
  
  const checkItemLimit = useCallback(async (currentCount: number) => {
    if (isPremium || limits.householdOwnerHasPremium) {
      return { canAdd: true, limit: -1, currentCount };
    }
    
    const limit = limits.maxItemsPerHousehold;
    const canAdd = currentCount < limit;
    
    return {
      canAdd,
      limit,
      currentCount,
      percentUsed: (currentCount / limit) * 100,
      isAtLimit: currentCount >= limit,
      isNearLimit: (currentCount / limit) >= 0.8,
    };
  }, [isPremium, limits]);
  
  const requestItemAccess = useCallback(async (currentCount: number, onUpgrade?: () => void) => {
    const status = await checkItemLimit(currentCount);
    
    if (status.canAdd) return true;
    
    Alert.alert(
      '🔒 Item Limit Reached',
      `Free accounts are limited to ${status.limit} items per household. You currently have ${currentCount} items.\n\nUpgrade to Premium for unlimited items!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade to Premium',
          onPress: onUpgrade || (() => console.log('Navigate to Premium')),
        },
      ]
    );
    
    return false;
  }, [checkItemLimit]);
  
  return {
    checkItemLimit,
    requestItemAccess,
    maxItems: limits.maxItemsPerHousehold,
    hasUnlimitedItems: isPremium || limits.householdOwnerHasPremium,
  };
};

// Hook for member limitations
export const useMemberLimits = (householdId: string) => {
  const { isPremium, limits } = useSubscription();
  
  const maxMembers = limits.maxHouseholdMembers;
  const hasUnlimitedMembers = isPremium;
  
  const checkMemberLimit = useCallback((currentCount: number) => {
    if (hasUnlimitedMembers) {
      return { canAdd: true, limit: maxMembers, currentCount };
    }
    
    const canAdd = currentCount < maxMembers;
    
    return {
      canAdd,
      limit: maxMembers,
      currentCount,
      percentUsed: (currentCount / maxMembers) * 100,
      isAtLimit: currentCount >= maxMembers,
      isNearLimit: (currentCount / maxMembers) >= 0.8,
    };
  }, [hasUnlimitedMembers, maxMembers]);
  
  const requestMemberAccess = useCallback((currentCount: number, onUpgrade?: () => void) => {
    const status = checkMemberLimit(currentCount);
    
    if (status.canAdd) return true;
    
    Alert.alert(
      '🔒 Member Limit Reached',
      `Free accounts are limited to ${status.limit} members per household. This household has ${currentCount} members.\n\nUpgrade to Premium for up to 20 members!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade to Premium',
          onPress: onUpgrade || (() => console.log('Navigate to Premium')),
        },
      ]
    );
    
    return false;
  }, [checkMemberLimit]);
  
  return {
    checkMemberLimit,
    requestMemberAccess,
    maxMembers,
    hasUnlimitedMembers,
  };
};

// Predefined feature configurations
export const PREMIUM_FEATURES = {
  BARCODE_SCANNING: {
    feature: 'barcode_scanning',
    title: 'Barcode Scanning',
    description: 'Quickly add items by scanning their barcode. Save time and reduce manual entry errors.',
    upgradeMessage: 'Barcode scanning helps you add items faster and more accurately.',
  },
  WASTE_ANALYTICS: {
    feature: 'waste_analytics',
    title: 'Waste Analytics',
    description: 'Track your food waste patterns and get insights to reduce waste and save money.',
    upgradeMessage: 'Analytics help you understand your consumption patterns and reduce food waste.',
  },
  ADVANCED_NOTIFICATIONS: {
    feature: 'advanced_notifications',
    title: 'Advanced Notifications',
    description: 'Get smart reminders, expiration alerts, and customizable notification schedules.',
    upgradeMessage: 'Never let food expire again with smart notifications.',
  },
  RECIPE_EXPORT: {
    feature: 'recipe_export',
    title: 'Recipe Export',
    description: 'Export your recipes to PDF or share them with friends and family.',
    upgradeMessage: 'Share your favorite recipes easily with export functionality.',
  },
  MULTIPLE_HOUSEHOLDS: {
    feature: 'multiple_households',
    title: 'Multiple Households',
    description: 'Manage multiple kitchens, share with roommates, or organize different properties.',
    upgradeMessage: 'Manage all your households in one place with Premium.',
  },
} as const;

// Convenience hooks for specific features
export const useBarcodeScanning = () => usePremiumFeatureAccess(PREMIUM_FEATURES.BARCODE_SCANNING);
export const useWasteAnalytics = () => usePremiumFeatureAccess(PREMIUM_FEATURES.WASTE_ANALYTICS);
export const useAdvancedNotifications = () => usePremiumFeatureAccess(PREMIUM_FEATURES.ADVANCED_NOTIFICATIONS);
export const useRecipeExport = () => usePremiumFeatureAccess(PREMIUM_FEATURES.RECIPE_EXPORT);
export const useMultipleHouseholds = () => usePremiumFeatureAccess(PREMIUM_FEATURES.MULTIPLE_HOUSEHOLDS);

// Utility hook for subscription status
export const useSubscriptionStatus = () => {
  const subscription = useSubscription();
  
  return useMemo(() => ({
    isPremium: subscription.isPremium,
    isTrialing: subscription.isTrialing,
    daysLeftInTrial: subscription.daysLeftInTrial,
    status: subscription.status,
    planId: subscription.planId,
    isReady: subscription.isReady,
    loading: subscription.loading,
    
    // Convenience flags
    isActive: subscription.isPremium,
    isFree: !subscription.isPremium,
    hasTrialExpired: subscription.isTrialing && subscription.daysLeftInTrial <= 0,
    isNearTrialEnd: subscription.isTrialing && subscription.daysLeftInTrial <= 3,
  }), [subscription]);
}; 