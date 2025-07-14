import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../constants/DesignTokens';
import { analytics } from '../../lib/analytics';
import { NotificationPermissionManager } from '../../lib/notification-permissions';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

interface PermissionsScreenProps {
  navigation: any;
}

interface Permission {
  id: string;
  title: string;
  description: string;
  benefit: string;
  icon: string;
  color: string;
  required: boolean;
  granted: boolean;
}

export default function PermissionsScreen({ navigation }: PermissionsScreenProps) {
  const { completeOnboarding, refreshOnboardingStatus } = useOnboarding();
  const { user } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  
  // Check if running on emulator/simulator
  const isEmulator = !Device.isDevice;
  
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: isEmulator ? 'Simulate push notifications (Emulator Mode)' : 'Get alerts before food expires',
      benefit: 'Never waste food again with timely reminders',
      icon: 'notifications',
      color: designTokens.colors.heroGreen,
      required: true,
      granted: isEmulator, // Auto-grant on emulator
    },
    {
      id: 'camera',
      title: 'Camera Access',
      description: isEmulator ? 'Simulate camera access (Emulator Mode)' : 'Scan barcodes to add items quickly',
      benefit: 'Add groceries in seconds instead of typing',
      icon: 'camera',
      color: designTokens.colors.primary[500],
      required: true,
      granted: isEmulator, // Auto-grant on emulator
    },
    {
      id: 'location',
      title: 'Location Services',
      description: isEmulator ? 'Simulate location services (Emulator Mode)' : 'Get shopping reminders near stores',
      benefit: 'Smart reminders when you\'re out shopping',
      icon: 'location',
      color: designTokens.colors.alertAmber,
      required: false,
      granted: isEmulator, // Auto-grant on emulator
    },
  ]);

  const [currentPermissionIndex, setCurrentPermissionIndex] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const fadeInOpacity = useRef(new Animated.Value(0)).current;
  const slideUpTransform = useRef(new Animated.Value(50)).current;
  const permissionAnimation = useRef(new Animated.Value(0)).current;
  const enterTime = useRef(Date.now()).current;

  useEffect(() => {
    // Track screen view
    analytics.track('onboarding_permissions_viewed', {
      timestamp: Date.now(),
      screen: 'permissions',
      is_emulator: isEmulator
    });

    startAnimations();
    checkExistingPermissions();
    
    // Show emulator notice (less disruptive)
    if (isEmulator) {
      console.log('🧪 Emulator Mode: Permissions will be simulated for testing');
      // Show a less disruptive message
      setTimeout(() => {
        Alert.alert(
          '🧪 Emulator Mode',
          'Permissions will be automatically granted for testing purposes.',
          [{ text: 'Continue' }],
          { cancelable: true }
        );
      }, 500); // Shorter delay
    }
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

    animatePermissionCard();
  };

  const animatePermissionCard = () => {
    permissionAnimation.setValue(0);
    Animated.spring(permissionAnimation, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const checkExistingPermissions = async () => {
    const newPermissions = [...permissions];

    // Check notification permissions
    const notificationState = await NotificationPermissionManager.checkPermissionStatus();
    newPermissions[0].granted = notificationState.hasPermission;

    // Check camera permissions
    newPermissions[1].granted = cameraPermission?.granted || false;

    // Check location permissions
    const locationStatus = await Location.getForegroundPermissionsAsync();
    newPermissions[2].granted = locationStatus.status === 'granted';

    setPermissions(newPermissions);
  };

  const requestPermission = async (permissionId: string) => {
    setIsRequesting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let granted = false;
      let permissionName = '';

      if (isEmulator) {
        // Simulate permission grant on emulator
        granted = true;
        permissionName = permissionId;
        
        // Add small delay to simulate real permission flow
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } else {
        // Real device permission requests
        switch (permissionId) {
          case 'notifications':
            permissionName = 'notifications';
            const notificationState = await NotificationPermissionManager.requestPermissionsWithExplanation();
            granted = notificationState.hasPermission;
            break;
          
          case 'camera':
            permissionName = 'camera';
            const cameraResult = await requestCameraPermission();
            granted = cameraResult?.granted || false;
            break;
          
          case 'location':
            permissionName = 'location';
            const locationResult = await Location.requestForegroundPermissionsAsync();
            granted = locationResult.status === 'granted';
            break;
        }
      }

      // Update permission state
      const newPermissions = permissions.map(p => 
        p.id === permissionId ? { ...p, granted } : p
      );
      setPermissions(newPermissions);

      // Track permission result
      analytics.track('onboarding_permission_requested', {
        timestamp: Date.now(),
        screen: 'permissions',
        permission: permissionName,
        granted,
        required: permissions.find(p => p.id === permissionId)?.required,
        is_emulator: isEmulator
      });

      if (granted) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

    } catch (error: any) {
      console.error('Permission request failed:', error);
      
      analytics.track('onboarding_permission_failed', {
        timestamp: Date.now(),
        screen: 'permissions',
        permission: permissionId,
        error: error?.message || 'Unknown error',
        is_emulator: isEmulator
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNext = () => {
    const currentPermission = permissions[currentPermissionIndex];
    
    if (currentPermissionIndex < permissions.length - 1) {
      // Move to next permission
      setCurrentPermissionIndex(currentPermissionIndex + 1);
      animatePermissionCard();
    } else {
      // All permissions handled, continue to app
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const timeSpent = Date.now() - enterTime;
    const grantedPermissions = permissions.filter(p => p.granted);
    const requiredPermissions = permissions.filter(p => p.required);
    const grantedRequired = requiredPermissions.filter(p => p.granted);
    
    analytics.track('onboarding_permissions_completed', {
      timestamp: Date.now(),
      screen: 'permissions',
      time_spent_seconds: Math.round(timeSpent / 1000),
      total_permissions: permissions.length,
      granted_permissions: grantedPermissions.length,
      required_permissions: requiredPermissions.length,
      granted_required: grantedRequired.length,
      permission_details: permissions.map(p => ({
        id: p.id,
        granted: p.granted,
        required: p.required
      }))
    });

    // Check if all required permissions are granted
    const allRequiredGranted = requiredPermissions.every(p => p.granted);
    
    if (!allRequiredGranted) {
      Alert.alert(
        'Almost Done!',
        'Some features may be limited without the required permissions. You can always enable them later in Settings.',
        [
          { text: 'Continue Anyway', onPress: () => completeOnboardingFlow() },
          { text: 'Review Permissions', style: 'cancel' }
        ]
      );
    } else {
      completeOnboardingFlow();
    }
  };

  const completeOnboardingFlow = async () => {
    analytics.track('onboarding_completed', {
      timestamp: Date.now(),
      completion_method: 'permissions_screen'
    });

    console.log('🎯 🎉 Starting onboarding completion flow...');

    // Ensure profile is complete before completing onboarding
    await ensureProfileComplete();

    // Clear the onboarding flow flag in user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          in_onboarding_flow: false, // Clear the onboarding flag
          onboarding_completed: true, // Mark as completed
        }
      });
      console.log('🎯 ✅ Cleared onboarding flow flag and marked as completed');
    } catch (error) {
      console.log('🎯 ⚠️ Failed to clear onboarding flow flag:', error);
    }

    // Use the context method to properly complete onboarding
    await completeOnboarding();

    // Force a refresh of onboarding status to ensure state is updated
    await refreshOnboardingStatus();

    console.log('🎯 🎉 Onboarding completion flow finished - app should now show main screens');
  };

  const ensureProfileComplete = async () => {
    if (!user) {
      console.log('🎯 No user found, skipping profile completion check');
      return;
    }

    try {
      console.log('🎯 Checking if profile is complete...');
      
      // Check current profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, username, phone, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('🎯 Profile check failed:', error);
        return;
      }

      // Check if profile has minimal data (indicating incomplete save during registration)
      const hasMinimalData = profile && (
        !profile.full_name || 
        !profile.username
      );

      if (hasMinimalData) {
        console.log('🎯 Profile appears incomplete, checking if we can restore from user metadata...');
        
        // Try to get data from user metadata (this might have been set during registration)
        const userData = user.user_metadata;
        if (userData && (userData.full_name || userData.username)) {
          console.log('🎯 Found user metadata, updating profile...');
          
          const updates = {
            id: user.id,
            full_name: userData.full_name || profile.full_name,
            username: userData.username || profile.username,
            phone: userData.phone || profile.phone,
            avatar_url: userData.avatar_url || profile.avatar_url,
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (updateError) {
            console.log('🎯 Profile update failed:', updateError);
          } else {
            console.log('🎯 ✅ Profile completed successfully');
          }
        } else {
          console.log('🎯 No user metadata found to restore profile');
        }
      } else {
        console.log('🎯 ✅ Profile appears complete');
      }
    } catch (error) {
      console.error('🎯 Error ensuring profile complete:', error);
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_permissions_skipped', {
      timestamp: Date.now(),
      screen: 'permissions',
      current_permission: permissions[currentPermissionIndex]?.id,
      permissions_granted: permissions.filter(p => p.granted).length
    });

    handleNext();
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_permissions_back_pressed', {
      timestamp: Date.now(),
      screen: 'permissions'
    });

    navigation.goBack();
  };

  const currentPermission = permissions[currentPermissionIndex];
  const progress = ((currentPermissionIndex + 1) / permissions.length) * 100;

  const scale = permissionAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const opacity = permissionAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Header - Back button disabled during onboarding flow */}
      <View style={styles.header}>
        {/* Back button intentionally removed - users must complete onboarding flow */}
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentPermissionIndex + 1} of {permissions.length}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeInOpacity,
            transform: [{ translateY: slideUpTransform }],
          },
        ]}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Enable Key Features</Text>
          <Text style={styles.subtitle}>
            Allow these permissions to get the most out of FridgeHero
          </Text>
        </View>

        {/* Permission Card */}
        <Animated.View
          style={[
            styles.permissionCard,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <View style={[styles.permissionIcon, { backgroundColor: `${currentPermission?.color}15` }]}>
            <Ionicons
              name={currentPermission?.icon as any}
              size={48}
              color={currentPermission?.color}
            />
          </View>

          <Text style={styles.permissionTitle}>{currentPermission?.title}</Text>
          <Text style={styles.permissionDescription}>{currentPermission?.description}</Text>
          
          <View style={styles.benefitContainer}>
            <Ionicons name="checkmark-circle" size={20} color={designTokens.colors.heroGreen} />
            <Text style={styles.benefitText}>{currentPermission?.benefit}</Text>
          </View>

          {currentPermission?.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}

          {currentPermission?.granted && (
            <View style={styles.grantedBadge}>
              <Ionicons name="checkmark" size={16} color={designTokens.colors.pureWhite} />
              <Text style={styles.grantedText}>Granted</Text>
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {!currentPermission?.granted ? (
            <TouchableOpacity
              style={[styles.allowButton, { opacity: isRequesting ? 0.7 : 1 }]}
              onPress={() => requestPermission(currentPermission?.id)}
              disabled={isRequesting}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[currentPermission?.color, currentPermission?.color + 'CC']}
                style={styles.buttonGradient}
              >
                <Text style={styles.allowText}>
                  {isRequesting ? 'Requesting...' : `Allow ${currentPermission?.title}`}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={designTokens.colors.pureWhite}
                />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                style={styles.buttonGradient}
              >
                <Text style={styles.nextText}>
                  {currentPermissionIndex === permissions.length - 1 ? 'Finish Setup' : 'Next'}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={designTokens.colors.pureWhite}
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {!currentPermission?.required && !currentPermission?.granted && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          You can change these permissions anytime in your device settings
        </Text>
      </Animated.View>
    </View>
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
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: designTokens.colors.gray[200],
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: designTokens.colors.heroGreen,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
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
    paddingHorizontal: 16,
  },
  permissionCard: {
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[100],
    position: 'relative',
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  permissionDescription: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  benefitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${designTokens.colors.heroGreen}10`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${designTokens.colors.heroGreen}20`,
  },
  benefitText: {
    fontSize: 14,
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
    marginLeft: 8,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  requiredBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: designTokens.colors.expiredRed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  grantedBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: designTokens.colors.heroGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  grantedText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginLeft: 4,
  },
  actionSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  allowButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    marginBottom: 12,
  },
  nextButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    marginBottom: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  allowText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginRight: 8,
  },
  nextText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginRight: 8,
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
  infoText: {
    fontSize: 14,
    color: designTokens.colors.gray[500],
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
}); 