import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../constants/DesignTokens';
import { analytics } from '../../lib/analytics';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ProfileSetupScreenProps {
  navigation: any;
}

export default function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const { user } = useAuth();
  const fadeInOpacity = useRef(new Animated.Value(0)).current;
  const slideUpTransform = useRef(new Animated.Value(50)).current;
  const enterTime = useRef(Date.now()).current;

  useEffect(() => {
    analytics.track('onboarding_profile_setup_viewed', {
      timestamp: Date.now(),
      screen: 'profile_setup'
    });

    startAnimations();
    loadExistingProfile();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeInOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpTransform, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadExistingProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setUsername(profile.username || '');
        setPhone(profile.phone || '');
        setAvatarUri(profile.avatar_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
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
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfileImage = async (uri: string) => {
    try {
      // For now, just store the local URI
      // In production, you'd upload to Supabase Storage
      setAvatarUri(uri);
      setUploadingImage(false);
      
      // TODO: Implement actual image upload to Supabase Storage
      // const fileExt = uri.split('.').pop();
      // const fileName = `${user?.id}.${fileExt}`;
      // const filePath = `avatars/${fileName}`;
      
      analytics.track('onboarding_profile_image_selected', {
        timestamp: Date.now(),
        screen: 'profile_setup'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const validateUsername = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim()) return true; // Username is optional
    
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(usernameToCheck.trim())) {
      return false;
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameToCheck.trim())
      .neq('id', user?.id)
      .single();

    return !existingUser;
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }

    if (username.trim() && !(await validateUsername(username))) {
      Alert.alert('Invalid Username', 'Username must be 3-20 characters long, contain only letters, numbers, and underscores, and be unique.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      analytics.track('onboarding_profile_save_attempted', {
        timestamp: Date.now(),
        screen: 'profile_setup',
        has_username: !!username.trim(),
        has_phone: !!phone.trim(),
        has_avatar: !!avatarUri
      });

      const profileData = {
        id: user?.id,
        email: user?.email,
        full_name: fullName.trim(),
        username: username.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUri,
        notifications_enabled: true,
        expiry_reminders: true,
        subscription_status: 'free',
        max_items: 20,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      // Also ensure notification preferences exist
      const { error: prefsError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user?.id,
          expiry_notifications: true,
          expiry_notification_hours: 24,
          recipe_notifications: true,
          shopping_list_notifications: true,
          household_notifications: true,
          marketing_notifications: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (prefsError) {
        console.error('Warning: Failed to create notification preferences:', prefsError);
        // Don't fail the whole process for this
      }

      analytics.track('onboarding_profile_save_success', {
        timestamp: Date.now(),
        screen: 'profile_setup'
      });

      navigation.navigate('Permissions');
    } catch (error: any) {
      console.error('Profile save error:', error);
      
      analytics.track('onboarding_profile_save_failed', {
        timestamp: Date.now(),
        screen: 'profile_setup',
        error: error?.message || 'Unknown error'
      });

      Alert.alert(
        'Profile Save Failed',
        error?.message || 'Failed to save profile. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const timeSpent = Date.now() - enterTime;
    analytics.track('onboarding_profile_setup_skipped', {
      timestamp: Date.now(),
      screen: 'profile_setup',
      time_spent_seconds: Math.round(timeSpent / 1000)
    });

    navigation.navigate('Permissions');
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_profile_setup_back_pressed', {
      timestamp: Date.now(),
      screen: 'profile_setup'
    });

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.deepCharcoal} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={[
          styles.content,
          {
            opacity: fadeInOpacity,
            transform: [{ translateY: slideUpTransform }],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Let's personalize your FridgeHero experience
          </Text>
        </View>

        {/* Profile Form */}
        <View style={styles.formSection}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleImagePicker}
              disabled={uploadingImage}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Ionicons name="person" size={40} color={designTokens.colors.gray[400]} />
                </View>
              )}
              
              <View style={styles.avatarOverlay}>
                {uploadingImage ? (
                  <Text style={styles.avatarOverlayText}>Uploading...</Text>
                ) : (
                  <>
                    <Ionicons name="camera" size={16} color={designTokens.colors.pureWhite} />
                    <Text style={styles.avatarOverlayText}>
                      {avatarUri ? 'Change' : 'Add Photo'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Optional: Add a profile picture</Text>
          </View>

          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="person" 
                size={20} 
                color={designTokens.colors.gray[500]} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor={designTokens.colors.gray[400]}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="at" 
                size={20} 
                color={designTokens.colors.gray[500]} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Choose a unique username"
                placeholderTextColor={designTokens.colors.gray[400]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
            <Text style={styles.inputHint}>
              3-20 characters, letters, numbers, and underscores only
            </Text>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="call" 
                size={20} 
                color={designTokens.colors.gray[500]} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your phone number"
                placeholderTextColor={designTokens.colors.gray[400]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>
            <Text style={styles.inputHint}>
              Optional: For household notifications and sharing
            </Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSaveProfile}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>Saving Profile...</Text>
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={designTokens.colors.pureWhite}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip Option */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.pureWhite,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  formSection: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designTokens.colors.gray[200],
    borderStyle: 'dashed',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarOverlayText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  avatarHint: {
    fontSize: 14,
    color: designTokens.colors.gray[500],
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
    color: designTokens.colors.deepCharcoal,
  },
  inputHint: {
    fontSize: 14,
    color: designTokens.colors.gray[500],
    fontFamily: 'Inter',
    marginTop: 6,
    lineHeight: 20,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textDecorationLine: 'underline',
  },
}); 