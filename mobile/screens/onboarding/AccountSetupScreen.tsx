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
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../constants/DesignTokens';
import { analytics } from '../../lib/analytics';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AccountSetupScreenProps {
  navigation: any;
}

export default function AccountSetupScreen({ navigation }: AccountSetupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();
  const fadeInOpacity = useRef(new Animated.Value(0)).current;
  const slideUpTransform = useRef(new Animated.Value(50)).current;
  const enterTime = useRef(Date.now()).current;

  useEffect(() => {
    // Track screen view
    analytics.track('onboarding_account_setup_viewed', {
      timestamp: Date.now(),
      screen: 'account_setup'
    });

    startAnimations();
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

  const handleGoogleSignUp = async () => {
    setOauthLoading('google');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    analytics.track('onboarding_google_signup_attempted', {
      timestamp: Date.now(),
      screen: 'account_setup'
    });

    const { error } = await signInWithGoogle();
    setOauthLoading(null);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to sign up with Google');
    } else {
      // Set onboarding flow flag for OAuth users
      try {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            in_onboarding_flow: true,
          }
        });
        
        if (metadataError) {
          console.log('🔐 ⚠️ Failed to set onboarding flag for OAuth user:', metadataError);
        } else {
          console.log('🔐 ✅ Set onboarding flag for OAuth user');
        }
      } catch (error) {
        console.log('🔐 ⚠️ Error setting onboarding flag for OAuth user:', error);
      }
      
      // Navigate to household setup screen (OnboardingContext will automatically detect the new user)
      navigation.navigate('HouseholdSetup');
    }
  };

  const handleAppleSignUp = async () => {
    setOauthLoading('apple');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    analytics.track('onboarding_apple_signup_attempted', {
      timestamp: Date.now(),
      screen: 'account_setup'
    });

    const { error } = await signInWithApple();
    setOauthLoading(null);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to sign up with Apple');
    } else {
      // Set onboarding flow flag for OAuth users
      try {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            in_onboarding_flow: true,
          }
        });
        
        if (metadataError) {
          console.log('🔐 ⚠️ Failed to set onboarding flag for OAuth user:', metadataError);
        } else {
          console.log('🔐 ✅ Set onboarding flag for OAuth user');
        }
      } catch (error) {
        console.log('🔐 ⚠️ Error setting onboarding flag for OAuth user:', error);
      }
      
      // Navigate to household setup screen (OnboardingContext will automatically detect the new user)
      navigation.navigate('HouseholdSetup');
    }
  };

  const renderOAuthButton = (
    provider: 'google' | 'apple',
    onPress: () => void,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    backgroundColor: string,
    textColor: string
  ) => (
    <TouchableOpacity
      style={[styles.oauthButton, { backgroundColor }]}
      onPress={onPress}
      disabled={isLoading || oauthLoading !== null}
      activeOpacity={0.8}
    >
      <View style={styles.oauthButtonContent}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={textColor} 
          style={styles.oauthIcon} 
        />
        <Text style={[styles.oauthButtonText, { color: textColor }]}>
          {oauthLoading === provider ? 'Connecting...' : label}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
      
      analytics.track('onboarding_profile_image_selected', {
        timestamp: Date.now(),
        screen: 'account_setup'
      });

      // Don't navigate immediately - let the user complete the form first
      // navigation.navigate('HouseholdSetup');
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter a password.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both password fields match.');
      return false;
    }

    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return false;
    }

    if (!username.trim()) {
      Alert.alert('Username Required', 'Please choose a username.');
      return false;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      Alert.alert('Invalid Username', 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
      return false;
    }

    // Phone is optional, but if provided, it should look reasonable
    if (phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
      if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
        return false;
      }
    }

    return true;
  };

  const validateUsername = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim()) return false; // Username is required
    
    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameToCheck.trim())
      .single();

    return !existingUser;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) {
      return;
    }

    // Check username availability
    if (!(await validateUsername(username))) {
      Alert.alert('Username Taken', 'This username is already taken. Please choose a different one.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      analytics.track('onboarding_account_creation_attempted', {
        timestamp: Date.now(),
        screen: 'account_setup',
        has_username: !!username.trim(),
        has_phone: !!phone.trim(),
        has_avatar: !!avatarUri
      });

      // Step 1: Create the auth user
      console.log('🔐 Creating account for:', email);
      const { error: signUpError, isNewUser } = await signUp(email, password);

      if (signUpError) {
        throw signUpError;
      }

      console.log('🔐 Account created successfully');

      // Step 2: Get the current user and update metadata
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not found after signup');
      }

      // Store profile data in user metadata as backup
      console.log('🔐 Storing profile data in user metadata...');
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          username: username.trim(),
          phone: phone.trim() || null,
          avatar_url: avatarUri,
          in_onboarding_flow: true,
        }
      });

      if (metadataError) {
        console.log('🔐 ⚠️ Failed to store metadata:', metadataError);
        // Don't fail signup for this
      } else {
        console.log('🔐 ✅ Profile data stored in metadata');
      }

      // Step 3: Create the profile with all the collected data
      console.log('🔐 Creating user profile...');
      
      // Create profile with all data in one upsert (more resilient to schema cache issues)
      const profileData = {
        id: user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUri,
        subscription_status: 'free',
        notifications_enabled: true,
        expiry_reminders: true,
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError, data: createdProfile } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('🔐 Profile creation failed:', profileError);
        
        // If full profile creation fails, try with just essential data
        console.log('🔐 Trying fallback profile creation with essential data only...');
        const essentialProfileData = {
          id: user.id,
          email: email.trim(),
          subscription_status: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: essentialError } = await supabase
          .from('profiles')
          .upsert(essentialProfileData);

        if (essentialError) {
          console.error('🔐 Essential profile creation also failed:', essentialError);
          throw essentialError;
        }

        console.log('🔐 ✅ Essential profile created as fallback - full data will be restored later');
      } else {
        console.log('🔐 ✅ Complete profile created successfully:', createdProfile);
      }

      // Step 4: Create notification preferences (optional - don't fail signup if this fails)
      try {
        const { error: prefsError } = await supabase
          .from('notification_preferences')
          .upsert({
            user_id: user.id,
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
          console.log('🔐 ⚠️ Failed to create notification preferences:', prefsError);
        } else {
          console.log('🔐 ✅ Notification preferences created');
        }
      } catch (error) {
        console.log('🔐 ⚠️ Notification preferences creation failed:', error);
        // Don't fail signup for this
      }

      analytics.track('onboarding_account_creation_success', {
        timestamp: Date.now(),
        screen: 'account_setup',
        user_id: user.id
      });

      // Navigate to household setup screen (OnboardingContext will automatically detect the new user)
      navigation.navigate('HouseholdSetup');

    } catch (error: any) {
      console.error('🔐 Account creation failed:', error);
      
      analytics.track('onboarding_account_creation_failed', {
        timestamp: Date.now(),
        screen: 'account_setup',
        error: error?.message || 'Unknown error'
      });

      Alert.alert(
        'Account Creation Failed',
        error?.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlreadyHaveAccount = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const timeSpent = Date.now() - enterTime;
    analytics.track('onboarding_already_have_account_pressed', {
      timestamp: Date.now(),
      screen: 'account_setup',
      time_spent_seconds: Math.round(timeSpent / 1000)
    });

    navigation.navigate('Login');
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_account_setup_back_pressed', {
      timestamp: Date.now(),
      screen: 'account_setup'
    });

    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[designTokens.colors.green[50], designTokens.colors.pureWhite]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={designTokens.colors.deepCharcoal} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.ScrollView
            style={[
              styles.content,
              {
                opacity: fadeInOpacity,
                transform: [{ translateY: slideUpTransform }],
              },
            ]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="leaf" size={28} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.appName}>FridgeHero</Text>
              <Text style={styles.mainTitle}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                Join us and start reducing food waste today
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.8)']}
                style={styles.formGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* OAuth Section */}
                <View style={styles.oauthSection}>
                  {renderOAuthButton(
                    'google',
                    handleGoogleSignUp,
                    'logo-google',
                    'Continue with Google',
                    designTokens.colors.pureWhite,
                    designTokens.colors.deepCharcoal
                  )}
                  
                  {Platform.OS === 'ios' && renderOAuthButton(
                    'apple',
                    handleAppleSignUp,
                    'logo-apple',
                    'Continue with Apple',
                    designTokens.colors.deepCharcoal,
                    designTokens.colors.pureWhite
                  )}
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or create manually</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Profile Picture Section */}
                <View style={styles.avatarSection}>
                  <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handleImagePicker}
                    disabled={uploadingImage}
                    activeOpacity={0.8}
                  >
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                      <View style={styles.defaultAvatar}>
                        <Image 
                          source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b1c5?w=150&h=150&fit=crop&crop=face&auto=format' }}
                          style={styles.exampleAvatar}
                        />
                        <View style={styles.avatarOverlay}>
                          <Ionicons name="camera" size={14} color={designTokens.colors.pureWhite} />
                        </View>
                      </View>
                    )}
                    
                    {avatarUri && (
                      <View style={styles.avatarOverlay}>
                        {uploadingImage ? (
                          <Text style={styles.avatarOverlayText}>...</Text>
                        ) : (
                          <Ionicons name="camera" size={14} color={designTokens.colors.pureWhite} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.avatarHint}>Profile picture (optional)</Text>
                </View>

                {/* Form Inputs */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor={designTokens.colors.gray[400]}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isLoading && oauthLoading === null}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Create a password"
                      placeholderTextColor={designTokens.colors.gray[400]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      editable={!isLoading && oauthLoading === null}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color={designTokens.colors.gray[400]} 
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      placeholderTextColor={designTokens.colors.gray[400]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      editable={!isLoading && oauthLoading === null}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color={designTokens.colors.gray[400]} 
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor={designTokens.colors.gray[400]}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      autoComplete="name"
                      editable={!isLoading && oauthLoading === null}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="at-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Choose a username"
                      placeholderTextColor={designTokens.colors.gray[400]}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      editable={!isLoading && oauthLoading === null}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone number (optional)"
                      placeholderTextColor={designTokens.colors.gray[400]}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      editable={!isLoading && oauthLoading === null}
                    />
                  </View>
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, (isLoading || oauthLoading !== null) && styles.buttonDisabled]}
                  onPress={handleCreateAccount}
                  disabled={isLoading || oauthLoading !== null}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={(isLoading || oauthLoading !== null)
                      ? [designTokens.colors.gray[400], designTokens.colors.gray[500]]
                      : [designTokens.colors.heroGreen, designTokens.colors.green[600]]
                    }
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.buttonText}>Creating Account...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Create Account</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Terms */}
                <Text style={styles.termsText}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </LinearGradient>
            </View>

            {/* Already have account option */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleAlreadyHaveAccount}
              disabled={isLoading || oauthLoading !== null}
            >
              <Text style={styles.loginButtonText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: designTokens.spacing.xl,
    paddingBottom: designTokens.spacing.sm,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: designTokens.spacing.xl,
    paddingBottom: designTokens.spacing.xl,
    flexGrow: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  logoContainer: {
    marginBottom: designTokens.spacing.md,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  appName: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    textAlign: 'center',
    marginBottom: designTokens.spacing.xs,
    lineHeight: designTokens.typography.fontSize['2xl'] * 1.2,
  },
  mainTitle: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    textAlign: 'center',
    marginBottom: designTokens.spacing.xs,
    lineHeight: designTokens.typography.fontSize['2xl'] * 1.2,
  },
  subtitle: {
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize.base * 1.3,
    paddingHorizontal: 0,
  },
  formContainer: {
    marginBottom: designTokens.spacing.md,
  },
  formGradient: {
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  oauthSection: {
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },
  oauthButton: {
    borderRadius: designTokens.borderRadius.md,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  oauthButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  oauthIcon: {
    marginRight: designTokens.spacing.sm,
  },
  oauthButtonText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: '500',
    fontFamily: designTokens.typography.primary,
    lineHeight: designTokens.typography.fontSize.sm * 1.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: designTokens.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designTokens.colors.gray[200],
  },
  dividerText: {
    marginHorizontal: designTokens.spacing.sm,
    color: designTokens.colors.gray[400],
    fontSize: designTokens.typography.fontSize.xs,
    fontFamily: designTokens.typography.primary,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: designTokens.spacing.xs,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: designTokens.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designTokens.colors.gray[300],
    borderStyle: 'dashed',
  },
  exampleAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: 16,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  avatarOverlayText: {
    fontSize: designTokens.typography.fontSize.xs,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: designTokens.typography.primary,
  },
  avatarHint: {
    fontSize: designTokens.typography.fontSize.xs,
    color: designTokens.colors.gray[500],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
  },
  inputContainer: {
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    paddingHorizontal: designTokens.spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: designTokens.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.primary,
    paddingVertical: designTokens.spacing.sm,
    lineHeight: designTokens.typography.fontSize.base * 1.2,
  },
  passwordToggle: {
    padding: designTokens.spacing.xs,
  },
  primaryButton: {
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
  },
  buttonDisabled: {
    elevation: 1,
    shadowOpacity: 0.08,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.lg,
    minHeight: 48,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: designTokens.typography.primary,
    marginRight: designTokens.spacing.sm,
  },
  termsText: {
    fontSize: designTokens.typography.fontSize.xs,
    color: designTokens.colors.gray[500],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize.xs * 1.4,
    marginBottom: designTokens.spacing.sm,
  },
  termsLink: {
    color: designTokens.colors.heroGreen,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: designTokens.borderRadius.md,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    backgroundColor: `${designTokens.colors.heroGreen}15`,
    borderWidth: 1,
    borderColor: `${designTokens.colors.heroGreen}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: designTokens.spacing.sm,
  },
  loginButtonText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: '500',
    color: designTokens.colors.heroGreen,
    fontFamily: designTokens.typography.primary,
    lineHeight: designTokens.typography.fontSize.sm * 1.2,
  },
}); 