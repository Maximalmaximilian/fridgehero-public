import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

interface HouseholdInvitation {
  id: string;
  household_id: string;
  invited_by: string;
  invited_email: string;
  message: string;
  status: string;
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

interface HouseholdInvitationBannerProps {
  onInvitationHandled?: () => void;
}

export default function HouseholdInvitationBanner({ onInvitationHandled }: HouseholdInvitationBannerProps) {
  const [pendingInvitations, setPendingInvitations] = useState<HouseholdInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      fetchPendingInvitations();
      
      // Set up real-time subscription for invitations
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
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchPendingInvitations = async () => {
    try {
      setLoading(true);
      console.log('🔔 HouseholdInvitationBanner: Fetching invitations for user:', user?.id);
      
      // Get current user's email from their profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      if (!userProfile?.email) {
        console.log('No email found for user');
        setPendingInvitations([]);
        return;
      }

      console.log('🔔 User email found:', userProfile.email);

      // Debug logging - let's see exactly what we're querying for
      console.log('🔍 HouseholdInvitationBanner Debug query params:', {
        userId: user?.id,
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

      console.log('🔔 HouseholdInvitationBanner Raw ALL invitations query result:', { data: allInvitations, error });

      if (error) {
        console.error('Error fetching invitations:', error);
        return;
      }

      // Filter invitations that match this user (by user_id or email)
      const invitations = allInvitations?.filter(invitation => 
        invitation.invited_user_id === user?.id || 
        invitation.invited_email === userProfile.email
      ) || [];

      console.log('🔍 HouseholdInvitationBanner Filtered invitations for user:', {
        totalInvitations: allInvitations?.length || 0,
        matchingInvitations: invitations.length,
        userMatches: invitations.filter(inv => inv.invited_user_id === user?.id).length,
        emailMatches: invitations.filter(inv => inv.invited_email === userProfile.email).length
      });

      if (!invitations || invitations.length === 0) {
        console.log('🔔 HouseholdInvitationBanner: No pending invitations found');
        setPendingInvitations([]);
        return;
      }

      console.log('🔔 HouseholdInvitationBanner: Found pending invitations:', invitations.length);

      // Now fetch household information separately for the invitations we found
      const householdIds = [...new Set(invitations.map(inv => inv.household_id))];
      console.log('🏠 Fetching household data for IDs:', householdIds);
      
      const { data: households, error: householdsError } = await supabase
        .from('households')
        .select('id, name, max_members, created_by')
        .in('id', householdIds);

      if (householdsError) {
        console.error('Error fetching household data:', householdsError);
        // Continue without household data rather than failing completely
      }

      console.log('🏠 Fetched household data:', households);

      // Fetch inviter profiles
      const inviterIds = [...new Set(invitations.map(inv => inv.invited_by))];
      console.log('🔔 Fetching profiles for inviter IDs:', inviterIds);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, email')
        .in('id', inviterIds);

      if (profilesError) {
        console.error('Error fetching inviter profiles:', profilesError);
      }

      console.log('🔔 Inviter profiles:', profiles);

      // Combine invitations with household and profile data
      const invitationsWithProfiles = invitations
        .map(invitation => {
          // Find household data
          const householdData = households?.find(h => h.id === invitation.household_id);
          
          // Skip invitations where household is missing (deleted household or RLS issues)
          if (!householdData) {
            console.log('Skipping invitation with missing/inaccessible household:', invitation.id);
            return null;
          }

          return {
            ...invitation,
            household: householdData,
            inviter_profile: profiles?.find(p => p.id === invitation.invited_by) || {
              full_name: 'Unknown User',
              username: 'unknown',
              email: 'unknown',
            }
          };
        })
        .filter(Boolean) as HouseholdInvitation[]; // Remove null entries

      console.log('🔔 Processed invitations with profiles:', invitationsWithProfiles);
      setPendingInvitations(invitationsWithProfiles);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      setProcessing(invitationId);
      
      const functionName = action === 'accept' 
        ? 'accept_household_invitation' 
        : 'decline_household_invitation';
      
      const { data, error } = await supabase.rpc(functionName, {
        invitation_id: invitationId
      });

      if (error) {
        console.error(`Error ${action}ing invitation:`, error);
        Alert.alert('Error', `Failed to ${action} invitation. Please try again.`);
        return;
      }

      if (data && !data.success) {
        Alert.alert('Error', data.error || `Failed to ${action} invitation.`);
        return;
      }

      Alert.alert(
        'Success', 
        action === 'accept' 
          ? 'You have successfully joined the household!' 
          : 'Invitation declined.',
        [{ text: 'OK', onPress: () => {
          fetchPendingInvitations();
          onInvitationHandled?.();
        }}]
      );
      
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const renderInvitation = (invitation: HouseholdInvitation, index: number) => {
    const isFirst = index === 0;
    const isProcessing = processing === invitation.id;
    const daysUntilExpiry = Math.ceil(
      (new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Additional safety check
    if (!invitation.household || !invitation.household.name) {
      console.error('Household data missing for invitation:', invitation.id);
      return null;
    }
    
    return (
      <View 
        key={invitation.id} 
        style={[
          styles.invitationCard,
          { 
            backgroundColor: theme.cardBackground, 
            borderColor: isFirst ? designTokens.colors.heroGreen : theme.borderPrimary,
            borderWidth: isFirst ? 2 : 1,
          }
        ]}
      >
        <LinearGradient
          colors={isFirst ? [designTokens.colors.heroGreen, designTokens.colors.green[600]] : ['transparent', 'transparent']}
          style={[styles.cardGradient, isFirst && styles.firstCardGradient]}
        >
          <View style={styles.invitationHeader}>
            <View style={styles.invitationIcon}>
              <Ionicons 
                name="home" 
                size={20} 
                color={isFirst ? designTokens.colors.pureWhite : designTokens.colors.heroGreen} 
              />
            </View>
            <View style={styles.invitationInfo}>
              <Text style={[
                styles.invitationTitle, 
                { color: isFirst ? designTokens.colors.pureWhite : theme.textPrimary }
              ]}>
                Household Invitation
              </Text>
              <Text style={[
                styles.invitationSubtitle, 
                { color: isFirst ? designTokens.colors.pureWhite : theme.textSecondary }
              ]}>
                {invitation.inviter_profile.full_name || invitation.inviter_profile.username || 'Someone'} invited you to join "{invitation.household.name}"
              </Text>
            </View>
            {daysUntilExpiry <= 1 && (
              <View style={styles.urgentBadge}>
                <Ionicons name="time" size={12} color={designTokens.colors.expiredRed} />
                <Text style={styles.urgentText}>
                  {daysUntilExpiry === 0 ? 'Today' : `${daysUntilExpiry}d`}
                </Text>
              </View>
            )}
          </View>
          
          {invitation.message && (
            <Text style={[
              styles.invitationMessage, 
              { color: isFirst ? designTokens.colors.pureWhite : theme.textSecondary }
            ]}>
              "{invitation.message}"
            </Text>
          )}
          
          <View style={styles.invitationActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.declineButton,
                { backgroundColor: isFirst ? 'rgba(255,255,255,0.2)' : theme.bgTertiary }
              ]}
              onPress={() => handleInvitation(invitation.id, 'decline')}
              disabled={isProcessing}
            >
              {isProcessing && processing === invitation.id ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <>
                  <Ionicons 
                    name="close" 
                    size={16} 
                    color={isFirst ? designTokens.colors.pureWhite : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.actionButtonText,
                    { color: isFirst ? designTokens.colors.pureWhite : theme.textSecondary }
                  ]}>
                    Decline
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.acceptButton,
                { backgroundColor: isFirst ? designTokens.colors.pureWhite : designTokens.colors.heroGreen }
              ]}
              onPress={() => handleInvitation(invitation.id, 'accept')}
              disabled={isProcessing}
            >
              {isProcessing && processing === invitation.id ? (
                <ActivityIndicator size="small" color={designTokens.colors.pureWhite} />
              ) : (
                <>
                  <Ionicons 
                    name="checkmark" 
                    size={16} 
                    color={isFirst ? designTokens.colors.heroGreen : designTokens.colors.pureWhite} 
                  />
                  <Text style={[
                    styles.actionButtonText,
                    { color: isFirst ? designTokens.colors.heroGreen : designTokens.colors.pureWhite }
                  ]}>
                    Accept
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgSecondary }]}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Checking for invitations...
        </Text>
      </View>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  const displayedInvitations = showAll ? pendingInvitations : pendingInvitations.slice(0, 2);
  const hasMore = pendingInvitations.length > 2;

  return (
    <View style={styles.container}>
      {displayedInvitations.map((invitation, index) => renderInvitation(invitation, index))}
      
      {hasMore && !showAll && (
        <TouchableOpacity
          style={[styles.showMoreButton, { backgroundColor: theme.bgTertiary }]}
          onPress={() => setShowAll(true)}
        >
          <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          <Text style={[styles.showMoreText, { color: theme.textSecondary }]}>
            Show {pendingInvitations.length - 2} more invitation{pendingInvitations.length - 2 > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      )}
      
      {showAll && hasMore && (
        <TouchableOpacity
          style={[styles.showMoreButton, { backgroundColor: theme.bgTertiary }]}
          onPress={() => setShowAll(false)}
        >
          <Ionicons name="chevron-up" size={16} color={theme.textSecondary} />
          <Text style={[styles.showMoreText, { color: theme.textSecondary }]}>
            Show less
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  invitationCard: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    padding: 16,
  },
  firstCardGradient: {
    // Special styling for the first card is handled via conditional colors
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  invitationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  invitationSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: designTokens.colors.red[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.red[200],
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.expiredRed,
    fontFamily: 'Inter',
  },
  invitationMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  declineButton: {
    // Styled via backgroundColor in component
  },
  acceptButton: {
    // Styled via backgroundColor in component
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
}); 