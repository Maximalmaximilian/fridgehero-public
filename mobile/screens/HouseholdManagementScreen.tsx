import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  Switch,
  Clipboard,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';
import { stripeService } from '../lib/stripe';
import ProfileAvatar from '../components/ProfileAvatar';

interface HouseholdMember {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile: {
    username: string;
    full_name: string;
    avatar_url: string;
    email?: string; // Optional, only available to owners
  };
}

interface HouseholdSettings {
  id: string;
  name: string;
  invite_code: string;
  max_members: number;
  created_at: string;
  created_by: string;
  auto_cleanup_enabled: boolean;
  auto_cleanup_days: number;
  notification_preferences: any;
}

export default function HouseholdManagementScreen({ navigation, route }: any) {
  const { householdId, householdName, inviteCode } = route.params;
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [settings, setSettings] = useState<HouseholdSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(householdName);
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'stats'>('members');
  const [isPremium, setIsPremium] = useState(false);
  const [householdStats, setHouseholdStats] = useState({
    totalItems: 0,
    activeMembers: 0,
    itemsAddedThisWeek: 0,
    wasteReduced: 0,
  });

  const { user } = useAuth();
  const { theme } = useTheme();
  const { refreshHouseholds } = useHousehold();

  useEffect(() => {
    if (user && householdId) {
      checkPremiumStatus();
      fetchHouseholdData();
    }
  }, [user, householdId]);

  const checkPremiumStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    }
  };

  const fetchHouseholdData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMembers(),
        fetchSettings(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Error fetching household data:', error);
      Alert.alert('Error', 'Failed to load household data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMembers = async () => {
    try {
      console.log('📱 Fetching members for household:', householdId);
      
      // Use the new SQL function for better security and GDPR compliance
      const { data, error } = await supabase.rpc('get_household_members', {
        household_id_param: householdId
      });

      if (error) {
        console.error('Error fetching members:', error);
        // If the function doesn't exist, fall back to direct query
        if (error.code === 'PGRST202') {
          console.log('📱 SQL function not found, using fallback query...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('household_members')
            .select(`
              user_id,
              role,
              joined_at,
              profiles!inner (
                username,
                full_name,
                avatar_url,
                email
              )
            `)
            .eq('household_id', householdId);

          if (fallbackError) {
            throw fallbackError;
          }

          // Transform fallback data to match expected structure
          const transformedData = fallbackData?.map((member: any) => ({
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            profile: {
              username: member.profiles.username,
              full_name: member.profiles.full_name,
              avatar_url: member.profiles.avatar_url,
              email: member.profiles.email // Only show if current user is owner
            }
          })) || [];

          setMembers(transformedData);
          return;
        }
        throw error;
      }

      console.log('📱 Found members:', data?.length || 0);
      
      // Transform SQL function data to match interface
      const transformedMembers = data?.map((member: any) => ({
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profile: {
          username: member.username,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          email: member.email // Only available to owners
        }
      })) || [];

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      Alert.alert('Error', 'Failed to load household members');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }

      setSettings(data);
      setNewName(data.name);
    } catch (error) {
      console.error('Error in fetchSettings:', error);
      throw error;
    }
  };

  const fetchStats = async () => {
    try {
      // Get total items count
      const { count: totalItems } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('status', 'active');

      // Get items added this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: itemsThisWeek } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .gte('created_at', oneWeekAgo.toISOString());

      setHouseholdStats({
        totalItems: totalItems || 0,
        activeMembers: members.length,
        itemsAddedThisWeek: itemsThisWeek || 0,
        wasteReduced: (totalItems || 0) * 0.3, // Estimated
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📱 Removing member:', memberId);
              
              const { data, error } = await supabase.rpc('remove_household_member', {
                household_id_param: householdId,
                member_user_id: memberId
              });

              if (error) {
                console.error('Error removing member:', error);
                Alert.alert('Error', 'Failed to remove member. Please try again.');
                return;
              }

              if (data && !data.success) {
                Alert.alert('Error', data.error || 'Failed to remove member.');
                return;
              }

              Alert.alert('Success', `${memberName} has been removed from the household.`);
              await fetchHouseholdData(); // Refresh data
              await refreshHouseholds(); // Refresh context
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleTransferOwnership = async (newOwnerId: string, newOwnerName: string) => {
    Alert.alert(
      'Transfer Ownership',
      `Are you sure you want to transfer ownership of this household to ${newOwnerName}? You will become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📱 Transferring ownership to:', newOwnerId);
              
              const { data, error } = await supabase.rpc('transfer_household_ownership', {
                household_id_param: householdId,
                new_owner_user_id: newOwnerId
              });

              if (error) {
                console.error('Error transferring ownership:', error);
                Alert.alert('Error', 'Failed to transfer ownership. Please try again.');
                return;
              }

              if (data && !data.success) {
                Alert.alert('Error', data.error || 'Failed to transfer ownership.');
                return;
              }

              Alert.alert('Success', `Ownership has been transferred to ${newOwnerName}.`);
              await fetchHouseholdData(); // Refresh data
              await refreshHouseholds(); // Refresh context
            } catch (error) {
              console.error('Error transferring ownership:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSaveHouseholdName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Household name cannot be empty.');
      return;
    }

    if (newName.trim() === householdName) {
      setEditingName(false);
      return;
    }

    try {
      console.log('📱 Updating household name to:', newName.trim());
      
      const { data, error } = await supabase.rpc('update_household_settings', {
        household_id_param: householdId,
        new_name: newName.trim()
      });

      if (error) {
        console.error('Error updating household name:', error);
        Alert.alert('Error', 'Failed to update household name. Please try again.');
        return;
      }

      if (data && !data.success) {
        Alert.alert('Error', data.error || 'Failed to update household name.');
        return;
      }

      setEditingName(false);
      Alert.alert('Success', 'Household name updated successfully!');
      await fetchHouseholdData(); // Refresh data
      await refreshHouseholds(); // Refresh context
    } catch (error) {
      console.error('Error updating household name:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const regenerateInviteCode = async () => {
    Alert.alert(
      'Regenerate Invite Code',
      'This will invalidate the current invite code. Members using the old code won\'t be able to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              // Generate new invite code (8 characters)
              const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              let newCode = '';
              for (let i = 0; i < 8; i++) {
                newCode += characters.charAt(Math.floor(Math.random() * characters.length));
              }

              const { error } = await supabase
                .from('households')
                .update({ invite_code: newCode })
                .eq('id', householdId);

              if (error) {
                Alert.alert('Error', 'Failed to regenerate invite code');
                return;
              }

              setSettings(prev => prev ? { ...prev, invite_code: newCode } : null);
              Alert.alert('Success', `New invite code: ${newCode}`);
            } catch (error) {
              console.error('Error regenerating code:', error);
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };

  const copyInviteCode = async () => {
    if (settings?.invite_code) {
      if (Platform.OS === 'web') {
        // For web platform, use the navigator clipboard API
        await navigator.clipboard.writeText(settings.invite_code);
      } else {
        // For React Native, use Clipboard.setString
        Clipboard.setString(settings.invite_code);
      }
      Alert.alert('Copied', 'Invite code copied to clipboard');
    }
  };

  const deleteHousehold = async () => {
    Alert.alert(
      'Delete Household',
      `Are you sure you want to permanently delete "${settings?.name}"? This will remove all members and data. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              // First remove all members
              await supabase
                .from('household_members')
                .delete()
                .eq('household_id', householdId);

              // Then delete the household
              const { error } = await supabase
                .from('households')
                .delete()
                .eq('id', householdId);

              if (error) {
                Alert.alert('Error', 'Failed to delete household');
                return;
              }

              await refreshHouseholds();
              Alert.alert(
                'Household Deleted',
                'The household has been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('Error deleting household:', error);
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };

  const renderMemberItem = (member: HouseholdMember) => {
    const isCurrentUser = member.user_id === user?.id;
    const isOwner = member.role === 'owner';
    const currentUserRole = members.find(m => m.user_id === user?.id)?.role;
    const canManageMember = currentUserRole === 'owner' && !isCurrentUser;

    return (
      <View key={member.user_id} style={[styles.memberItem, { 
        backgroundColor: theme.cardBackground,
        borderColor: theme.borderPrimary 
      }]}>
        <View style={styles.memberInfo}>
          <View style={[styles.memberAvatar, { backgroundColor: theme.bgTertiary }]}>
            {member.profile.avatar_url ? (
              <Image source={{ uri: member.profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.bgTertiary }]}>
                <Ionicons name="person" size={24} color={theme.textSecondary} />
              </View>
            )}
            {isOwner && (
              <View style={[styles.ownerIndicator, { backgroundColor: designTokens.colors.heroGreen }]}>
                <Ionicons name="star" size={8} color={designTokens.colors.pureWhite} />
              </View>
            )}
          </View>
          
          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, { color: theme.textPrimary }]} numberOfLines={1}>
                {member.profile.full_name || member.profile.username}
              </Text>
              {isCurrentUser && (
                <View style={[styles.youBadge, { backgroundColor: designTokens.colors.heroGreen }]}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.memberUsername, { color: theme.textSecondary }]} numberOfLines={1}>
              @{member.profile.username}
            </Text>
            
            {/* Only show email to owners for management purposes */}
            {member.profile.email && currentUserRole === 'owner' && !isCurrentUser && (
              <Text style={[styles.memberEmail, { color: theme.textTertiary }]} numberOfLines={1}>
                {member.profile.email}
              </Text>
            )}
            
            <View style={styles.memberMetadata}>
              <View style={[
                styles.roleBadge,
                { backgroundColor: isOwner ? designTokens.colors.amber[100] : theme.bgTertiary }
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  { color: isOwner ? designTokens.colors.amber[700] : theme.textSecondary }
                ]}>
                  {isOwner ? 'Owner' : 'Member'}
                </Text>
              </View>
              
              <Text style={[styles.joinedDate, { color: theme.textTertiary }]}>
                Joined {new Date(member.joined_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
        </View>

        {canManageMember && (
          <TouchableOpacity
            style={[styles.memberActions, { backgroundColor: theme.bgTertiary }]}
            onPress={() => {
              Alert.alert(
                'Manage Member',
                `What would you like to do with ${member.profile.full_name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  ...(member.role === 'member' ? [{
                    text: 'Promote to Owner',
                    onPress: () => handleTransferOwnership(member.user_id, member.profile.full_name)
                  }] : []),
                  {
                    text: 'Remove from Household',
                    style: 'destructive',
                    onPress: () => handleRemoveMember(member.user_id, member.profile.full_name)
                  }
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderMembersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Members ({members.length}/{settings?.max_members || 0})
          </Text>
          {settings?.max_members === 20 && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color={designTokens.colors.amber[600]} />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>
        
        {/* Member Limit Info */}
        {settings && (
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            {isPremium 
              ? `Up to ${settings.max_members} members allowed with Premium features` 
              : `Up to ${settings.max_members} members allowed on the free plan`
            }
          </Text>
        )}
      </View>

      {/* Upgrade prompt for free users with small households */}
      {!isPremium && settings?.max_members === 5 && (
        <View style={styles.upgradePrompt}>
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.upgradeGradient}
          >
            <Ionicons name="arrow-up" size={20} color={designTokens.colors.pureWhite} />
            <View style={styles.upgradeText}>
              <Text style={styles.upgradeTitle}>Invite More Family Members</Text>
              <Text style={styles.upgradeSubtitle}>
                Upgrade to Premium for households up to 20 people
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Premium', { source: 'household_members' })}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      <View style={styles.membersList}>
        {members.map(renderMemberItem)}
      </View>
    </View>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Household Name */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Household Name</Text>
        {editingName ? (
          <View style={styles.editingContainer}>
            <TextInput
              style={[styles.textInput, { 
                color: theme.textPrimary,
                backgroundColor: theme.bgTertiary,
                borderColor: theme.borderPrimary
              }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter household name"
              placeholderTextColor={theme.textTertiary}
              maxLength={50}
              autoFocus
            />
            <View style={styles.editingActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.bgTertiary }]}
                onPress={() => {
                  setEditingName(false);
                  setNewName(settings?.name || '');
                }}
              >
                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: designTokens.colors.heroGreen }]}
                onPress={handleSaveHouseholdName}
              >
                <Text style={styles.actionButtonTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setEditingName(true)}
            >
              <Text style={[styles.settingValue, { color: theme.textPrimary }]}>
                {settings?.name || 'Unnamed Household'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
            <Text style={[styles.settingHint, { color: theme.textTertiary }]}>
              Tap to edit your household name
            </Text>
          </>
        )}
      </View>

      {/* Invite Code */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Invite Code</Text>
        <View style={styles.inviteCodeRow}>
          <Text style={[styles.inviteCodeText, { 
            color: theme.textPrimary,
            backgroundColor: theme.bgTertiary 
          }]}>
            {settings?.invite_code || ''}
          </Text>
        </View>
        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={[styles.inviteActionButton, { backgroundColor: theme.bgTertiary }]}
            onPress={copyInviteCode}
          >
            <Ionicons name="copy" size={14} color={theme.textSecondary} />
            <Text style={[styles.inviteActionText, { color: theme.textSecondary }]}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inviteActionButton, { backgroundColor: designTokens.colors.amber[500] }]}
            onPress={regenerateInviteCode}
          >
            <Ionicons name="refresh" size={14} color={designTokens.colors.pureWhite} />
            <Text style={styles.inviteActionTextPrimary}>New Code</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.settingHint, { color: theme.textTertiary }]}>
          Share this code with family members to invite them to your household
        </Text>
      </View>

      {/* Household Type */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Household Type</Text>
        <View style={styles.settingRow}>
          <View style={styles.householdTypeInfo}>
            <Text style={[styles.settingValue, { color: theme.textPrimary }]}>
              {settings?.max_members === 20 ? 'Premium Household' : 'Free Household'}
            </Text>
            <Text style={[styles.settingHint, { color: theme.textTertiary }]}>
              {settings?.max_members === 20 
                ? 'Up to 20 members with premium features' 
                : 'Up to 5 members with basic features'
              }
            </Text>
          </View>
          {settings?.max_members === 20 && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color={designTokens.colors.amber[600]} />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>
        {!isPremium && settings?.max_members === 5 && (
          <TouchableOpacity
            style={[styles.upgradePromptButton, { backgroundColor: designTokens.colors.heroGreen }]}
            onPress={() => navigation.navigate('Premium', { source: 'household_settings' })}
          >
            <Ionicons name="arrow-up" size={16} color={designTokens.colors.pureWhite} />
            <Text style={styles.upgradePromptButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Household Stats Summary */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Quick Stats</Text>
        <View style={styles.quickStatsGrid}>
          <View style={[styles.quickStatItem, { backgroundColor: theme.bgTertiary }]}>
            <Ionicons name="people" size={20} color={designTokens.colors.ocean} />
            <Text style={[styles.quickStatNumber, { color: theme.textPrimary }]}>
              {members.length}
            </Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
              Members
            </Text>
          </View>
          <View style={[styles.quickStatItem, { backgroundColor: theme.bgTertiary }]}>
            <Ionicons name="calendar" size={20} color={designTokens.colors.green[600]} />
            <Text style={[styles.quickStatNumber, { color: theme.textPrimary }]}>
              {settings ? Math.floor((new Date().getTime() - new Date(settings.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
              Days Active
            </Text>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <Text style={[styles.dangerZoneTitle, { color: designTokens.colors.expiredRed }]}>
          Danger Zone
        </Text>
        
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={deleteHousehold}
        >
          <Ionicons name="trash" size={16} color={designTokens.colors.expiredRed} />
          <Text style={styles.dangerButtonText}>Delete Household</Text>
        </TouchableOpacity>
        
        <Text style={[styles.dangerHint, { color: theme.textTertiary }]}>
          This will permanently delete the household and remove all members. This action cannot be undone.
        </Text>
      </View>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <Ionicons name="cube" size={24} color={designTokens.colors.heroGreen} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{householdStats.totalItems}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Items</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <Ionicons name="people" size={24} color={designTokens.colors.ocean} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{householdStats.activeMembers}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Members</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <Ionicons name="add-circle" size={24} color={designTokens.colors.amber[500]} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{householdStats.itemsAddedThisWeek}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Added This Week</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
          <Ionicons name="leaf" size={24} color={designTokens.colors.green[600]} />
          <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{householdStats.wasteReduced.toFixed(1)}kg</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Waste Reduced</Text>
        </View>
      </View>

      <View style={[styles.insightCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
        <Text style={[styles.insightTitle, { color: theme.textPrimary }]}>💡 Household Insights</Text>
        <Text style={[styles.insightText, { color: theme.textSecondary }]}>
          • Most active day: {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}
        </Text>
        <Text style={[styles.insightText, { color: theme.textSecondary }]}>
          • Average items per member: {(householdStats.totalItems / Math.max(1, householdStats.activeMembers)).toFixed(1)}
        </Text>
        <Text style={[styles.insightText, { color: theme.textSecondary }]}>
          • Household created: {settings ? new Date(settings.created_at).toLocaleDateString() : 'Unknown'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading household data...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
        <ProfileAvatar 
          size={44} 
          onPress={() => navigation.navigate('AccountDetails')}
          isPremium={isPremium}
        />
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Manage Household</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {settings?.name || householdName}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.headerButton, { backgroundColor: designTokens.colors.gray[100] }]}
        >
          <Ionicons name="close" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabBar, { backgroundColor: theme.cardBackground, borderBottomColor: theme.borderPrimary }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={activeTab === 'members' ? designTokens.colors.heroGreen : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'members' ? designTokens.colors.heroGreen : theme.textSecondary }
          ]}>
            Members
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings" 
            size={20} 
            color={activeTab === 'settings' ? designTokens.colors.heroGreen : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'settings' ? designTokens.colors.heroGreen : theme.textSecondary }
          ]}>
            Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons 
            name="analytics" 
            size={20} 
            color={activeTab === 'stats' ? designTokens.colors.heroGreen : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'stats' ? designTokens.colors.heroGreen : theme.textSecondary }
          ]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchHouseholdData();
            }}
            tintColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.gray[50],
  },
  loadingText: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: designTokens.colors.gray[100],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 6,
    borderRadius: 8,
    margin: 4,
  },
  activeTab: {
    backgroundColor: designTokens.colors.heroGreen + '10',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  tabContent: {
    gap: 24,
  },

  // Section Headers
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins',
    color: designTokens.colors.deepCharcoal,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[600],
    lineHeight: 20,
  },

  // Premium Badge
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: designTokens.colors.amber[100],
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.amber[700],
    fontFamily: 'Inter',
  },

  // Members List
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberAvatar: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.gray[100],
  },
  ownerIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.heroGreen,
    borderWidth: 2,
    borderColor: 'white',
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
    flex: 1,
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: designTokens.colors.heroGreen,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  memberUsername: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[600],
  },
  memberEmail: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[500],
  },
  memberMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  joinedDate: {
    fontSize: 11,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[500],
  },
  memberActions: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },

  // Settings
  settingSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingValue: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
    flex: 1,
  },
  settingHint: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[500],
    lineHeight: 16,
    marginTop: 4,
  },
  editingContainer: {
    gap: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: designTokens.colors.gray[300],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    backgroundColor: designTokens.colors.gray[50],
  },
  editingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Invite Code
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteCodeText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 2,
    flex: 1,
    color: designTokens.colors.deepCharcoal,
    backgroundColor: designTokens.colors.gray[50],
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  inviteActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  inviteActionTextPrimary: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Household Type Info
  householdTypeInfo: {
    flex: 1,
  },

  // Danger Zone
  dangerZone: {
    backgroundColor: designTokens.colors.red[50],
    borderWidth: 1,
    borderColor: designTokens.colors.red[200],
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 8,
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: designTokens.colors.expiredRed,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.expiredRed,
    backgroundColor: 'white',
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: designTokens.colors.expiredRed,
  },
  dangerHint: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[600],
    lineHeight: 16,
  },

  // Stats Tab
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    textAlign: 'center',
    color: designTokens.colors.gray[600],
    fontWeight: '500',
  },

  // Insights
  insightCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'white',
    gap: 12,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
    color: designTokens.colors.gray[700],
  },

  // Upgrade Prompt
  upgradePrompt: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: designTokens.colors.pureWhite,
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: designTokens.colors.pureWhite,
    opacity: 0.9,
  },
  upgradeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Upgrade Prompt Button
  upgradePromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: designTokens.colors.heroGreen,
    gap: 8,
    marginTop: 12,
  },
  upgradePromptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Quick Stats
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    backgroundColor: designTokens.colors.gray[50],
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Inter',
    color: designTokens.colors.gray[600],
    textAlign: 'center',
  },
}); 