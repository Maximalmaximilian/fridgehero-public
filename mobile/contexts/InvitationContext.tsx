import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { notificationService } from '../lib/notifications';

interface HouseholdInvitation {
  id: string;
  household_id: string;
  invited_by: string;
  invited_email: string;
  invited_user_id?: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  household: {
    id: string;
    name: string;
    max_members: number;
    created_by: string;
  };
  inviter_profile: {
    full_name: string;
    username: string;
    email: string;
  };
}

interface InvitationContextType {
  pendingInvitations: HouseholdInvitation[];
  pendingCount: number;
  loading: boolean;
  hasNewInvitations: boolean;
  refreshInvitations: () => Promise<void>;
  markInvitationsAsViewed: () => void;
  acceptInvitation: (invitationId: string) => Promise<boolean>;
  declineInvitation: (invitationId: string) => Promise<boolean>;
  showInvitationPopup: (invitation: HouseholdInvitation) => void;
}

const InvitationContext = createContext<InvitationContextType | undefined>(undefined);

export function useInvitations() {
  const context = useContext(InvitationContext);
  if (context === undefined) {
    throw new Error('useInvitations must be used within an InvitationProvider');
  }
  return context;
}

interface InvitationProviderProps {
  children: React.ReactNode;
}

export function InvitationProvider({ children }: InvitationProviderProps) {
  const [pendingInvitations, setPendingInvitations] = useState<HouseholdInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewInvitations, setHasNewInvitations] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const lastCheckTimeRef = useRef<Date | null>(null);
  const isInitialFetch = useRef(true);
  
  const { user } = useAuth();

  const fetchPendingInvitations = useCallback(async () => {
    if (!user) {
      setPendingInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔔 InvitationContext: Fetching invitations for user:', user.id);
      
      // Get current user's email from their profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        return;
      }

      if (!userProfile?.email) {
        console.log('⚠️ No email found for user');
        setPendingInvitations([]);
        return;
      }

      console.log('✅ User email found:', userProfile.email);

      // Debug logging - let's see exactly what we're querying for
      console.log('🔍 Debug query params:', {
        userId: user.id,
        userEmail: userProfile.email,
        currentTime: new Date().toISOString()
      });

      // Fetch pending invitations for this user
      // Fetch invitations first WITHOUT household JOIN to avoid RLS issues
      const { data: allInvitations, error } = await supabase
        .from('household_invitations')
        .select(`
          id,
          household_id,
          invited_by,
          invited_email,
          invited_user_id,
          message,
          status,
          expires_at,
          created_at
        `)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      console.log('🔔 InvitationContext Raw ALL invitations query result:', { data: allInvitations, error });

      if (error) {
        console.error('Error fetching invitations:', error);
        return;
      }

      // Filter invitations that match this user (by user_id or email)
      const invitations = allInvitations?.filter(invitation => 
        invitation.invited_user_id === user.id || 
        invitation.invited_email === userProfile.email
      ) || [];

      console.log('🔍 InvitationContext Filtered invitations for user:', {
        totalInvitations: allInvitations?.length || 0,
        matchingInvitations: invitations.length,
        userMatches: invitations.filter(inv => inv.invited_user_id === user.id).length,
        emailMatches: invitations.filter(inv => inv.invited_email === userProfile.email).length
      });

      if (!invitations || invitations.length === 0) {
        console.log('🔔 InvitationContext: No pending invitations found');
        setPendingInvitations([]);
        return;
      }

      console.log('🔔 InvitationContext: Found pending invitations:', invitations.length);

      // Now fetch household information separately for the invitations we found
      const householdIds = [...new Set(invitations.map(inv => inv.household_id))];
      console.log('🏠 InvitationContext: Fetching household data for IDs:', householdIds);
      
      const { data: households, error: householdsError } = await supabase
        .from('households')
        .select('id, name, max_members, created_by')
        .in('id', householdIds);

      if (householdsError) {
        console.error('InvitationContext: Error fetching household data:', householdsError);
        // Continue without household data rather than failing completely
      }

      console.log('🏠 InvitationContext: Fetched household data:', households);

      // Combine invitations with household data
      const validInvitations: HouseholdInvitation[] = invitations
        .map(invitation => {
          // Find household data
          const householdData = households?.find(h => h.id === invitation.household_id);
          
          // Skip invitations where household is missing (deleted household or RLS issues)
          if (!householdData) {
            console.log('InvitationContext: Skipping invitation with missing/inaccessible household:', invitation.id);
            return null;
          }

          return {
            ...invitation,
            household: householdData,
            inviter_profile: {
              full_name: 'Unknown User',
              username: 'unknown',
              email: 'unknown',
            }
          } as HouseholdInvitation;
        })
        .filter(Boolean) as HouseholdInvitation[];

      console.log('🔔 InvitationContext: Valid invitations with household data:', validInvitations.length);
      setPendingInvitations(validInvitations);

      // Check for new invitations (created after last check) - but only after initial fetch
      if (!isInitialFetch.current && lastCheckTimeRef.current) {
        const newInvitations = validInvitations.filter(inv => new Date(inv.created_at) > lastCheckTimeRef.current!);

        if (newInvitations.length > 0) {
          console.log('🔔 New invitations detected:', newInvitations.length);
          setHasNewInvitations(true);
          
          // Show notification for the first new invitation
          const firstInvitation = newInvitations[0];
          showInvitationNotification(firstInvitation);
        }
      }

      // Update last check time
      const now = new Date();
      lastCheckTimeRef.current = now;
      setLastCheckTime(now);
      isInitialFetch.current = false;
    } catch (error) {
      console.error('❌ Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]); // Removed lastCheckTime dependency to prevent infinite loop

  const showInvitationNotification = async (invitation: HouseholdInvitation) => {
    // Show popup notification for invitation
    const householdName = invitation.household?.name || 'Unknown Household';
    const inviterName = invitation.inviter_profile?.full_name || invitation.inviter_profile?.username || 'Someone';
    const message = invitation.message;

    Alert.alert(
      '🏠 Household Invitation',
      `${inviterName} invited you to join "${householdName}"${message ? `\n\n"${message}"` : ''}`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => declineInvitation(invitation.id)
        },
        {
          text: 'Accept',
          style: 'default',
          onPress: () => acceptInvitation(invitation.id)
        }
      ]
    );
  };

  const acceptInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      console.log('✅ Accepting invitation:', invitationId);
      
      const { data, error } = await supabase.rpc('accept_household_invitation', {
        invitation_id: invitationId
      });

      if (error) {
        console.error('❌ Error accepting invitation:', error);
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
        return false;
      }

      if (data && !data.success) {
        Alert.alert('Error', data.error || 'Failed to accept invitation.');
        return false;
      }

      Alert.alert(
        'Success! 🎉', 
        'You have successfully joined the household!',
        [{ text: 'OK', onPress: () => refreshInvitations() }]
      );
      
      await refreshInvitations();
      return true;
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return false;
    }
  };

  const declineInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      console.log('❌ Declining invitation:', invitationId);
      
      const { data, error } = await supabase.rpc('decline_household_invitation', {
        invitation_id: invitationId
      });

      if (error) {
        console.error('❌ Error declining invitation:', error);
        Alert.alert('Error', 'Failed to decline invitation. Please try again.');
        return false;
      }

      if (data && !data.success) {
        Alert.alert('Error', data.error || 'Failed to decline invitation.');
        return false;
      }

      Alert.alert(
        'Invitation Declined', 
        'You have declined this invitation.',
        [{ text: 'OK', onPress: () => refreshInvitations() }]
      );
      
      await refreshInvitations();
      return true;
    } catch (error) {
      console.error('❌ Error declining invitation:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return false;
    }
  };

  const showInvitationPopup = (invitation: HouseholdInvitation) => {
    const inviterName = invitation.inviter_profile.full_name || invitation.inviter_profile.username || 'Someone';
    const householdName = invitation.household.name;
    const message = invitation.message;

    Alert.alert(
      '🏠 Household Invitation',
      `${inviterName} invited you to join "${householdName}"${message ? `\n\n"${message}"` : ''}`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => declineInvitation(invitation.id)
        },
        {
          text: 'Accept',
          style: 'default',
          onPress: () => acceptInvitation(invitation.id)
        }
      ]
    );
  };

  const markInvitationsAsViewed = () => {
    setHasNewInvitations(false);
  };

  const refreshInvitations = useCallback(async () => {
    await fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  // Set up real-time subscription for invitations
  useEffect(() => {
    if (!user) return;

    fetchPendingInvitations();

    console.log('🔔 Setting up real-time subscription for invitations');
    const subscription = supabase
      .channel('household_invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'household_invitations',
        filter: `invited_user_id=eq.${user.id}`,
      }, (payload) => {
        console.log('🔔 Invitation change detected:', payload);
        fetchPendingInvitations();
      })
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up invitation subscription');
      subscription.unsubscribe();
    };
  }, [user, fetchPendingInvitations]);

  // Periodic check for invitations (every 30 minutes when app is active)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      console.log('🔔 Periodic invitation check (30 min interval)');
      fetchPendingInvitations();
    }, 1800000); // Check every 30 minutes instead of 5 minutes

    return () => clearInterval(interval);
  }, [user, fetchPendingInvitations]);

  const value: InvitationContextType = {
    pendingInvitations,
    pendingCount: pendingInvitations.length,
    loading,
    hasNewInvitations,
    refreshInvitations,
    markInvitationsAsViewed,
    acceptInvitation,
    declineInvitation,
    showInvitationPopup,
  };

  return (
    <InvitationContext.Provider value={value}>
      {children}
    </InvitationContext.Provider>
  );
}