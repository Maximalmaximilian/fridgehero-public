import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { stripeService } from '../lib/stripe';

interface Household {
  household_id: string;
  households: {
    id: string;
    name: string;
    invite_code: string;
    max_members: number;
    created_at: string;
    created_by: string;
  };
  role: 'owner' | 'member';
}

interface HouseholdContextType {
  households: Household[];
  selectedHousehold: Household | null;
  loading: boolean;
  selectHousehold: (household: Household) => void;
  refreshHouseholds: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};

interface HouseholdProviderProps {
  children: ReactNode;
}

export const HouseholdProvider: React.FC<HouseholdProviderProps> = ({ children }) => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (user) {
      retryCountRef.current = 0; // Reset retry count when user changes
      fetchHouseholds();
    } else {
      setHouseholds([]);
      setSelectedHousehold(null);
      setLoading(false);
      retryCountRef.current = 0;
    }
  }, [user]);

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      console.log('🏠 Fetching households for user:', user?.id);

      const { data: userHouseholds, error } = await supabase
        .from('household_members')
        .select(`
          household_id,
          role,
          is_active,
          households!inner (
            id,
            name,
            invite_code,
            max_members,
            created_at,
            created_by
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true) // Only fetch active households
        .order('role', { ascending: false }); // owners first

      if (error) {
        console.error('Error fetching households:', error);
        return;
      }

      if (userHouseholds && userHouseholds.length > 0) {
        console.log('🏠 Found active households:', userHouseholds.length);
        retryCountRef.current = 0; // Reset retry count on success
        
        // Transform the data to match our interface
        const transformedHouseholds: Household[] = userHouseholds.map((item: any) => ({
          household_id: item.household_id,
          role: item.role,
          households: item.households
        }));
        
        setHouseholds(transformedHouseholds);
        
        // Auto-select first household if none selected
        if (!selectedHousehold) {
          setSelectedHousehold(transformedHouseholds[0]);
          console.log('🏠 Auto-selected household:', transformedHouseholds[0].households.name);
        }
      } else {
        console.log('🏠 No active households found, checking onboarding status...');
        
        // Check if user is currently in onboarding flow
        const isInOnboardingFlow = user?.user_metadata?.in_onboarding_flow;
        const onboardingChoice = user?.user_metadata?.onboarding_household_choice;
        
        if (isInOnboardingFlow) {
          console.log('🏠 User is in onboarding flow - not creating default household, let them complete onboarding');
          // Don't create default household - let user complete onboarding properly
          return;
        }
        
        // CRITICAL: For newly registered users, also check if they don't have onboarding_completed metadata yet
        // This prevents auto-creating households for users who just registered
        const hasCompletedOnboarding = user?.user_metadata?.onboarding_completed;
        
        if (!hasCompletedOnboarding) {
          console.log('🏠 User has not completed onboarding yet - not creating default household');
          // Don't create default household - let user complete onboarding first
          return;
        }
        
        if (onboardingChoice) {
          console.log('🏠 Found onboarding choice:', onboardingChoice);
          
          if (onboardingChoice.choice === 'skipped') {
            console.log('🏠 User skipped household setup, creating default household');
            await createDefaultHousehold();
          } else if (onboardingChoice.choice === 'created' || onboardingChoice.choice === 'joined') {
            console.log('🏠 User already handled household during onboarding...');
            
            // Only retry if we haven't exceeded max retries
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current += 1;
              console.log(`🏠 Retrying household fetch (attempt ${retryCountRef.current}/${maxRetries}) after onboarding...`);
              
              setTimeout(() => {
                fetchHouseholds();
              }, 2000 * retryCountRef.current); // Increasing delay: 2s, 4s, 6s
            } else {
              console.log('🏠 Max retries reached, stopping household fetch attempts');
              console.log('🏠 Creating default household as fallback after max retries');
              await createDefaultHousehold();
            }
          }
        } else {
          console.log('🏠 No onboarding choice found and user not in onboarding flow, creating default household');
          await createDefaultHousehold();
        }
      }
    } catch (error) {
      console.error('Error in fetchHouseholds:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultHousehold = async () => {
    try {
      console.log('🏠 Creating default household for user');
      
      // Check premium status to set appropriate member limit
      const premiumStatus = await stripeService.getSubscriptionStatus();
      const maxMembers = premiumStatus.isActive ? 20 : 5;
      
      const { data: newHousehold, error: householdError } = await supabase
        .from('households')
        .insert([{
          name: 'My Kitchen',
          created_by: user?.id,
          max_members: maxMembers,
        }])
        .select()
        .single();

      if (householdError) {
        console.error('Error creating household:', householdError);
        return;
      }

      const { error: memberError } = await supabase
        .from('household_members')
        .insert([{
          household_id: newHousehold.id,
          user_id: user?.id,
          role: 'owner'
        }]);

      if (memberError) {
        console.error('Error adding user to household:', memberError);
        return;
      }

      console.log('🏠 Default household created successfully with max_members:', maxMembers);
      
      // Reset retry count and fetch households one more time after creation
      retryCountRef.current = 0;
      await fetchHouseholds();
    } catch (error) {
      console.error('Error creating default household:', error);
    }
  };

  const selectHousehold = (household: Household) => {
    console.log('🏠 Switching to household:', household.households.name);
    setSelectedHousehold(household);
  };

  const refreshHouseholds = async () => {
    await fetchHouseholds();
  };

  const value: HouseholdContextType = {
    households,
    selectedHousehold,
    loading,
    selectHousehold,
    refreshHouseholds,
  };

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
}; 