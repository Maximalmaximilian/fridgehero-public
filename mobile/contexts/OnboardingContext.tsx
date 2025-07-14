import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '../lib/analytics';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  shouldShowOnboarding: boolean;
  isLoading: boolean;
  hasProfile: boolean;
  shouldContinueOnboarding: boolean; // New: user is authenticated but needs to continue onboarding
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  createMissingProfile: () => Promise<boolean>;
  refreshOnboardingStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

const ONBOARDING_STORAGE_KEY = 'fridgehero_onboarding_completed';
const ONBOARDING_VERSION = '1.0.0'; // Update this when onboarding flow changes

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldContinueOnboarding, setShouldContinueOnboarding] = useState(false);
  
  // Add ref to track completion state to prevent unnecessary re-checks
  const hasCompletedOnboardingRef = useRef(false);
  const previousUserRef = useRef(user);

  useEffect(() => {
    // Check if user actually changed (login/logout scenario)
    const userChanged = previousUserRef.current?.id !== user?.id;
    
    if (userChanged) {
      console.log('🎯 User changed, resetting onboarding state...');
      // Reset the completion cache when user changes (including logout)
      hasCompletedOnboardingRef.current = false;
      // Reset onboarding state for new user context
      setIsOnboardingComplete(false);
      setShouldShowOnboarding(false);
      setShouldContinueOnboarding(false);
      setHasProfile(false);
      
      // If user logged out, immediately show onboarding
      if (!user) {
        console.log('🎯 🚨 User logged out - immediately showing onboarding');
        setShouldShowOnboarding(true);
      }
    }
    
    previousUserRef.current = user;
    checkOnboardingStatus(user);
  }, [user]);

  const checkOnboardingStatus = async (currentUser = user) => {
    try {
      // For new registrations, ALWAYS check the actual status even if cached
      // Only use cache if we have a user, cache is for same user, AND user is not in onboarding flow
      const isInOnboardingFlow = currentUser?.user_metadata?.in_onboarding_flow;
      const hasOnboardingCompleted = currentUser?.user_metadata?.onboarding_completed;
      
      if (hasCompletedOnboardingRef.current && currentUser && 
          previousUserRef.current?.id === currentUser.id &&
          !isInOnboardingFlow && hasOnboardingCompleted) {
        console.log('🎯 ✅ Onboarding already completed (cached), skipping check');
        setIsLoading(false);
        return;
      }
      
      console.log('🎯 🔍 Checking onboarding status (not using cache):', {
        isInOnboardingFlow,
        hasOnboardingCompleted,
        userId: currentUser?.id
      });

      setIsLoading(true);

      // CRITICAL: If no user is logged in, always show onboarding regardless of stored completion
      if (!currentUser) {
        console.log('🎯 🚨 No user logged in - showing onboarding/login');
        setIsOnboardingComplete(false);
        setShouldShowOnboarding(true);
        setShouldContinueOnboarding(false);
        setHasProfile(false);
        setIsLoading(false);
        return;
      }

      // CRITICAL: Check user metadata first before AsyncStorage
      // User metadata is the source of truth, especially for users in onboarding flow
      const isStillInOnboardingFlow = currentUser?.user_metadata?.in_onboarding_flow;
      const userMetadataOnboardingComplete = currentUser?.user_metadata?.onboarding_completed;
      
      console.log('🎯 User metadata check:', {
        isStillInOnboardingFlow,
        userMetadataOnboardingComplete,
        userId: currentUser.id
      });
      
            // If user metadata explicitly says they're in onboarding flow, check what stage they're at
      if (isStillInOnboardingFlow) {
        console.log('🎯 🚨 User metadata indicates still in onboarding flow - checking stage...');
        
        // Check if user has made a household choice - this indicates they're in the flow
        const hasHouseholdChoice = currentUser?.user_metadata?.onboarding_household_choice;
        
        // For users in onboarding flow, check if they're authenticated (which means they completed registration)
        // If they're authenticated AND in onboarding flow, they should continue to household setup
        console.log('🎯 ✅ User is authenticated and in onboarding flow - should continue to household setup');
        
        // Check if user already has household choice to prevent loops
        if (hasHouseholdChoice) {
          console.log('🎯 🛡️ User has household choice - maintaining current navigation state to prevent loops');
          setHasProfile(true);
          setIsOnboardingComplete(false);
          // Don't change shouldShowOnboarding or shouldContinueOnboarding - keep current state
          setIsLoading(false);
          return;
        } else {
          console.log('🎯 🎯 User completed account creation, directing to household setup');
          setHasProfile(true);
          setIsOnboardingComplete(false);
          setShouldShowOnboarding(false); // Don't show full onboarding from welcome screen
          setShouldContinueOnboarding(true); // Continue onboarding at household setup
          setIsLoading(false);
          return;
        }
      }
      
      // If user metadata explicitly says onboarding is complete, respect that
      if (userMetadataOnboardingComplete) {
        console.log('🎯 ✅ User metadata indicates onboarding complete');
        hasCompletedOnboardingRef.current = true;
        setHasProfile(true);
        setIsOnboardingComplete(true);
        setShouldShowOnboarding(false);
        setShouldContinueOnboarding(false);
        setIsLoading(false);
        return;
      }
      
      // Get stored onboarding status as fallback (only relevant for authenticated users)
      // Make storage key user-specific to prevent cross-user contamination
      const userSpecificStorageKey = `${ONBOARDING_STORAGE_KEY}_${currentUser.id}`;
      const storedData = await AsyncStorage.getItem(userSpecificStorageKey);
      let hasCompletedOnboarding = false;

      if (storedData) {
        const onboardingData = JSON.parse(storedData);
        
        // Check if the stored version matches current version
        hasCompletedOnboarding = onboardingData.version === ONBOARDING_VERSION && 
                                onboardingData.completed === true;
        
        console.log('🎯 📱 AsyncStorage indicates onboarding complete:', hasCompletedOnboarding);
      }

      // Check if user has a profile (important for existing users)
      let userHasProfile = false;
      console.log('🎯 Checking if user has profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        console.log('🎯 ✅ User has profile:', profile);
        userHasProfile = true;
      } else if (profileError) {
        console.log('🎯 ❌ User has no profile:', profileError);
        
        if (profileError.code === 'PGRST116') {
          console.log('🎯 💡 Profile does not exist - creating missing profile for existing user...');
          
          // For existing authenticated users, automatically create a profile
          // instead of forcing them through onboarding
          const profileCreated = await createMissingProfile();
          if (profileCreated) {
            console.log('🎯 ✅ Missing profile created successfully');
            userHasProfile = true;
          } else {
            console.log('🎯 ❌ Failed to create missing profile');
            userHasProfile = false;
          }
        } else {
          console.log('🎯 ⚠️ Unexpected profile error:', profileError);
          userHasProfile = false;
        }
      }

      // If user has a profile but hasn't completed onboarding, check if they're still in registration flow
      if (currentUser && userHasProfile && !hasCompletedOnboarding) {
        // Check if this is a new user still in onboarding flow
        const isInOnboardingFlow = currentUser.user_metadata?.in_onboarding_flow;
        
        // Check if profile was created very recently (within last 2 minutes)
        // This helps catch users who just registered but metadata hasn't synced yet
        const profileCreatedRecently = profile && profile.created_at && 
          (Date.now() - new Date(profile.created_at).getTime()) < 120000; // 2 minutes
        
        console.log('🎯 💡 User has profile but onboarding not complete:', {
          isInOnboardingFlow,
          profileCreatedRecently,
          profileCreatedAt: profile?.created_at,
          userMetadata: currentUser.user_metadata
        });
        
        if (isInOnboardingFlow) {
          console.log('🎯 💡 User is still in onboarding flow - not auto-completing');
          // Don't auto-complete - let them finish the full onboarding flow
          hasCompletedOnboarding = false;
        } else if (profileCreatedRecently) {
          console.log('🎯 💡 Profile created very recently - assuming user is still in onboarding flow');
          // Don't auto-complete for recently created profiles
          hasCompletedOnboarding = false;
        } else {
          console.log('🎯 💡 User has profile but onboarding not marked complete - auto-completing...');
          
          const onboardingData = {
            completed: true,
            version: ONBOARDING_VERSION,
            completedAt: Date.now(),
            userId: currentUser.id,
            autoCompleted: true
          };

          try {
            await AsyncStorage.setItem(userSpecificStorageKey, JSON.stringify(onboardingData));
            hasCompletedOnboarding = true;
            console.log('🎯 ✅ Onboarding auto-completed for existing user with profile');
          } catch (error) {
            console.log('🎯 ⚠️ Failed to auto-complete onboarding:', error);
          }
        }
      }

      setHasProfile(Boolean(userHasProfile));
      setIsOnboardingComplete(hasCompletedOnboarding);

      // For authenticated users: show onboarding if they haven't completed it
      // This includes users without profiles AND users with profiles who are still in onboarding flow
      const shouldShow = Boolean(currentUser && !hasCompletedOnboarding);
      setShouldShowOnboarding(shouldShow);
      setShouldContinueOnboarding(false); // Reset continue state in this path

      // Track onboarding check
      analytics.track('onboarding_status_checked', {
        timestamp: Date.now(),
        user_authenticated: !!currentUser,
        user_has_profile: userHasProfile,
        onboarding_completed: hasCompletedOnboarding,
        should_show_onboarding: shouldShow,
        onboarding_version: ONBOARDING_VERSION
      });

      console.log('🎯 Onboarding Status:', {
        completed: hasCompletedOnboarding,
        hasProfile: userHasProfile,
        shouldShow,
        userAuthenticated: !!currentUser
      });

    } catch (error: any) {
      console.error('Failed to check onboarding status:', error);
      
      // Default to showing onboarding if we can't determine status
      setIsOnboardingComplete(false);
      setShouldShowOnboarding(true);
      setHasProfile(false);
      
      analytics.track('onboarding_status_check_failed', {
        timestamp: Date.now(),
        error: error?.message || 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createMissingProfile = async (currentUser = user): Promise<boolean> => {
    if (!currentUser) {
      console.log('🎯 Cannot create profile - no user');
      return false;
    }

    try {
      console.log('🎯 Creating missing profile for user:', currentUser.id);
      
      // Create the profile with essential columns first (schema cache safe)
      const essentialProfileData = {
        id: currentUser.id,
        email: currentUser.email,
        subscription_status: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: profile, error: essentialProfileError } = await supabase
        .from('profiles')
        .insert(essentialProfileData)
        .select()
        .single();

      if (essentialProfileError) {
        console.error('🎯 Failed to create essential profile:', essentialProfileError);
        return false;
      }

      console.log('🎯 ✅ Essential profile created successfully:', profile);

      // Then update with additional columns (if they exist in schema)
      const additionalProfileData = {
        full_name: currentUser.user_metadata?.full_name || '',
        username: null,
        notifications_enabled: true,
        expiry_reminders: true,
        max_items: 20,
        updated_at: new Date().toISOString(),
      };

      const { error: additionalProfileError } = await supabase
        .from('profiles')
        .update(additionalProfileData)
        .eq('id', currentUser.id);

      if (additionalProfileError) {
        console.log('🎯 ⚠️ Additional profile fields update failed (likely schema cache issue):', additionalProfileError);
        console.log('🎯 💡 Profile still created with essential data');
        // Don't fail - profile exists with essential data
      } else {
        console.log('🎯 ✅ Full profile updated successfully');
      }

      // Try to create notification preferences (optional)
      try {
        const { data: prefs, error: prefsError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: currentUser.id,
            expiry_notifications: true,
            expiry_notification_hours: 24,
            recipe_notifications: true,
            shopping_list_notifications: true,
            household_notifications: true,
            marketing_notifications: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (prefsError) {
          console.log('🎯 ⚠️ Failed to create notification preferences:', prefsError);
        } else {
          console.log('🎯 ✅ Notification preferences created:', prefs);
        }
      } catch (error) {
        console.log('🎯 ⚠️ Notification preferences creation failed:', error);
        // Don't fail profile creation for this
      }

      // Update state immediately to prevent race conditions
      setHasProfile(true);
      
      analytics.track('missing_profile_created', {
        timestamp: Date.now(),
        user_id: currentUser.id,
        success: true
      });

      return true;
    } catch (error: any) {
      console.error('🎯 Error creating missing profile:', error);
      
      analytics.track('missing_profile_creation_failed', {
        timestamp: Date.now(),
        user_id: currentUser?.id,
        error: error?.message || 'Unknown error'
      });

      return false;
    }
  };

  const completeOnboarding = async () => {
    try {
      // If user doesn't have a profile, create it first
      if (user && !hasProfile) {
        console.log('🎯 User missing profile during onboarding completion, creating...');
        const profileCreated = await createMissingProfile();
        if (!profileCreated) {
          console.error('🎯 Failed to create profile during onboarding completion');
          // Continue anyway - user can create profile later
        }
      }

      const onboardingData = {
        completed: true,
        version: ONBOARDING_VERSION,
        completedAt: Date.now(),
        userId: user?.id || null
      };

      // Set state and ref immediately to prevent race conditions
      hasCompletedOnboardingRef.current = true;
      setIsOnboardingComplete(true);
      setShouldShowOnboarding(false);
      setShouldContinueOnboarding(false);

      // Then persist to storage (user-specific)
      const userSpecificStorageKey = `${ONBOARDING_STORAGE_KEY}_${user?.id}`;
      await AsyncStorage.setItem(userSpecificStorageKey, JSON.stringify(onboardingData));

      analytics.track('onboarding_completed_by_context', {
        timestamp: Date.now(),
        user_authenticated: !!user,
        user_has_profile: hasProfile,
        onboarding_version: ONBOARDING_VERSION
      });

      console.log('✅ Onboarding completed and saved');
    } catch (error: any) {
      console.error('Failed to save onboarding completion:', error);
      
      // If saving fails, revert the state
      hasCompletedOnboardingRef.current = false;
      setIsOnboardingComplete(false);
      setShouldShowOnboarding(true);
      
      analytics.track('onboarding_completion_save_failed', {
        timestamp: Date.now(),
        error: error?.message || 'Unknown error'
      });
    }
  };

  const skipOnboarding = async () => {
    try {
      // If user doesn't have a profile, create it first
      if (user && !hasProfile) {
        console.log('🎯 User missing profile during onboarding skip, creating...');
        const profileCreated = await createMissingProfile();
        if (!profileCreated) {
          console.error('🎯 Failed to create profile during onboarding skip');
          // Continue anyway - user can create profile later
        }
      }

      const onboardingData = {
        completed: true,
        version: ONBOARDING_VERSION,
        completedAt: Date.now(),
        skipped: true,
        userId: user?.id || null
      };

      // Set state immediately to prevent race conditions
      setIsOnboardingComplete(true);
      setShouldShowOnboarding(false);
      setShouldContinueOnboarding(false);

      // Then persist to storage (user-specific)
      const userSpecificStorageKey = `${ONBOARDING_STORAGE_KEY}_${user?.id}`;
      await AsyncStorage.setItem(userSpecificStorageKey, JSON.stringify(onboardingData));

      analytics.track('onboarding_skipped_by_context', {
        timestamp: Date.now(),
        user_authenticated: !!user,
        user_has_profile: hasProfile,
        onboarding_version: ONBOARDING_VERSION
      });

      console.log('⏭️ Onboarding skipped and saved');
    } catch (error: any) {
      console.error('Failed to save onboarding skip:', error);
      
      // If saving fails, revert the state
      setIsOnboardingComplete(false);
      setShouldShowOnboarding(true);
      
      analytics.track('onboarding_skip_save_failed', {
        timestamp: Date.now(),
        error: error?.message || 'Unknown error'
      });
    }
  };

  const resetOnboarding = async () => {
    try {
      // Reset for current user if they exist
      if (user?.id) {
        const userSpecificStorageKey = `${ONBOARDING_STORAGE_KEY}_${user.id}`;
        await AsyncStorage.removeItem(userSpecificStorageKey);
      }
      
      // Also reset the generic key for backward compatibility
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      
      // Reset the cache and state
      hasCompletedOnboardingRef.current = false;
      setIsOnboardingComplete(false);
      setShouldShowOnboarding(true);
      setShouldContinueOnboarding(false);

      analytics.track('onboarding_reset', {
        timestamp: Date.now(),
        user_authenticated: !!user
      });

      console.log('🔄 Onboarding reset');
    } catch (error: any) {
      console.error('Failed to reset onboarding:', error);
      
      analytics.track('onboarding_reset_failed', {
        timestamp: Date.now(),
        error: error?.message || 'Unknown error'
      });
    }
  };

  const refreshOnboardingStatus = async () => {
    console.log('🎯 Manually refreshing onboarding status...');
    await checkOnboardingStatus(user);
  };

  const value: OnboardingContextType = {
    isOnboardingComplete,
    shouldShowOnboarding,
    isLoading,
    hasProfile,
    shouldContinueOnboarding,
    completeOnboarding,
    resetOnboarding,
    skipOnboarding,
    createMissingProfile,
    refreshOnboardingStatus,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}; 