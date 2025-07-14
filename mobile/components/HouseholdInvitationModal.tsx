import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

interface User {
  user_id: string;
  email: string | null;
  username: string;
  full_name: string;
  avatar_url: string;
  is_already_member: boolean;
}

interface HouseholdInvitationModalProps {
  visible: boolean;
  onClose: () => void;
  householdId: string;
  householdName: string;
  onInviteSent: () => void;
}

export default function HouseholdInvitationModal({
  visible,
  onClose,
  householdId,
  householdName,
  onInviteSent,
}: HouseholdInvitationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'search' | 'email'>('search');
  const [emailInput, setEmailInput] = useState('');
  
  const { user } = useAuth();
  const { theme } = useTheme();

  // Debounced search
  useEffect(() => {
    if (inviteMethod === 'search' && searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, inviteMethod]);

  const searchUsers = async () => {
    try {
      setSearching(true);
      
      const { data, error } = await supabase.rpc('search_users_for_invitation', {
        search_term: searchTerm,
        household_id_param: householdId,
      });

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error in search:', error);
    } finally {
      setSearching(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    if (user.is_already_member) {
      Alert.alert('Already Member', 'This user is already a member of this household.');
      return;
    }

    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.user_id === user.user_id);
      if (isSelected) {
        return prev.filter(u => u.user_id !== user.user_id);
      } else {
        return [...prev, user];
      }
    });
  };

  const sendInvitations = async () => {
    if (inviteMethod === 'search' && selectedUsers.length === 0) {
      Alert.alert('No Users Selected', 'Please select at least one user to invite.');
      return;
    }
    
    if (inviteMethod === 'email' && !emailInput.trim()) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }

    // Validate email format
    if (inviteMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
    }

    try {
      setLoading(true);
      
      const invitations = inviteMethod === 'search' 
        ? selectedUsers.map(selectedUser => ({
            household_id: householdId,
            invited_by: user?.id,
            invited_email: selectedUser.email || `${selectedUser.username}@placeholder.com`, // Fallback for username-based invites
            invited_username: selectedUser.username,
            message: message.trim() || `You've been invited to join "${householdName}" on FridgeHero!`,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
          }))
        : [{
            household_id: householdId,
            invited_by: user?.id,
            invited_email: emailInput.trim(),
            invited_username: null,
            message: message.trim() || `You've been invited to join "${householdName}" on FridgeHero!`,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
          }];

      console.log('🔔 Sending invitations:', invitations);

      const { data, error } = await supabase
        .from('household_invitations')
        .insert(invitations)
        .select();

      if (error) {
        console.error('Error sending invitations:', error);
        if (error.code === '23505') { // Unique constraint violation
          Alert.alert('Duplicate Invitation', 'One or more users have already been invited to this household.');
        } else if (error.code === '23503') { // Foreign key violation
          Alert.alert('Error', 'Unable to send invitation. Please make sure you have permission to invite users to this household.');
        } else {
          Alert.alert('Error', 'Failed to send invitations. Please try again.');
        }
        return;
      }

      console.log('🔔 Invitations sent successfully:', data);

      // Send push notifications to invited users
      await sendInvitationNotifications(data, householdName);

      const successCount = data.length;
      const userText = inviteMethod === 'search' 
        ? selectedUsers.map(u => u.username).join(', ')
        : emailInput.trim();

      Alert.alert(
        'Invitations Sent! 🎉', 
        `Successfully sent ${successCount} invitation${successCount > 1 ? 's' : ''} to ${userText}.`,
        [{ text: 'OK', onPress: () => {
          onInviteSent();
          onClose();
        }}]
      );
      
      // Reset form
      setSelectedUsers([]);
      setSearchTerm('');
      setEmailInput('');
      setMessage('');
      
    } catch (error) {
      console.error('Error sending invitations:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendInvitationNotifications = async (invitations: any[], householdName: string) => {
    try {
      console.log('🔔 Sending notifications for invitations:', invitations.length);
      
      for (const invitation of invitations) {
        // Get invited user's push token if they exist
        if (invitation.invited_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('push_token, full_name')
            .eq('id', invitation.invited_user_id)
            .single();

          if (profile?.push_token) {
            console.log('🔔 Sending push notification to user:', invitation.invited_user_id);
            
            // Send push notification via your notification service
            await supabase.rpc('send_push_notification', {
              user_id: invitation.invited_user_id,
              title: 'New Household Invitation! 🏠',
              body: `You've been invited to join "${householdName}"`,
              data: {
                type: 'household_invitation',
                invitation_id: invitation.id,
                household_id: invitation.household_id,
                household_name: householdName,
              }
            });
          }
        }

        // Also create a notification record in the database
        await supabase
          .from('notifications')
          .insert({
            user_id: invitation.invited_user_id,
            type: 'household_invitation',
            message: `You've been invited to join "${householdName}"`,
            action_data: {
              invitation_id: invitation.id,
              household_id: invitation.household_id,
              household_name: householdName,
            },
            expires_at: invitation.expires_at,
          });
      }
    } catch (error) {
      console.error('Error sending invitation notifications:', error);
      // Don't throw error here - invitation was successful even if notification failed
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.some(u => u.user_id === item.user_id);
    const isAlreadyMember = item.is_already_member;
    
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          { 
            backgroundColor: theme.cardBackground,
            borderColor: isSelected ? designTokens.colors.heroGreen : theme.borderPrimary,
            opacity: isAlreadyMember ? 0.5 : 1,
          }
        ]}
        onPress={() => toggleUserSelection(item)}
        disabled={isAlreadyMember}
      >
        <View style={styles.userAvatar}>
          <View style={[styles.defaultAvatar, { backgroundColor: theme.bgTertiary }]}>
            <Ionicons name="person" size={20} color={theme.textSecondary} />
          </View>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark" size={12} color={designTokens.colors.pureWhite} />
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>
            {item.full_name || item.username || 'User'}
          </Text>
          <Text style={[styles.userDetails, { color: theme.textSecondary }]}>
            @{item.username}
            {item.email && ` • ${item.email}`}
          </Text>
          {isAlreadyMember && (
            <Text style={[styles.memberBadge, { color: designTokens.colors.alertAmber }]}>
              Already a member
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedUsers = () => {
    if (selectedUsers.length === 0) return null;
    
    return (
      <View style={styles.selectedUsersContainer}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Selected Users ({selectedUsers.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedUsersList}>
          {selectedUsers.map(user => (
            <View key={user.user_id} style={[styles.selectedUserChip, { backgroundColor: theme.bgTertiary }]}>
              <Text style={[styles.selectedUserName, { color: theme.textPrimary }]}>
                {user.username}
              </Text>
              <TouchableOpacity onPress={() => toggleUserSelection(user)}>
                <Ionicons name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.borderPrimary }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
            Invite to {householdName}
          </Text>
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: (selectedUsers.length > 0 || emailInput.trim()) && !loading 
                  ? designTokens.colors.heroGreen 
                  : theme.bgTertiary 
              }
            ]}
            onPress={sendInvitations}
            disabled={(selectedUsers.length === 0 && !emailInput.trim()) || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={designTokens.colors.pureWhite} />
            ) : (
              <Text style={[
                styles.sendButtonText,
                { 
                  color: (selectedUsers.length > 0 || emailInput.trim()) && !loading 
                    ? designTokens.colors.pureWhite 
                    : theme.textSecondary 
                }
              ]}>
                Send
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Invite Method Toggle */}
          <View style={styles.methodToggle}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                inviteMethod === 'search' && styles.activeMethodButton,
                { backgroundColor: inviteMethod === 'search' ? designTokens.colors.heroGreen : theme.bgTertiary }
              ]}
              onPress={() => setInviteMethod('search')}
            >
              <Ionicons 
                name="search" 
                size={16} 
                color={inviteMethod === 'search' ? designTokens.colors.pureWhite : theme.textSecondary} 
              />
              <Text style={[
                styles.methodButtonText,
                { color: inviteMethod === 'search' ? designTokens.colors.pureWhite : theme.textSecondary }
              ]}>
                Search Users
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.methodButton,
                inviteMethod === 'email' && styles.activeMethodButton,
                { backgroundColor: inviteMethod === 'email' ? designTokens.colors.heroGreen : theme.bgTertiary }
              ]}
              onPress={() => setInviteMethod('email')}
            >
              <Ionicons 
                name="mail" 
                size={16} 
                color={inviteMethod === 'email' ? designTokens.colors.pureWhite : theme.textSecondary} 
              />
              <Text style={[
                styles.methodButtonText,
                { color: inviteMethod === 'email' ? designTokens.colors.pureWhite : theme.textSecondary }
              ]}>
                Email Invite
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Method */}
          {inviteMethod === 'search' && (
            <View style={styles.searchSection}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Search Users</Text>
              <View style={[styles.searchInputContainer, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.textPrimary }]}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search by username or email..."
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="none"
                />
                {searching && <ActivityIndicator size="small" color={theme.textSecondary} />}
              </View>
              
              {searchResults.length > 0 && (
                <FlatList
                  data={searchResults}
                  keyExtractor={item => item.user_id}
                  renderItem={renderUserItem}
                  style={styles.searchResults}
                  scrollEnabled={false}
                />
              )}
              
              {renderSelectedUsers()}
            </View>
          )}

          {/* Email Method */}
          {inviteMethod === 'email' && (
            <View style={styles.emailSection}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Email Address</Text>
              <TextInput
                style={[
                  styles.emailInput,
                  { 
                    backgroundColor: theme.cardBackground,
                    borderColor: theme.borderPrimary,
                    color: theme.textPrimary
                  }
                ]}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="Enter email address..."
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Custom Message */}
          <View style={styles.messageSection}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Custom Message (Optional)
            </Text>
            <TextInput
              style={[
                styles.messageInput,
                { 
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.borderPrimary,
                  color: theme.textPrimary
                }
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder={`You've been invited to join "${householdName}" on FridgeHero!`}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={[styles.characterCount, { color: theme.textTertiary }]}>
              {message.length}/500
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  activeMethodButton: {
    // styles applied via backgroundColor in component
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  searchSection: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  searchResults: {
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    gap: 12,
  },
  userAvatar: {
    position: 'relative',
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  userDetails: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  memberBadge: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  selectedUsersContainer: {
    marginTop: 16,
  },
  selectedUsersList: {
    flexDirection: 'row',
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  emailSection: {
    marginBottom: 24,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  messageSection: {
    marginBottom: 24,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter',
  },
}); 