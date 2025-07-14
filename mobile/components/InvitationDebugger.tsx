import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function InvitationDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();

  const checkInvitations = async () => {
    try {
      console.log('🔍 Starting invitation debug check...');
      
      // Get user profile
      console.log('🔍 Fetching user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('🔍 Profile result:', { data: profile, error: profileError });

      // Get all invitations for this user (multiple queries for debugging)
      console.log('🔍 Fetching invitations by user_id...');
      const { data: invitationsByUserId, error: userIdError } = await supabase
        .from('household_invitations')
        .select(`
          *,
          households (*)
        `)
        .eq('invited_user_id', user?.id);

      console.log('🔍 Invitations by user_id:', { data: invitationsByUserId, error: userIdError });

      let invitationsByEmail = null;
      let emailError = null;
      if (profile?.email) {
        console.log('🔍 Fetching invitations by email:', profile.email);
        const result = await supabase
          .from('household_invitations')
          .select(`
            *,
            households (*)
          `)
          .eq('invited_email', profile.email);
        
        invitationsByEmail = result.data;
        emailError = result.error;
        console.log('🔍 Invitations by email:', { data: invitationsByEmail, error: emailError });
      }

      // Get all pending invitations (broader search)
      console.log('🔍 Fetching all pending invitations...');
      const { data: allPendingInvitations, error: pendingError } = await supabase
        .from('household_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log('🔍 All pending invitations:', { data: allPendingInvitations, error: pendingError });

      // Get all invitations (for debugging)
      console.log('🔍 Fetching recent invitations...');
      const { data: allInvitations, error: allError } = await supabase
        .from('household_invitations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('🔍 Recent invitations:', { data: allInvitations, error: allError });

      // Test the exact query used by HouseholdInvitationBanner
      let bannerQueryResult = null;
      let bannerQueryError = null;
      if (profile?.email) {
        console.log('🔍 Testing banner query...');
        const result = await supabase
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
            created_at,
            households (
              id,
              name,
              max_members,
              created_by
            )
          `)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
        
        // Filter invitations that match this user (by user_id or email)
        const filteredResult = result.data?.filter(invitation => 
          invitation.invited_user_id === user?.id || 
          invitation.invited_email === profile.email
        ) || [];
        
        bannerQueryResult = filteredResult;
        bannerQueryError = result.error;
        console.log('🔍 Banner query result (filtered):', { data: bannerQueryResult, error: bannerQueryError });
      }

      // Check if household_invitations table exists and permissions
      console.log('🔍 Testing table access...');
      const { data: tableTest, error: tableError } = await supabase
        .from('household_invitations')
        .select('count(*)', { count: 'exact', head: true });

      console.log('🔍 Table access test:', { count: tableTest, error: tableError });

      setDebugInfo({
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        user_email: profile?.email,
        user_profile: profile,
        profile_error: profileError,
        
        invitations_by_user_id: invitationsByUserId,
        user_id_error: userIdError,
        
        invitations_by_email: invitationsByEmail,
        email_error: emailError,
        
        banner_query_result: bannerQueryResult,
        banner_query_error: bannerQueryError,
        
        all_pending_invitations: allPendingInvitations,
        pending_error: pendingError,
        
        recent_invitations: allInvitations,
        recent_error: allError,
        
        table_access_test: {
          count: tableTest,
          error: tableError
        }
      });
    } catch (error) {
      console.error('🔍 Debug error:', error);
      setDebugInfo({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (!showDebug) {
    return (
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: theme.bgTertiary }]}
        onPress={() => setShowDebug(true)}
      >
        <Text style={[styles.debugButtonText, { color: theme.textSecondary }]}>
          🔍 Debug Invitations
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.debugContainer, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.debugHeader}>
        <Text style={[styles.debugTitle, { color: theme.textPrimary }]}>
          Invitation Debug Info
        </Text>
        <TouchableOpacity onPress={() => setShowDebug(false)}>
          <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: theme.bgTertiary }]}
        onPress={checkInvitations}
      >
        <Text style={[styles.refreshText, { color: theme.textPrimary }]}>🔄 Refresh</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: 'orange' }]}
        onPress={async () => {
          try {
            console.log('🧪 Creating test invitation...');
            
            // Get user profile first
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', user?.id)
              .single();
            
            if (!profile?.email) {
              console.log('❌ No email found for user');
              alert('❌ No email found for user');
              return;
            }
            
            // Find a household where this user is an owner
            const { data: ownedHouseholds, error: householdError } = await supabase
              .from('household_members')
              .select(`
                household_id,
                role,
                households!inner (
                  id,
                  name
                )
              `)
              .eq('user_id', user?.id)
              .eq('role', 'owner');
            
            console.log('🧪 Owned households:', { data: ownedHouseholds, error: householdError });
            
            if (householdError) {
              alert(`❌ Error finding households: ${householdError.message}`);
              return;
            }
            
            if (!ownedHouseholds || ownedHouseholds.length === 0) {
              alert('❌ You must be an owner of a household to create invitations');
              return;
            }
            
            const firstHousehold = ownedHouseholds[0];
            console.log('🧪 Using household for test:', firstHousehold);
            
            // Create a test invitation to your own email (which should be filtered out in real queries)
            const { data, error } = await supabase
              .from('household_invitations')
              .insert({
                household_id: firstHousehold.household_id,
                invited_by: user?.id,
                invited_email: profile.email,
                message: 'Test invitation - should be visible in debug',
                status: 'pending'
              })
              .select();
            
            console.log('🧪 Test invitation result:', { data, error });
            
            if (error) {
              alert(`❌ Test failed: ${error.message}`);
            } else {
              alert('✅ Test invitation created! Check debug info.');
              checkInvitations();
            }
          } catch (error) {
            console.error('🧪 Test error:', error);
            alert(`❌ Test error: ${error}`);
          }
        }}
      >
        <Text style={[styles.refreshText, { color: 'white' }]}>🧪 Test Create</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: 'purple' }]}
        onPress={async () => {
          try {
            console.log('🔍 Checking household ownership...');
            
            // Check all household memberships for this user
            const { data: memberships, error } = await supabase
              .from('household_members')
              .select(`
                household_id,
                role,
                households!inner (
                  id,
                  name,
                  created_by
                )
              `)
              .eq('user_id', user?.id);
            
            console.log('🔍 User memberships:', { data: memberships, error });
            
            if (error) {
              alert(`❌ Error: ${error.message}`);
              return;
            }
            
            const ownershipInfo = memberships?.map(m => {
              const household = Array.isArray(m.households) ? m.households[0] : m.households;
              return {
                household_name: household?.name || 'Unknown',
                role: m.role,
                is_creator: household?.created_by === user?.id
              };
            });
            
            alert(`🏠 Your households:\n${JSON.stringify(ownershipInfo, null, 2)}`);
          } catch (error) {
            console.error('🔍 Error:', error);
            alert(`❌ Error: ${error}`);
          }
        }}
      >
        <Text style={[styles.refreshText, { color: 'white' }]}>🏠 Check Ownership</Text>
      </TouchableOpacity>

      {debugInfo && (
        <ScrollView style={styles.debugContent} showsVerticalScrollIndicator={true}>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  debugContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    maxHeight: 400,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    zIndex: 1000,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 18,
    padding: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '500',
  },
  debugContent: {
    maxHeight: 300,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
}); 