import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

interface HouseholdMember {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: 'owner' | 'member';
  joined_at: string;
  email?: string; // Only available to owners
}

interface HouseholdMemberListProps {
  householdId: string;
  onMemberRemoved?: () => void;
  onOwnershipTransferred?: () => void;
}

export default function HouseholdMemberList({
  householdId,
  onMemberRemoved,
  onOwnershipTransferred,
}: HouseholdMemberListProps) {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'member' | null>(null);

  const { user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (user && householdId) {
      fetchMembers();
    }
  }, [user, householdId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      console.log('👥 Fetching household members for:', householdId);

      const { data, error } = await supabase.rpc('get_household_members', {
        household_id_param: householdId
      });

      if (error) {
        console.error('Error fetching members:', error);
        Alert.alert('Error', 'Failed to load household members');
        return;
      }

      const transformedMembers: HouseholdMember[] = data?.map((member: any) => ({
        user_id: member.user_id,
        username: member.username,
        full_name: member.full_name,
        avatar_url: member.avatar_url,
        role: member.role,
        joined_at: member.joined_at,
        email: member.email, // Only available to owners
      })) || [];

      setMembers(transformedMembers);

      // Set current user's role
      const currentMember = transformedMembers.find(m => m.user_id === user?.id);
      setCurrentUserRole(currentMember?.role || null);

      console.log('👥 Loaded members:', transformedMembers.length);
    } catch (error) {
      console.error('Error in fetchMembers:', error);
      Alert.alert('Error', 'Something went wrong while loading members');
    } finally {
      setLoading(false);
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
              console.log('👥 Removing member:', memberId);

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
              await fetchMembers(); // Refresh the list
              onMemberRemoved?.();
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
              console.log('👥 Transferring ownership to:', newOwnerId);

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
              await fetchMembers(); // Refresh the list
              onOwnershipTransferred?.();
            } catch (error) {
              console.error('Error transferring ownership:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderMemberItem = (member: HouseholdMember) => {
    const isCurrentUser = member.user_id === user?.id;
    const isOwner = member.role === 'owner';
    const canManageMember = currentUserRole === 'owner' && !isCurrentUser;

    return (
      <View key={member.user_id} style={[styles.memberItem, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.memberInfo}>
          <View style={[styles.memberAvatar, { backgroundColor: theme.bgTertiary }]}>
            {member.avatar_url ? (
              <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={24} color={theme.textSecondary} />
            )}
          </View>

          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, { color: theme.textPrimary }]}>
                {member.full_name || member.username}
              </Text>
              {isCurrentUser && (
                <View style={[styles.youBadge, { backgroundColor: designTokens.colors.heroGreen }]}>
                  <Text style={styles.youBadgeText}>(You)</Text>
                </View>
              )}
            </View>

            <Text style={[styles.memberUsername, { color: theme.textSecondary }]}>
              @{member.username}
            </Text>

            {/* Only show email to owners for management purposes (GDPR compliance) */}
            {member.email && currentUserRole === 'owner' && !isCurrentUser && (
              <Text style={[styles.memberEmail, { color: theme.textTertiary }]}>
                {member.email}
              </Text>
            )}

            <View style={styles.memberMetadata}>
              <View style={[
                styles.roleBadge,
                { backgroundColor: isOwner ? designTokens.colors.heroGreen : theme.bgTertiary }
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  { color: isOwner ? designTokens.colors.pureWhite : theme.textSecondary }
                ]}>
                  {isOwner ? 'Owner' : 'Member'}
                </Text>
              </View>

              <Text style={[styles.joinedDate, { color: theme.textTertiary }]}>
                Joined {new Date(member.joined_at).toLocaleDateString()}
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
                `What would you like to do with ${member.full_name || member.username}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  ...(member.role === 'member' ? [{
                    text: 'Promote to Owner',
                    onPress: () => handleTransferOwnership(member.user_id, member.full_name || member.username)
                  }] : []),
                  {
                    text: 'Remove from Household',
                    style: 'destructive',
                    onPress: () => handleRemoveMember(member.user_id, member.full_name || member.username)
                  }
                ]
              );
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading members...
        </Text>
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No members found</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          This household has no members yet
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.membersHeader}>
        <Text style={[styles.membersTitle, { color: theme.textPrimary }]}>
          Members ({members.length})
        </Text>
        <Text style={[styles.membersSubtitle, { color: theme.textSecondary }]}>
          Manage who can access this household
        </Text>
      </View>

      <View style={styles.membersList}>
        {members.map(renderMemberItem)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  membersHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  membersSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  membersList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  memberUsername: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  memberEmail: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  memberMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  joinedDate: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  memberActions: {
    padding: 8,
    borderRadius: 8,
  },
}); 