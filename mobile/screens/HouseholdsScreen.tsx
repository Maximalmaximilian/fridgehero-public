import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { designTokens } from '../constants/DesignTokens';
import HouseholdInvitationModal from '../components/HouseholdInvitationModal';
import InvitationPopup from '../components/InvitationPopup';
import { useInvitations } from '../contexts/InvitationContext';

const { width: screenWidth } = Dimensions.get('window');

interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  max_members: number;
  created_at: string;
  role: string;
  member_count?: number;
  household_id?: string;
  households?: any;
  is_active?: boolean;
  metadata?: any;
}

interface HouseholdMember {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  metadata?: any;
}

// Add interface for household selection modal props
interface HouseholdSelectionModalProps {
  visible: boolean;
  households: Household[];
  onSelect: (householdId: string) => void;
  onClose: () => void;
  title: string;
  message: string;
  canCancel?: boolean;
}

// Household Downgrade Notification Modal
interface HouseholdDowngradeModalProps {
  visible: boolean;
  notification: any;
  onClose: () => void;
  onManageMembers: (householdId: string) => void;
}

const HouseholdDowngradeModal = ({ 
  visible, 
  notification, 
  onClose, 
  onManageMembers 
}: HouseholdDowngradeModalProps) => {
  const { theme } = useTheme();
  
  if (!notification) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgPrimary }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            Household Downgraded
          </Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.downgradeBanner}>
            <LinearGradient
              colors={[designTokens.colors.amber[500], designTokens.colors.amber[600]]}
              style={styles.downgradeBannerGradient}
            >
              <Ionicons name="warning" size={32} color={designTokens.colors.pureWhite} />
              <Text style={styles.downgradeBannerTitle}>
                Premium Plan Ended
              </Text>
            </LinearGradient>
          </View>
          
          <View style={styles.downgradeContent}>
            <Text style={[styles.downgradeMessage, { color: theme.textPrimary }]}>
              Your Premium subscription has ended, and your household "{notification.householdName}" has been automatically downgraded to the Free tier.
            </Text>
            
            <View style={styles.downgradeStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Previous Capacity
                </Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                  {notification.originalMemberCount} members
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Current Capacity
                </Text>
                <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                  {notification.currentMemberCount}/5 members
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Members Made Inactive
                </Text>
                <Text style={[styles.statValue, { color: designTokens.colors.amber[600] }]}>
                  {notification.membersAffected} members
                </Text>
              </View>
            </View>
            
            <View style={styles.downgradeExplanation}>
              <Text style={[styles.explanationTitle, { color: theme.textPrimary }]}>
                What happened?
              </Text>
              <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                • Free households are limited to 5 members{'\n'}
                • {notification.membersAffected} members were temporarily made inactive{'\n'}
                • Inactive members can rejoin when space becomes available{'\n'}
                • No data was lost - everything is preserved
              </Text>
            </View>
            
            <View style={styles.downgradeActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: designTokens.colors.heroGreen }]}
                onPress={() => {
                  onClose();
                  onManageMembers(notification.householdId);
                }}
              >
                <Ionicons name="people" size={20} color={designTokens.colors.pureWhite} />
                <Text style={styles.actionButtonText}>Manage Members</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: designTokens.colors.amber[500] }]}
                onPress={() => {
                  onClose();
                  // Navigate to Premium upgrade (would need navigation prop)
                }}
              >
                <Ionicons name="star" size={20} color={designTokens.colors.pureWhite} />
                <Text style={styles.actionButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Member Management Modal for Overcapacity
interface MemberManagementModalProps {
  visible: boolean;
  householdId: string;
  householdName: string;
  onClose: () => void;
  onMemberRemoved: () => void;
}

const MemberManagementModal = ({ 
  visible, 
  householdId, 
  householdName, 
  onClose, 
  onMemberRemoved 
}: MemberManagementModalProps) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [downgradeStatus, setDowngradeStatus] = useState<any>(null);
  
  useEffect(() => {
    if (visible && householdId) {
      loadHouseholdData();
    }
  }, [visible, householdId]);
  
  const loadHouseholdData = async () => {
    try {
      setLoading(true);
      
      // Get household downgrade status
      const { data: status } = await supabase.rpc('get_household_downgrade_status', {
        household_id_param: householdId
      });
      setDowngradeStatus(status);
      
      // Get all members (active and inactive)
      const { data: allMembers } = await supabase.rpc('get_household_members', {
        household_id_param: householdId
      });
      
      // Get member activity status
      const { data: memberStatus } = await supabase
        .from('household_members')
        .select('user_id, is_active, metadata')
        .eq('household_id', householdId);
      
      // Combine member data
      const membersWithStatus = allMembers?.map((member: any) => {
        const memberStatusData = memberStatus?.find(ms => ms.user_id === member.user_id);
        return {
          ...member,
          is_active: memberStatusData?.is_active ?? true,
          metadata: memberStatusData?.metadata || {}
        };
      }) || [];
      
      setMembers(membersWithStatus);
    } catch (error) {
      console.error('Error loading household data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const reactivateMember = async (userId: string) => {
    try {
      const { data: result, error } = await supabase.rpc('reactivate_household_member', {
        household_id_param: householdId,
        member_user_id: userId
      });

      if (error) {
        Alert.alert('Error', 'Failed to reactivate member');
        return;
      }

      if (result?.success) {
        Alert.alert('Success', 'Member reactivated successfully!');
        loadHouseholdData();
        onMemberRemoved();
      } else {
        Alert.alert('Error', result?.error || 'Failed to reactivate member');
      }
    } catch (error) {
      console.error('Error reactivating member:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };
  
  const removeMember = async (userId: string, userName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to permanently remove ${userName} from this household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: result, error } = await supabase.rpc('remove_household_member', {
                household_id_param: householdId,
                member_user_id: userId
              });

              if (error) {
                Alert.alert('Error', 'Failed to remove member');
                return;
              }

              if (result?.success) {
                Alert.alert('Success', 'Member removed successfully!');
                loadHouseholdData();
                onMemberRemoved();
              } else {
                Alert.alert('Error', result?.error || 'Failed to remove member');
              }
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };
  
  const renderMember = ({ item: member }: { item: HouseholdMember }) => {
    const isInactive = !member.is_active;
    const wasRemovedByDowngrade = member.metadata?.removed_due_to_downgrade;
    
    return (
      <View style={[styles.memberCard, { 
        backgroundColor: theme.cardBackground,
        borderColor: theme.borderPrimary,
        opacity: isInactive ? 0.7 : 1
      }]}>
        <View style={styles.memberInfo}>
          <View style={styles.memberAvatar}>
            <Text style={[styles.memberInitials, { color: theme.textPrimary }]}>
              {member.full_name?.charAt(0)?.toUpperCase() || member.username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, { color: theme.textPrimary }]}>
              {member.full_name || member.username}
            </Text>
            <View style={styles.memberMeta}>
              <Text style={[styles.memberRole, { color: theme.textSecondary }]}>
                {member.role === 'owner' ? 'Owner' : 'Member'}
              </Text>
              {isInactive && (
                <View style={styles.inactiveTag}>
                  <Text style={styles.inactiveTagText}>Inactive</Text>
                </View>
              )}
              {wasRemovedByDowngrade && (
                <View style={styles.downgradeTag}>
                  <Text style={styles.downgradeTagText}>Removed by downgrade</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.memberActions}>
          {isInactive && wasRemovedByDowngrade && (
            <TouchableOpacity
              style={[styles.memberActionButton, { backgroundColor: designTokens.colors.heroGreen }]}
              onPress={() => reactivateMember(member.user_id)}
            >
              <Ionicons name="person-add" size={16} color={designTokens.colors.pureWhite} />
              <Text style={styles.memberActionButtonText}>Reactivate</Text>
            </TouchableOpacity>
          )}
          
          {member.role !== 'owner' && (
            <TouchableOpacity
              style={[styles.memberActionButton, { backgroundColor: designTokens.colors.red[500] }]}
              onPress={() => removeMember(member.user_id, member.full_name || member.username)}
            >
              <Ionicons name="person-remove" size={16} color={designTokens.colors.pureWhite} />
              <Text style={styles.memberActionButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgPrimary }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            Manage Members
          </Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <Text style={[styles.householdNameTitle, { color: theme.textPrimary }]}>
            {householdName}
          </Text>
          
          {downgradeStatus && (
            <View style={styles.capacityInfo}>
              <Text style={[styles.capacityText, { color: theme.textSecondary }]}>
                Current: {downgradeStatus.current_member_count}/{downgradeStatus.max_members} members
              </Text>
              {downgradeStatus.inactive_member_count > 0 && (
                <Text style={[styles.inactiveCountText, { color: designTokens.colors.amber[600] }]}>
                  {downgradeStatus.inactive_member_count} inactive members can be reactivated
                </Text>
              )}
            </View>
          )}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading members...
              </Text>
            </View>
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.user_id}
              style={styles.membersList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Household Selection Modal Component
const HouseholdSelectionModal = ({ 
  visible, 
  households, 
  onSelect, 
  onClose, 
  title, 
  message, 
  canCancel = false 
}: HouseholdSelectionModalProps) => {
  const { theme } = useTheme();
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={canCancel ? onClose : undefined}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgPrimary }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            {title}
          </Text>
          {canCancel && (
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={[styles.selectionMessage, { color: theme.textSecondary }]}>
            {message}
          </Text>
          
          <View style={styles.householdOptions}>
            {households.map((household) => (
              <TouchableOpacity
                key={household.household_id || household.id}
                style={[styles.householdOption, { 
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.borderPrimary
                }]}
                onPress={() => onSelect(household.household_id || household.id)}
              >
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionName, { color: theme.textPrimary }]}>
                    {household.households?.name || household.name}
                  </Text>
                  <View style={styles.optionBadges}>
                    {household.role === 'owner' && (
                      <View style={styles.ownerBadge}>
                        <Ionicons name="star" size={10} color={designTokens.colors.pureWhite} />
                        <Text style={styles.ownerText}>Owner</Text>
                      </View>
                    )}
                    {household.is_active !== false && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Currently Active</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.optionMeta}>
                  <View style={styles.memberInfo}>
                    <Ionicons name="people" size={14} color={theme.textSecondary} />
                    <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
                      {household.member_count || 1}/{household.max_members} members
                    </Text>
                  </View>
                  <Text style={[styles.createdDate, { color: theme.textTertiary }]}>
                    Created {new Date(household.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          {!canCancel && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={designTokens.colors.amber[600]} />
              <Text style={[styles.warningText, { color: designTokens.colors.amber[700] }]}>
                You must select a household to continue using the app.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default function HouseholdsScreen({ navigation }: any) {
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<{ id: string; name: string } | null>(null);
  const [showInvitationPopup, setShowInvitationPopup] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showHouseholdSwitchModal, setShowHouseholdSwitchModal] = useState(false);
  
  // Add state for household selection modal
  const [showHouseholdSelectionModal, setShowHouseholdSelectionModal] = useState(false);
  const [selectionModalConfig, setSelectionModalConfig] = useState<{
    title: string;
    message: string;
    canCancel: boolean;
    reason: 'downgrade' | 'no_active' | 'manual';
  }>({
    title: '',
    message: '',
    canCancel: false,
    reason: 'manual'
  });

  // Add state for downgrade notifications
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [currentDowngradeNotification, setCurrentDowngradeNotification] = useState<any>(null);
  const [showMemberManagementModal, setShowMemberManagementModal] = useState(false);
  const [managementHouseholdId, setManagementHouseholdId] = useState<string>('');
  const [managementHouseholdName, setManagementHouseholdName] = useState<string>('');

  const { user } = useAuth();
  const { theme } = useTheme();
  const { 
    isPremium, 
    canCreateNewHousehold, 
    refreshSubscription,
    getPendingHouseholdNotifications,
    clearPendingHouseholdNotification
  } = useSubscription();
  
  const { 
    pendingInvitations, 
    pendingCount,
  } = useInvitations();

  // Subscription-aware logic
  const maxActiveHouseholds = isPremium ? 5 : 1;
  const activeHouseholds = allHouseholds.filter(h => h.is_active !== false);
  const inactiveHouseholds = allHouseholds.filter(h => h.is_active === false);
  const canCreateMore = isPremium ? activeHouseholds.length < 5 : activeHouseholds.length < 1;

  // Store previous Premium status to detect downgrade
  const previousIsPremiumRef = useRef<boolean | null>(null);
  
  useEffect(() => {
    if (user) {
      loadHouseholds();
      refreshSubscription();
      checkForDowngradeNotifications();
    }
  }, [user]);

  // Check for pending downgrade notifications
  const checkForDowngradeNotifications = () => {
    const pendingNotifications = getPendingHouseholdNotifications();
    const downgradeNotifications = pendingNotifications.filter(
      (n: any) => n.type === 'downgrade_overcapacity'
    );
    
    if (downgradeNotifications.length > 0) {
      // Show the first notification
      setCurrentDowngradeNotification(downgradeNotifications[0]);
      setShowDowngradeModal(true);
    }
  };

  const handleDowngradeNotificationClose = async () => {
    if (currentDowngradeNotification) {
      await clearPendingHouseholdNotification(currentDowngradeNotification.id);
      setCurrentDowngradeNotification(null);
      setShowDowngradeModal(false);
      
      // Check for more notifications
      setTimeout(checkForDowngradeNotifications, 500);
    }
  };

  const handleManageMembers = (householdId: string) => {
    const household = allHouseholds.find(h => h.id === householdId || h.household_id === householdId);
    setManagementHouseholdId(householdId);
    setManagementHouseholdName(household?.name || household?.households?.name || 'Unknown');
    setShowMemberManagementModal(true);
  };

  // Detect Premium status changes and enforce single household rule
  useEffect(() => {
    if (previousIsPremiumRef.current !== null && previousIsPremiumRef.current && !isPremium) {
      // Premium to Free downgrade detected
      console.log('🔄 Premium downgrade detected, checking household status...');
      handlePremiumDowngrade();
    }
    previousIsPremiumRef.current = isPremium;
  }, [isPremium]);

  // Check for no active households scenario
  useEffect(() => {
    if (!loading && allHouseholds.length > 0 && activeHouseholds.length === 0) {
      console.log('⚠️ No active households detected, showing selection modal...');
      handleNoActiveHouseholds();
    }
  }, [loading, allHouseholds, activeHouseholds]);

  // Monitor for household deletion/leaving events
  useEffect(() => {
    const handleHouseholdEvents = () => {
      // Listen for real-time updates on household_members table
      const subscription = supabase
        .channel('household_member_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `user_id=eq.${user?.id}`
        }, (payload) => {
          console.log('🔄 Household member change detected:', payload);
          // Reload households after any change to user's memberships
          setTimeout(() => loadHouseholds(), 1000);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    };

    if (user) {
      return handleHouseholdEvents();
    }
  }, [user]);

  const handlePremiumDowngrade = () => {
    if (activeHouseholds.length <= 1) return; // Already compliant
    
    setSelectionModalConfig({
      title: '🔄 Premium Plan Ended',
      message: `Free accounts can only have 1 active household. You currently have ${activeHouseholds.length} active households.\n\nPlease select which household to keep active. The others will be temporarily locked until you upgrade to Premium again.`,
      canCancel: false,
      reason: 'downgrade'
    });
    setShowHouseholdSelectionModal(true);
  };

  const handleNoActiveHouseholds = () => {
    const availableHouseholds = allHouseholds.filter(h => h.is_active === false);
    if (availableHouseholds.length === 0) {
      // User has no households at all - this shouldn't happen normally
      console.log('⚠️ User has no households, creating default household...');
      createDefaultHousehold();
      return;
    }
    
    setSelectionModalConfig({
      title: '🏠 Select Active Household',
      message: 'You don\'t have any active household. Please select one to continue using the app.',
      canCancel: false,
      reason: 'no_active'
    });
    setShowHouseholdSelectionModal(true);
  };

  const createDefaultHousehold = async () => {
    try {
      console.log('🏠 Creating default household...');
      
      const maxMembers = isPremium ? 20 : 5;
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data: newHousehold, error: householdError } = await supabase
        .from('households')
        .insert([{
          name: 'My Kitchen',
          created_by: user?.id,
          invite_code: inviteCode,
          max_members: maxMembers,
        }])
        .select()
        .single();

      if (householdError) {
        console.error('Error creating default household:', householdError);
        Alert.alert('Error', 'Failed to create default household');
        return;
      }

      const { error: memberError } = await supabase
        .from('household_members')
        .insert([{
          household_id: newHousehold.id,
          user_id: user?.id,
          role: 'owner',
          is_active: true,
        }]);

      if (memberError) {
        console.error('Error adding user to default household:', memberError);
        // Cleanup the household if member creation failed
        await supabase.from('households').delete().eq('id', newHousehold.id);
        Alert.alert('Error', 'Failed to create default household');
        return;
      }

      console.log('🏠 Default household created successfully');
      await loadHouseholds();
      
    } catch (error) {
      console.error('Error creating default household:', error);
      Alert.alert('Error', 'Something went wrong while creating default household');
    }
  };

  const handleHouseholdSelection = async (householdId: string) => {
    try {
      console.log('🏠 Activating selected household:', householdId);
      
      if (!isPremium) {
        // For Free users, use RPC to switch (deactivate others, activate selected)
        const { error } = await supabase.rpc('switch_active_household', {
          user_id_param: user?.id,
          new_household_id: householdId
        });

        if (error) {
          console.error('Error switching household:', error);
          Alert.alert('Error', 'Failed to activate household. Please try again.');
          return;
        }
      } else {
        // For Premium users, just activate the selected household
        const { error } = await supabase
          .from('household_members')
          .update({ is_active: true })
          .eq('user_id', user?.id)
          .eq('household_id', householdId);

        if (error) {
          console.error('Error activating household:', error);
          Alert.alert('Error', 'Failed to activate household. Please try again.');
          return;
        }
      }
      
      // Close modal and refresh
      setShowHouseholdSelectionModal(false);
      await loadHouseholds();
      
      const selectedHouseholdName = allHouseholds.find(h => 
        (h.household_id || h.id) === householdId
      )?.households?.name || 'household';
      
      Alert.alert(
        'Success! ✅', 
        `"${selectedHouseholdName}" is now your active household.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error in handleHouseholdSelection:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const loadHouseholds = async () => {
    try {
      setLoading(true);
      console.log('🏠 Loading households for user:', user?.id);
      
      const { data, error } = await supabase
        .from('household_members')
        .select(`
          household_id,
          role,
          is_active,
          households!inner (
            id,
            name,
            invite_code,
            created_by,
            max_members,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .order('is_active', { ascending: false });

      if (error) {
        console.error('❌ Error loading households:', error);
        Alert.alert('Error', 'Failed to load households');
        return;
      }

      if (!data || data.length === 0) {
        setAllHouseholds([]);
        return;
      }

      // Transform and deduplicate
      const households: Household[] = data.map((item: any) => ({
        id: item.households.id,
        household_id: item.household_id,
        name: item.households.name,
        invite_code: item.households.invite_code,
        created_by: item.households.created_by,
        max_members: item.households.max_members,
        created_at: item.households.created_at,
        role: item.role,
        is_active: item.is_active,
        households: item.households,
      }));

      // Get member counts
      for (const household of households) {
        const { data: members } = await supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', household.household_id || household.id);
        household.member_count = members?.length || 1;
      }

      setAllHouseholds(households);
      console.log('🏠 Loaded households:', households.length, '| Active:', households.filter(h => h.is_active !== false).length);
    } catch (error) {
      console.error('❌ Error in loadHouseholds:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createHousehold = async () => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    if (!canCreateMore) {
      Alert.alert(
        '🔒 Household Limit Reached',
        isPremium 
          ? 'You\'ve reached the maximum of 5 households.'
          : 'Free users can only create 1 household. Upgrade to Premium for up to 5 households.',
        [
          { text: 'Cancel', style: 'cancel' },
          ...(!isPremium ? [{ 
            text: 'Upgrade to Premium', 
            onPress: () => navigation.navigate('Premium', { source: 'household_limit' })
          }] : [])
        ]
      );
      return;
    }

    try {
      setCreatingHousehold(true);
      
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const maxMembers = isPremium ? 20 : 5;

      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .insert([{
          name: newHouseholdName.trim(),
          created_by: user?.id,
          invite_code: inviteCode,
          max_members: maxMembers,
        }])
        .select()
        .single();

      if (householdError) {
        console.error('Error creating household:', householdError);
        Alert.alert('Error', 'Failed to create household');
        return;
      }

      const { error: memberError } = await supabase
        .from('household_members')
        .insert([{
          household_id: householdData.id,
          user_id: user?.id,
          role: 'owner',
          is_active: true,
        }]);

      if (memberError) {
        console.error('Error adding user to household:', memberError);
        await supabase.from('households').delete().eq('id', householdData.id);
        Alert.alert('Error', 'Failed to create household');
        return;
      }

      setNewHouseholdName('');
      setShowCreateForm(false);
      loadHouseholds();
      
      Alert.alert('Success! 🎉', `"${householdData.name}" has been created!`);
    } catch (error) {
      console.error('Error creating household:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setCreatingHousehold(false);
    }
  };

  const switchActiveHousehold = async (householdId: string) => {
    if (isPremium) {
      // Premium users can have multiple active households
      await activateHousehold(householdId);
      return;
    }

    // Free users need to switch (deactivate others)
    Alert.alert(
      'Switch Active Household',
      'This will deactivate your current household and activate the selected one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: async () => {
            try {
              // Use RPC function to properly switch households for free users
              const { error } = await supabase.rpc('switch_active_household', {
                user_id_param: user?.id,
                new_household_id: householdId
              });

              if (error) {
                console.error('Error switching household:', error);
                Alert.alert('Error', 'Failed to switch household');
                return;
              }

              loadHouseholds();
              Alert.alert('Success', 'Household switched successfully!');
            } catch (error) {
              console.error('Error switching household:', error);
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };

  const activateHousehold = async (householdId: string) => {
    try {
      const { error } = await supabase
        .from('household_members')
        .update({ is_active: true })
        .eq('user_id', user?.id)
        .eq('household_id', householdId);

      if (error) {
        console.error('Error activating household:', error);
        Alert.alert('Error', 'Failed to activate household');
        return;
      }

      loadHouseholds();
      Alert.alert('Success', 'Household activated!');
    } catch (error) {
      console.error('Error activating household:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.bgPrimary }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.cardBackground }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Households
          </Text>
          <View style={styles.headerSubtitle}>
            <View style={[styles.planBadge, { 
              backgroundColor: isPremium ? designTokens.colors.green[100] : designTokens.colors.amber[100] 
            }]}>
              <Ionicons 
                name={isPremium ? "star" : "information-circle"} 
                size={12} 
                color={isPremium ? designTokens.colors.green[600] : designTokens.colors.amber[600]} 
              />
              <Text style={[styles.planBadgeText, { 
                color: isPremium ? designTokens.colors.green[700] : designTokens.colors.amber[700] 
              }]}>
                {isPremium ? 'Premium' : 'Free'}
              </Text>
            </View>
            <Text style={[styles.capacityText, { color: theme.textSecondary }]}>
              {activeHouseholds.length}/{maxActiveHouseholds} active
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { 
            backgroundColor: canCreateMore ? designTokens.colors.heroGreen : theme.bgSecondary,
            opacity: canCreateMore ? 1 : 0.6 
          }]}
          onPress={() => canCreateMore ? setShowCreateForm(true) : null}
          disabled={!canCreateMore}
        >
          <Ionicons 
            name={canCreateMore ? "add" : "lock-closed"} 
            size={20} 
            color={canCreateMore ? designTokens.colors.pureWhite : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {!isPremium && (
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowHelpModal(true)}
        >
          <Ionicons name="help-circle" size={16} color={designTokens.colors.amber[600]} />
          <Text style={[styles.helpButtonText, { color: designTokens.colors.amber[700] }]}>
            How do households work on Free plan?
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHouseholdCard = (household: Household) => {
    const isActive = household.is_active !== false;
    const isPremiumHousehold = household.max_members > 5;
    const canInteract = isPremium || isActive;
    
    return (
      <View
        key={household.household_id || household.id}
        style={[
          styles.householdCard,
          { 
            backgroundColor: theme.cardBackground,
            borderColor: isActive ? designTokens.colors.heroGreen : theme.borderPrimary,
            borderWidth: isActive ? 2 : 1,
            opacity: canInteract ? 1 : 0.5
          }
        ]}
      >
        {/* Locked overlay for inactive households (Free users only) */}
        {!isPremium && !isActive && (
          <View style={styles.lockedOverlay}>
            <Ionicons name="lock-closed" size={24} color={designTokens.colors.amber[600]} />
            <Text style={[styles.lockedText, { color: designTokens.colors.amber[700] }]}>
              Locked - Upgrade to Premium
            </Text>
          </View>
        )}

        {/* Card Header with improved layout */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <View style={styles.titleRowRedesigned}>
              <Text style={[styles.householdName, { color: theme.textPrimary }]} numberOfLines={1}>
                {household.households?.name || household.name}
              </Text>
              <View style={styles.statusBadgesContainer}>
                {isActive && (
                  <View style={[styles.statusBadgeRedesigned, styles.activeBadgeRedesigned]}>
                    <Ionicons name="checkmark-circle" size={12} color={designTokens.colors.pureWhite} />
                    <Text style={styles.statusBadgeTextRedesigned}>Active</Text>
                  </View>
                )}
                {household.role === 'owner' && (
                  <View style={[styles.statusBadgeRedesigned, styles.ownerBadgeRedesigned]}>
                    <Ionicons name="star" size={12} color={designTokens.colors.pureWhite} />
                    <Text style={styles.statusBadgeTextRedesigned}>Owner</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.metaRowRedesigned}>
              <View style={styles.metaInfoContainer}>
                <View style={styles.memberInfoRedesigned}>
                  <Ionicons name="people" size={16} color={theme.textSecondary} />
                  <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
                    {household.member_count || 1}/{household.max_members} members
                  </Text>
                </View>
                
                <View style={[styles.typeBadgeRedesigned, { 
                  backgroundColor: isPremiumHousehold ? designTokens.colors.amber[100] : designTokens.colors.gray[100] 
                }]}>
                  <Text style={[styles.typeTextRedesigned, { 
                    color: isPremiumHousehold ? designTokens.colors.amber[700] : theme.textSecondary 
                  }]}>
                    {isPremiumHousehold ? 'Premium' : 'Free'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.menuButtonRedesigned, { 
              backgroundColor: !canInteract ? theme.bgTertiary : (isActive ? theme.bgTertiary : designTokens.colors.green[50])
            }]}
            onPress={() => {
              if (!canInteract) {
                Alert.alert(
                  'Household Locked 🔒',
                  'This household is inactive and locked for Free users. Upgrade to Premium to access all your households simultaneously.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade to Premium', onPress: () => navigation.navigate('Premium', { source: 'locked_household' }) }
                  ]
                );
                return;
              }
              
              if (isActive) {
                navigation.navigate('HouseholdManagement', { 
                  householdId: household.household_id || household.id,
                  householdName: household.households?.name || household.name
                });
              } else {
                Alert.alert(
                  'Household Inactive',
                  'This household is inactive. Activate it to access management features.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Activate', onPress: () => switchActiveHousehold(household.household_id || household.id) }
                  ]
                );
              }
            }}
            disabled={!canInteract}
          >
            <Ionicons 
              name={!canInteract ? "lock-closed" : (isActive ? "settings" : "play")} 
              size={20} 
              color={!canInteract ? designTokens.colors.amber[600] : (isActive ? theme.textSecondary : designTokens.colors.heroGreen)} 
            />
          </TouchableOpacity>
        </View>

        {/* Card Footer with improved spacing */}
        <View style={styles.cardFooterRedesigned}>
          <Text style={[styles.createdDateRedesigned, { color: theme.textTertiary }]}>
            Created {new Date(household.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>

          <View style={styles.actionButtonsRedesigned}>
            {!isActive && canInteract && (
              <TouchableOpacity
                style={[styles.actionButtonRedesigned, styles.activateButtonRedesigned]}
                onPress={() => switchActiveHousehold(household.household_id || household.id)}
              >
                <Ionicons name="play" size={14} color={designTokens.colors.pureWhite} />
                <Text style={styles.actionButtonTextRedesigned}>Activate</Text>
              </TouchableOpacity>
            )}
            
            {household.role === 'owner' && isActive && canInteract && (
              <TouchableOpacity
                style={[styles.actionButtonRedesigned, styles.inviteButtonRedesigned]}
                onPress={() => {
                  setSelectedHousehold({ 
                    id: household.household_id || household.id, 
                    name: household.households?.name || household.name 
                  });
                  setShowInviteModal(true);
                }}
              >
                <Ionicons name="person-add" size={14} color={designTokens.colors.pureWhite} />
                <Text style={styles.actionButtonTextRedesigned}>Invite</Text>
              </TouchableOpacity>
            )}
            
            {!canInteract && (
              <TouchableOpacity
                style={[styles.actionButtonRedesigned, styles.upgradeButtonRedesigned]}
                onPress={() => navigation.navigate('Premium', { source: 'locked_household_action' })}
              >
                <Ionicons name="star" size={14} color={designTokens.colors.pureWhite} />
                <Text style={styles.actionButtonTextRedesigned}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCreateForm = () => (
    <View style={[styles.createForm, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
      <View style={styles.createFormHeader}>
        <Text style={[styles.createFormTitle, { color: theme.textPrimary }]}>
          Create New Household
        </Text>
        <TouchableOpacity
          onPress={() => {
            setShowCreateForm(false);
            setNewHouseholdName('');
          }}
          style={[styles.closeButton, { backgroundColor: theme.bgTertiary }]}
        >
          <Ionicons name="close" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.nameInput, { 
          backgroundColor: theme.bgTertiary, 
          borderColor: theme.borderPrimary,
          color: theme.textPrimary
        }]}
        value={newHouseholdName}
        onChangeText={setNewHouseholdName}
        placeholder="Enter household name..."
        placeholderTextColor={theme.textTertiary}
        maxLength={50}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={createHousehold}
      />

      <View style={styles.createFormActions}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: theme.bgTertiary }]}
          onPress={() => {
            setShowCreateForm(false);
            setNewHouseholdName('');
          }}
        >
          <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, { 
            backgroundColor: newHouseholdName.trim() ? designTokens.colors.heroGreen : theme.bgTertiary,
            opacity: creatingHousehold ? 0.7 : 1
          }]}
          onPress={createHousehold}
          disabled={!newHouseholdName.trim() || creatingHousehold}
        >
          <Text style={[styles.confirmButtonText, { 
            color: newHouseholdName.trim() ? designTokens.colors.pureWhite : theme.textTertiary 
          }]}>
            {creatingHousehold ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.bgTertiary }]}>
        <Ionicons name="home" size={32} color={theme.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        No Households Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Create your first household to start managing your kitchen with family and friends
      </Text>
      
      <TouchableOpacity
        style={styles.emptyCreateButton}
        onPress={() => setShowCreateForm(true)}
      >
        <Ionicons name="add" size={20} color={designTokens.colors.pureWhite} />
        <Text style={styles.emptyCreateButtonText}>Create Your First Household</Text>
      </TouchableOpacity>
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadHouseholds();
  };

  // Debug function to simulate Premium expiration for testing
  const simulatePremiumExpiration = async () => {
    Alert.alert(
      '🧪 Debug: Simulate Premium Expiration',
      'This will simulate losing Premium status to test household downgrade functionality.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: async () => {
            try {
              // Find premium households created by this user
              const { data: premiumHouseholds } = await supabase
                .from('households')
                .select('id, name, max_members')
                .eq('created_by', user?.id)
                .gt('max_members', 5);

              if (!premiumHouseholds || premiumHouseholds.length === 0) {
                Alert.alert('No Premium Households', 'You don\'t have any Premium households to downgrade.');
                return;
              }

              // Simulate the downgrade process
              for (const household of premiumHouseholds) {
                console.log(`🧪 Simulating downgrade for: ${household.name}`);
                
                const { data: result, error } = await supabase.rpc('downgrade_premium_household', {
                  household_id_param: household.id,
                  user_id_param: user?.id
                });

                if (result?.success && result.members_made_inactive > 0) {
                  // Store notification for testing
                  await storePendingHouseholdNotification(household.id, {
                    type: 'downgrade_overcapacity',
                    householdName: household.name,
                    membersAffected: result.members_made_inactive,
                    originalMemberCount: result.original_member_count,
                    currentMemberCount: result.current_member_count
                  });
                }
              }

              Alert.alert(
                '✅ Simulation Complete',
                `Downgraded ${premiumHouseholds.length} household(s). Check for downgrade notifications.`,
                [
                  { text: 'OK', onPress: () => {
                    loadHouseholds();
                    checkForDowngradeNotifications();
                  }}
                ]
              );
            } catch (error) {
              console.error('Error in simulation:', error);
              Alert.alert('Error', 'Failed to simulate Premium expiration');
            }
          }
        }
      ]
    );
  };

  // Helper function to store notifications (from SubscriptionContext)
  const storePendingHouseholdNotification = async (householdId: string, notificationData: any) => {
    try {
      const currentUserData = user?.user_metadata || {};
      const pendingNotifications = currentUserData.pending_household_notifications || [];
      
      pendingNotifications.push({
        id: `${householdId}_${Date.now()}`,
        householdId,
        ...notificationData,
        createdAt: new Date().toISOString()
      });

      await supabase.auth.updateUser({
        data: {
          ...currentUserData,
          pending_household_notifications: pendingNotifications
        }
      });
    } catch (error) {
      console.error('Error storing pending notification:', error);
    }
  };

  if (loading && allHouseholds.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading households...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['top']}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[designTokens.colors.heroGreen]}
            tintColor={designTokens.colors.heroGreen}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Invitation Banner */}
        {pendingCount > 0 && (
          <View style={styles.invitationBanner}>
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
              style={styles.invitationBannerGradient}
            >
              <View style={styles.invitationContent}>
                <Ionicons name="mail" size={24} color={designTokens.colors.pureWhite} />
                <View style={styles.invitationText}>
                  <Text style={styles.invitationTitle}>
                    {pendingCount} Household Invitation{pendingCount > 1 ? 's' : ''}!
                  </Text>
                  <Text style={styles.invitationSubtitle}>
                    Tap to view and respond
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.invitationButton}
                onPress={() => setShowInvitationPopup(true)}
              >
                <Text style={styles.invitationButtonText}>View</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {showCreateForm && renderCreateForm()}
        
        {allHouseholds.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.householdsList}>
            {/* Active Households */}
            {activeHouseholds.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Active Household{activeHouseholds.length > 1 ? 's' : ''} ({activeHouseholds.length})
                </Text>
                {activeHouseholds.map(renderHouseholdCard)}
              </View>
            )}
            
            {/* Inactive Households */}
            {inactiveHouseholds.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    Locked Households ({inactiveHouseholds.length})
                  </Text>
                  {!isPremium && (
                    <TouchableOpacity
                      style={styles.upgradeButton}
                      onPress={() => navigation.navigate('Premium', { source: 'locked_households' })}
                    >
                      <Text style={styles.upgradeButtonText}>Upgrade to unlock all</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {inactiveHouseholds.map(renderHouseholdCard)}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {showInviteModal && selectedHousehold && (
        <HouseholdInvitationModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          householdId={selectedHousehold.id}
          householdName={selectedHousehold.name}
          onInviteSent={() => loadHouseholds()}
        />
      )}

      {showInvitationPopup && pendingInvitations.length > 0 && (
        <InvitationPopup
          visible={showInvitationPopup}
          onClose={() => setShowInvitationPopup(false)}
          invitation={pendingInvitations[0]}
        />
      )}

      {/* Household Selection Modal */}
      {showHouseholdSelectionModal && (
        <HouseholdSelectionModal
          visible={showHouseholdSelectionModal}
          households={allHouseholds}
          onSelect={handleHouseholdSelection}
          onClose={() => {
            if (selectionModalConfig.canCancel) {
              setShowHouseholdSelectionModal(false);
            }
          }}
          title={selectionModalConfig.title}
          message={selectionModalConfig.message}
          canCancel={selectionModalConfig.canCancel}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <Modal
          visible={showHelpModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgPrimary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Free Plan Households
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowHelpModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.helpSection}>
                <View style={styles.helpItem}>
                  <Ionicons name="home" size={24} color={designTokens.colors.amber[600]} />
                  <View style={styles.helpText}>
                    <Text style={[styles.helpTitle, { color: theme.textPrimary }]}>
                      1 Active Household
                    </Text>
                    <Text style={[styles.helpDescription, { color: theme.textSecondary }]}>
                      Free accounts can only have one active household at a time. You can still be a member of multiple households, but only one can be active.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.helpItem}>
                  <Ionicons name="lock-closed" size={24} color={designTokens.colors.amber[600]} />
                  <View style={styles.helpText}>
                    <Text style={[styles.helpTitle, { color: theme.textPrimary }]}>
                      Locked Households
                    </Text>
                    <Text style={[styles.helpDescription, { color: theme.textSecondary }]}>
                      Inactive households are temporarily locked but preserved. You can switch your active household or upgrade to Premium to unlock all households simultaneously.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.helpItem}>
                  <Ionicons name="swap-horizontal" size={24} color={designTokens.colors.amber[600]} />
                  <View style={styles.helpText}>
                    <Text style={[styles.helpTitle, { color: theme.textPrimary }]}>
                      Switching Households
                    </Text>
                    <Text style={[styles.helpDescription, { color: theme.textSecondary }]}>
                      To activate a different household, tap "Activate" on any locked household. This will deactivate your current household and activate the selected one.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.helpItem}>
                  <Ionicons name="star" size={24} color={designTokens.colors.heroGreen} />
                  <View style={styles.helpText}>
                    <Text style={[styles.helpTitle, { color: theme.textPrimary }]}>
                      Premium Benefits
                    </Text>
                    <Text style={[styles.helpDescription, { color: theme.textSecondary }]}>
                      Premium users can have up to 5 active households simultaneously, plus unlimited items, barcode scanning, and advanced features.
                    </Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.upgradeModalButton}
                onPress={() => {
                  setShowHelpModal(false);
                  navigation.navigate('Premium', { source: 'help_modal' });
                }}
              >
                <LinearGradient
                  colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
                  style={styles.upgradeModalButtonGradient}
                >
                  <Ionicons name="star" size={20} color={designTokens.colors.pureWhite} />
                  <Text style={styles.upgradeModalButtonText}>
                    Upgrade to Premium
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Household Downgrade Modal */}
      {showDowngradeModal && currentDowngradeNotification && (
        <HouseholdDowngradeModal
          visible={showDowngradeModal}
          notification={currentDowngradeNotification}
          onClose={handleDowngradeNotificationClose}
          onManageMembers={handleManageMembers}
        />
      )}

      {/* Member Management Modal */}
      {showMemberManagementModal && (
        <MemberManagementModal
          visible={showMemberManagementModal}
          householdId={managementHouseholdId}
          householdName={managementHouseholdName}
          onClose={() => setShowMemberManagementModal(false)}
          onMemberRemoved={() => {
            loadHouseholds();
            setShowMemberManagementModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.amber[50],
    gap: 6,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Content
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter',
  },

  // Invitation Banner
  invitationBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  invitationBannerGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invitationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invitationText: {
    marginLeft: 12,
    flex: 1,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  invitationSubtitle: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    opacity: 0.9,
  },
  invitationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 8,
  },
  invitationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
  },

  // Create Form
  createForm: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  createFormActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: designTokens.colors.heroGreen,
    gap: 8,
  },
  emptyCreateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Households List
  householdsList: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: designTokens.colors.amber[100],
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.amber[700],
    fontFamily: 'Inter',
  },

  // Household Card
  householdCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: 8,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  householdName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
    flex: 1,
    marginRight: 8,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: designTokens.colors.heroGreen,
    gap: 4,
  },
  ownerText: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCount: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Modal
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  modalContent: {
    flex: 1,
  },
  helpSection: {
    marginBottom: 20,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  helpText: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  upgradeModalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  upgradeModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  upgradeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },

  // Add new styles for household selection modal and locked overlay
  selectionMessage: {
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  householdOptions: {
    gap: 16,
  },
  householdOption: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
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
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  optionName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
    flex: 1,
    marginRight: 12,
  },
  optionBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  optionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.amber[50],
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
    flex: 1,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    gap: 8,
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  // Member Management Modal
  memberCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    marginBottom: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  inactiveTag: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: designTokens.colors.amber[100],
  },
  inactiveTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.amber[700],
    fontFamily: 'Inter',
  },
  downgradeTag: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: designTokens.colors.amber[100],
  },
  downgradeTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.amber[700],
    fontFamily: 'Inter',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.heroGreen,
  },
  memberActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  householdNameTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 16,
  },
  capacityInfo: {
    marginBottom: 16,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  inactiveCountText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  membersList: {
    flex: 1,
  },

  // Downgrade Modal styles
  downgradeBanner: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  downgradeBannerGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  downgradeBannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  downgradeContent: {
    padding: 20,
  },
  downgradeMessage: {
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  downgradeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    padding: 16,
    backgroundColor: designTokens.colors.gray[50],
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  downgradeExplanation: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: designTokens.colors.gray[50],
    borderRadius: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  downgradeActions: {
    gap: 12,
  },
  memberInitials: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },

  // Redesigned styles
  cardHeaderRedesigned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleSection: {
    flex: 1,
  },
  titleRowRedesigned: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.sm,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  statusBadgeRedesigned: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.sm,
    gap: designTokens.spacing.xs,
  },
  activeBadgeRedesigned: {
    backgroundColor: designTokens.colors.heroGreen,
  },
  ownerBadgeRedesigned: {
    backgroundColor: designTokens.colors.amber[500],
  },
  statusBadgeTextRedesigned: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  metaRowRedesigned: {
    marginTop: designTokens.spacing.xs,
  },
  metaInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  memberInfoRedesigned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  typeBadgeRedesigned: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.sm,
  },
  typeTextRedesigned: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  menuButtonRedesigned: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: designTokens.spacing.md,
  },
  cardFooterRedesigned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.gray[200],
  },
  createdDateRedesigned: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: designTokens.colors.gray[500],
  },
  actionButtonsRedesigned: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  actionButtonRedesigned: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    gap: designTokens.spacing.xs,
  },
  activateButtonRedesigned: {
    backgroundColor: designTokens.colors.heroGreen,
  },
  inviteButtonRedesigned: {
    backgroundColor: designTokens.colors.heroGreen,
  },
  upgradeButtonRedesigned: {
    backgroundColor: designTokens.colors.amber[500],
  },
  actionButtonTextRedesigned: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
}); 