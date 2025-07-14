import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

interface ProfileData {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  notifications_enabled: boolean;
  expiry_reminders: boolean;
  subscription_status: string | null;
  subscription_plan_id: string | null;
  created_at: string;
}

export default function AccountDetailsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone: '',
  });
  const [notificationSettings, setNotificationSettings] = useState({
    notifications_enabled: true,
    expiry_reminders: true,
  });

  const { user, signOut } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        // Create default profile if doesn't exist
        if (error.code === 'PGRST116') {
          console.log('🔧 Profile not found for user, creating default profile...');
          await createDefaultProfile();
        } else {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(data);
        setFormData({
          username: data.username || '',
          full_name: data.full_name || '',
          phone: data.phone || '',
        });
        setNotificationSettings({
          notifications_enabled: data.notifications_enabled ?? true,
          expiry_reminders: data.expiry_reminders ?? true,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    try {
      console.log('🔧 Creating default profile for user:', user?.id);
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user?.id,
          email: user?.email,
          username: null,
          full_name: user?.user_metadata?.full_name || '',
          notifications_enabled: true,
          expiry_reminders: true,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('🔧 ✅ Default profile created successfully');
      setProfile(data);
    } catch (error) {
      console.error('🔧 ❌ Error creating default profile:', error);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const testStorageAccess = async () => {
    try {
      console.log('Testing storage bucket access...');
      
      // Test bucket access by trying to list objects
      const { data: listData, error: listError } = await supabase.storage
        .from('avatars')
        .list('', { limit: 1 });
      
      if (listError) {
        console.error('Storage list error:', listError);
        throw listError;
      }
      
      console.log('Storage bucket is accessible:', listData);
      
      // Test if bucket exists and is public
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
      } else {
        const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
        console.log('Avatars bucket info:', avatarsBucket);
      }
      
      return true;
    } catch (error) {
      console.error('Storage access test failed:', error);
      return false;
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);

      // First test storage access
      const storageAccessible = await testStorageAccess();
      if (!storageAccessible) {
        throw new Error('Storage bucket is not accessible');
      }

      console.log('Original image URI:', imageUri);

      // For React Native, we need to handle local file URIs differently
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName);

      let uploadData;
      let uploadError;

      try {
        // Method 1: Try direct file object approach (React Native standard)
        console.log('Trying direct file object method...');
        
        const fileObject = {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        };

        console.log('File object:', fileObject);

        const result1 = await supabase.storage
          .from('avatars')
          .upload(fileName, fileObject as any, {
            contentType: 'image/jpeg',
            upsert: false
          });

        uploadData = result1.data;
        uploadError = result1.error;

        // If upload succeeded but file is empty, throw error to try alternative method
        if (!uploadError && uploadData) {
          // Quick verification - check if file exists and has size
          const { data: verifyData } = await supabase.storage
            .from('avatars')
            .list('', { limit: 100 });
          
          const uploadedFile = verifyData?.find(file => file.name === fileName);
          if (uploadedFile?.metadata?.size === 0) {
            console.log('File uploaded but is empty, trying alternative method...');
            
            // Delete the empty file
            await supabase.storage.from('avatars').remove([fileName]);
            throw new Error('File uploaded but empty, trying alternative method');
          }
        }

      } catch (directMethodError) {
        console.log('Direct method failed or produced empty file, trying FileSystem method:', directMethodError);
        
        // Method 2: Use expo-file-system to read the file as base64 then convert to blob
        try {
          console.log('Reading file with FileSystem...');
          
          // Get file info first
          const fileInfo = await FileSystem.getInfoAsync(imageUri);
          console.log('File info:', fileInfo);
          
          if (!fileInfo.exists) {
            throw new Error('File does not exist at the given URI');
          }

          // Read file as base64
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('Base64 length:', base64.length);
          
          if (base64.length === 0) {
            throw new Error('File content is empty');
          }

          // Convert base64 to blob
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          console.log('Converted to bytes array, length:', bytes.length);

          const result2 = await supabase.storage
            .from('avatars')
            .upload(fileName, bytes, {
              contentType: 'image/jpeg',
              upsert: false
            });

          uploadData = result2.data;
          uploadError = result2.error;

        } catch (fileSystemError) {
          console.error('FileSystem method also failed:', fileSystemError);
          const directErrorMsg = directMethodError instanceof Error ? directMethodError.message : 'Unknown direct method error';
          const fileSystemErrorMsg = fileSystemError instanceof Error ? fileSystemError.message : 'Unknown FileSystem error';
          throw new Error(`Both upload methods failed. Direct: ${directErrorMsg}, FileSystem: ${fileSystemErrorMsg}`);
        }
      }

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Verify the file was uploaded by listing
      const { data: verifyData, error: verifyError } = await supabase.storage
        .from('avatars')
        .list('', { limit: 100 });
      
      if (!verifyError) {
        const uploadedFile = verifyData?.find(file => file.name === fileName);
        console.log('File verification:', uploadedFile ? 'File found in bucket' : 'File NOT found in bucket');
        if (uploadedFile) {
          console.log('Uploaded file details:', uploadedFile);
          
          // Check if the file has proper size
          if (uploadedFile.metadata?.size === 0) {
            throw new Error('File was uploaded but has 0 bytes. This indicates a React Native file handling issue.');
          }
          
          console.log('✅ File uploaded successfully with size:', uploadedFile.metadata?.size, 'bytes');
        }
      }

      // Get public URL using the same fileName
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrlData.publicUrl);

      // Test the URL by making a HEAD request
      try {
        const testResponse = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
        console.log('URL test response status:', testResponse.status);
        console.log('URL test content-length:', testResponse.headers.get('content-length'));
        
        const contentLength = testResponse.headers.get('content-length');
        if (contentLength === '0' || contentLength === null) {
          throw new Error('Uploaded file is empty - this indicates a problem with the upload process');
        }
        
        console.log('✅ URL test passed - file is accessible and has content');
      } catch (urlError) {
        console.error('URL test failed:', urlError);
        throw urlError;
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await fetchProfile();
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to upload profile picture: ${errorMessage}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Validate username if provided
      if (formData.username.trim()) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(formData.username.trim())) {
          Alert.alert('Invalid Username', 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
          return;
        }

        // Check if username is already taken
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', formData.username.trim())
          .neq('id', user?.id)
          .single();

        if (existingUser) {
          Alert.alert('Username Taken', 'This username is already taken. Please choose a different one.');
          return;
        }
      }

      const updates = {
        id: user?.id,
        username: formData.username.trim() || null,
        full_name: formData.full_name.trim() || null,
        phone: formData.phone.trim() || null,
        notifications_enabled: notificationSettings.notifications_enabled,
        expiry_reminders: notificationSettings.expiry_reminders,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      await fetchProfile();
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all data. Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: async () => {
                    // TODO: Implement account deletion logic
                    Alert.alert('Coming Soon', 'Account deletion will be implemented soon. Please contact support if you need immediate assistance.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
        {content}
      </View>
    </View>
  );

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    icon: keyof typeof Ionicons.glyphMap,
    editable = true,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default'
  ) => (
    <View style={[styles.inputField, { borderBottomColor: theme.borderPrimary }]}>
      <View style={styles.inputHeader}>
        <View style={[styles.inputIcon, { backgroundColor: theme.bgTertiary }]}>
          <Ionicons name={icon} size={16} color={designTokens.colors.heroGreen} />
        </View>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <TextInput
        style={[
          styles.textInput,
          { color: theme.textPrimary, backgroundColor: editMode && editable ? theme.bgTertiary : 'transparent' }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        editable={editMode && editable}
        keyboardType={keyboardType}
      />
    </View>
  );

  const renderToggleSetting = (
    label: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={[styles.toggleSetting, { borderBottomColor: theme.borderPrimary }]}>
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, { backgroundColor: theme.bgTertiary }]}>
          <Ionicons name={icon} size={20} color={designTokens.colors.heroGreen} />
        </View>
        <View style={styles.toggleText}>
          <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>{label}</Text>
          <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.borderPrimary,
          true: designTokens.colors.heroGreen
        }}
        thumbColor={value ? designTokens.colors.pureWhite : theme.bgPrimary}
        disabled={!editMode}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator size="large" color={designTokens.colors.heroGreen} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading account details...</Text>
      </View>
    );
  }

  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();
  const isPremium = profile?.subscription_status === 'active';

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.cardBackground, theme.bgSecondary]}
        style={[styles.header, { borderBottomColor: theme.borderPrimary }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.bgTertiary }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={editMode ? handleSaveProfile : () => setEditMode(true)}
            style={[styles.editButton, { backgroundColor: editMode ? designTokens.colors.heroGreen : theme.bgTertiary }]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={designTokens.colors.pureWhite} />
            ) : (
              <Ionicons 
                name={editMode ? "checkmark" : "pencil"} 
                size={20} 
                color={editMode ? designTokens.colors.pureWhite : designTokens.colors.heroGreen} 
              />
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>👤 Account Details</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Manage your profile and preferences
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={[styles.avatar, { backgroundColor: theme.bgTertiary }]}
              onPress={editMode ? handleImagePicker : undefined}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={designTokens.colors.heroGreen} />
              ) : profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: designTokens.colors.heroGreen }]}>
                  {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
              {editMode && !uploadingImage && (
                <View style={styles.avatarEditOverlay}>
                  <Ionicons name="camera" size={16} color={designTokens.colors.pureWhite} />
                </View>
              )}
            </TouchableOpacity>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <LinearGradient
                  colors={[designTokens.colors.amber[400], designTokens.colors.amber[600]]}
                  style={styles.premiumBadgeGradient}
                >
                  <Ionicons name="star" size={12} color={designTokens.colors.pureWhite} />
                </LinearGradient>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
              {profile?.full_name || 'Welcome!'}
            </Text>
            {profile?.username && (
              <Text style={[styles.profileUsername, { color: designTokens.colors.heroGreen }]}>
                @{profile.username}
              </Text>
            )}
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
              {profile?.email}
            </Text>
            <Text style={[styles.memberSince, { color: theme.textTertiary }]}>
              Member since {memberSince} • {isPremium ? 'Premium' : 'Free'} plan
            </Text>
          </View>
        </View>

        {/* Basic Information */}
        {renderSection('Basic Information', (
          <>
            {renderInputField(
              'Username',
              formData.username,
              (text) => setFormData({ ...formData, username: text }),
              'Enter your username',
              'person'
            )}
            {renderInputField(
              'Full Name',
              formData.full_name,
              (text) => setFormData({ ...formData, full_name: text }),
              'Enter your full name',
              'person'
            )}
            {renderInputField(
              'Email',
              profile?.email || '',
              () => {},
              'Your email address',
              'mail',
              false,
              'email-address'
            )}
            {renderInputField(
              'Phone',
              formData.phone,
              (text) => setFormData({ ...formData, phone: text }),
              'Enter your phone number',
              'call',
              true,
              'phone-pad'
            )}
          </>
        ))}

        {/* Notification Settings */}
        {renderSection('Notifications', (
          <>
            {renderToggleSetting(
              'Push Notifications',
              'Receive notifications about expiring items and household activity',
              notificationSettings.notifications_enabled,
              (value) => setNotificationSettings({ ...notificationSettings, notifications_enabled: value }),
              'notifications'
            )}
            {renderToggleSetting(
              'Expiry Reminders',
              'Get reminded when your items are about to expire',
              notificationSettings.expiry_reminders,
              (value) => setNotificationSettings({ ...notificationSettings, expiry_reminders: value }),
              'time'
            )}
          </>
        ))}

        {/* Account Management */}
        {renderSection('Account Management', (
          <>
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: theme.borderPrimary }]}
              onPress={() => Alert.alert('Coming Soon', 'Data export feature coming soon!')}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: theme.bgTertiary }]}>
                  <Ionicons name="download" size={20} color={designTokens.colors.ocean} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Export Data</Text>
                  <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>Download your account data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: theme.borderPrimary }]}
              onPress={() => {
                Alert.alert(
                  'Change Password',
                  'You will receive an email with instructions to reset your password.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send Email',
                      onPress: async () => {
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(profile?.email || '');
                          if (error) throw error;
                          Alert.alert('Email Sent', 'Check your email for password reset instructions.');
                        } catch (error) {
                          Alert.alert('Error', 'Failed to send reset email. Please try again.');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: theme.bgTertiary }]}>
                  <Ionicons name="key" size={20} color={designTokens.colors.sunset} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Change Password</Text>
                  <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>Update your account password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: 'transparent' }]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trash" size={20} color={designTokens.colors.expiredRed} />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: designTokens.colors.expiredRed }]}>Delete Account</Text>
                  <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>Permanently delete your account</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          </>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            Your data is secure and encrypted
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumBadgeGradient: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  memberSince: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionContent: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputField: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  textInput: {
    fontSize: 16,
    fontFamily: 'Inter',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 40,
  },
  toggleSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  avatarEditOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
  },
}); 