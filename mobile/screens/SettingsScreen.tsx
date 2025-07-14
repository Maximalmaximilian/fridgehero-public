import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { designTokens } from '../constants/DesignTokens';
import { stripeService } from '../lib/stripe';
import { DebugService } from '../lib/debug';
import { NotificationTester } from '../lib/notification-testing';
import { NotificationPermissionManager } from '../lib/notification-permissions';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useInvitations } from '../contexts/InvitationContext';
import ProfileAvatar from '../components/ProfileAvatar';
import NotificationBadge from '../components/NotificationBadge';
import FeedbackModal, { FeedbackType } from '../components/FeedbackModal';

export default function SettingsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [expiryReminders, setExpiryReminders] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | undefined>(undefined);
  const { user, signOut } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const { resetOnboarding } = useOnboarding();
  const { households, selectedHousehold } = useHousehold();
  const { pendingInvitations, pendingCount, markInvitationsAsViewed } = useInvitations();
  
  // Use the optimized subscription context instead of manual state management
  const { 
    isPremium, 
    loading: subscriptionLoading,
    hasLoaded: subscriptionHasLoaded,
    limits,
    refreshSubscription 
  } = useSubscription();

  // Track banner visibility state
  const [shouldShowBanner, setShouldShowBanner] = useState(false);
  
  // Animation for smooth banner appearance
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const [showDebugSection, setShowDebugSection] = useState(__DEV__);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Track subscription loading state to prevent banner flickering
  useEffect(() => {
    if (subscriptionHasLoaded) {
      const shouldShow = !isPremium;
      
      if (shouldShow !== shouldShowBanner) {
        if (shouldShow) {
          setShouldShowBanner(true);
          Animated.timing(bannerOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.timing(bannerOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShouldShowBanner(false);
          });
        }
      }
    }
  }, [subscriptionHasLoaded, isPremium, shouldShowBanner]);

  useFocusEffect(
    React.useCallback(() => {
      // Only refresh subscription if we've had an initial load
      // This prevents the loading flash on navigation
      if (subscriptionHasLoaded) {
        console.log('⚙️ Settings focused - refreshing subscription status');
        refreshSubscription();
      }
    }, [refreshSubscription, subscriptionHasLoaded])
  );

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDebugSetSubscription = (status: string) => {
    Alert.alert(
      '🐛 Debug: Set Subscription',
      `Set subscription to: ${status.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: async () => {
            await DebugService.setSubscriptionStatus(status as any);
            await refreshSubscription();
          }
        }
      ]
    );
  };

  const handleDebugResetTrial = () => {
    Alert.alert(
      '🐛 Debug: Reset Trial',
      'Reset trial eligibility so user can start trial again?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await DebugService.resetTrialEligibility();
            await refreshSubscription();
          }
        }
      ]
    );
  };

  const handleDebugExpiringTrial = () => {
    Alert.alert(
      '🐛 Debug: Expiring Trial',
      'Start a trial that expires in 2 minutes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            await DebugService.startExpiringTrial(2);
            await refreshSubscription();
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => signOut()
        }
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

  const renderSettingRow = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    subtitle: string,
    onPress?: () => void,
    rightContent?: React.ReactNode,
    showChevron = true
  ) => (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: theme.borderPrimary }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: theme.bgTertiary }]}>
          <Ionicons name={icon} size={20} color={designTokens.colors.heroGreen} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightContent}
        {showChevron && onPress && (
          <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPremiumBanner = () => {
    // Only show banner after initial load and for free users
    // This prevents flickering during navigation and subscription state changes
    if (!shouldShowBanner) return null;

    return (
      <Animated.View style={[styles.premiumBanner, { opacity: bannerOpacity }]}>
        <LinearGradient
          colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
          style={styles.premiumBannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.premiumBannerContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.premiumBannerHeader}>
              <View style={[styles.premiumBannerIcon, { backgroundColor: theme.bgTertiary }]}>
                <Ionicons name="star" size={24} color={designTokens.colors.heroGreen} />
              </View>
              <View style={styles.premiumBannerText}>
                <Text style={[styles.premiumBannerTitle, { color: theme.textPrimary }]}>Upgrade to Premium</Text>
                <Text style={[styles.premiumBannerSubtitle, { color: theme.textSecondary }]}>
                  Unlock unlimited items and advanced features
                </Text>
              </View>
            </View>
            
            <PremiumBannerStats />
            
            <TouchableOpacity
              style={[styles.premiumBannerButton, { backgroundColor: theme.bgTertiary }]}
              onPress={() => navigation.navigate('Premium')}
            >
              <Text style={[styles.premiumBannerButtonText, { color: theme.textPrimary }]}>See Plans</Text>
              <Ionicons name="arrow-forward" size={16} color={designTokens.colors.heroGreen} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Separate component for Premium banner stats to handle async data loading
  const PremiumBannerStats = () => {
    const [householdLimits, setHouseholdLimits] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
      const loadHouseholdLimits = async () => {
        if (selectedHousehold?.household_id) {
          try {
            setStatsLoading(true);
            const limits = await stripeService.checkFreeTierLimits(selectedHousehold.household_id);
            setHouseholdLimits(limits);
          } catch (error) {
            console.error('Error loading household limits:', error);
          } finally {
            setStatsLoading(false);
          }
        } else {
          setStatsLoading(false);
        }
      };

      loadHouseholdLimits();
    }, [selectedHousehold?.household_id]);

    // Show placeholder during loading to prevent layout shift
    if (statsLoading || !householdLimits) {
      return (
        <View style={styles.premiumBannerStats}>
          <View style={styles.premiumBannerStat}>
            <Text style={[styles.premiumBannerStatNumber, { color: theme.textTertiary }]}>
              --/--
            </Text>
            <Text style={[styles.premiumBannerStatLabel, { color: theme.textSecondary }]}>Items Used</Text>
          </View>
          <View style={styles.premiumBannerStat}>
            <Text style={[styles.premiumBannerStatNumber, { color: theme.textTertiary }]}>
              --
            </Text>
            <Text style={[styles.premiumBannerStatLabel, { color: theme.textSecondary }]}>Remaining</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.premiumBannerStats}>
        <View style={styles.premiumBannerStat}>
          <Text style={[styles.premiumBannerStatNumber, { color: theme.textPrimary }]}>
            {householdLimits.itemCount}/{householdLimits.itemLimit}
          </Text>
          <Text style={[styles.premiumBannerStatLabel, { color: theme.textSecondary }]}>Items Used</Text>
        </View>
        <View style={styles.premiumBannerStat}>
          <Text style={[styles.premiumBannerStatNumber, { color: theme.textPrimary }]}>
            {Math.max(0, householdLimits.itemLimit - householdLimits.itemCount)}
          </Text>
          <Text style={[styles.premiumBannerStatLabel, { color: theme.textSecondary }]}>Remaining</Text>
        </View>
      </View>
    );
  };

  const openFeedbackModal = (type?: FeedbackType) => {
    setFeedbackType(type);
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackType(undefined);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <LinearGradient
        colors={[theme.cardBackground, theme.bgSecondary]}
        style={[styles.header, { borderBottomColor: theme.borderPrimary }]}
      >
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>⚙️ Settings</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Manage your account and preferences
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {renderPremiumBanner()}
        </View>

        {renderSection('Profile', (
          <>
            {renderSettingRow(
              'person-circle',
              'Account Details',
              user?.email || 'Update your profile information',
              () => navigation.navigate('AccountDetails')
            )}
          </>
        ))}

        {renderSection('Appearance', (
          <>
            {renderSettingRow(
              isDark ? 'moon' : 'sunny',
              'Dark Mode',
              isDark ? 'Dark theme is active' : 'Light theme is active',
              undefined,
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ 
                  false: theme.borderPrimary, 
                  true: designTokens.colors.heroGreen 
                }}
                thumbColor={isDark ? designTokens.colors.pureWhite : theme.bgPrimary}
                style={styles.switch}
              />,
              false
            )}
          </>
        ))}

        {renderSection('Preferences', (
          <>
            {renderSettingRow(
              'people',
              'Households',
              pendingCount > 0 
                ? `${pendingCount} pending invitation${pendingCount > 1 ? 's' : ''}`
                : 'Manage your shared kitchens',
              () => {
                markInvitationsAsViewed();
                navigation.navigate('Households');
              },
              pendingCount > 0 && (
                <View style={{ position: 'relative' }}>
                  <NotificationBadge 
                    count={pendingCount} 
                    size="small" 
                    style={{ 
                      position: 'relative',
                      top: 0,
                      right: 0,
                      marginLeft: 8,
                    }}
                  />
                </View>
              )
            )}
            {renderSettingRow(
              'notifications',
              'Notifications',
              notificationsEnabled ? 'Enabled' : 'Disabled',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: theme.borderPrimary,
                  true: designTokens.colors.heroGreen
                }}
                thumbColor={notificationsEnabled ? designTokens.colors.pureWhite : theme.bgPrimary}
                style={styles.switch}
              />,
              false
            )}
            {renderSettingRow(
              'time',
              'Expiry Reminders',
              expiryReminders ? 'Enabled' : 'Disabled',
              undefined,
              <Switch
                value={expiryReminders}
                onValueChange={setExpiryReminders}
                trackColor={{
                  false: theme.borderPrimary,
                  true: designTokens.colors.heroGreen
                }}
                thumbColor={expiryReminders ? designTokens.colors.pureWhite : theme.bgPrimary}
                style={styles.switch}
              />,
              false
            )}
          </>
        ))}

        {renderSection('Support & Feedback', (
          <>
            {renderSettingRow(
              'chatbubble',
              'Give Feedback',
              'Share your thoughts and help us improve',
              () => openFeedbackModal('general'),
              undefined,
              true
            )}
            {renderSettingRow(
              'bug',
              'Report a Bug',
              'Something not working as expected?',
              () => openFeedbackModal('bug'),
              undefined,
              true
            )}
            {renderSettingRow(
              'bulb',
              'Request Feature',
              'Have an idea for a new feature?',
              () => openFeedbackModal('feature'),
              undefined,
              true
            )}
            {renderSettingRow(
              'help-circle',
              'Get Help',
              'Need assistance or have questions?',
              () => openFeedbackModal('help'),
              undefined,
              true
            )}
            {renderSettingRow(
              'document-text',
              'Privacy Policy',
              'How we handle your data',
              () => Alert.alert('Coming Soon', 'Privacy policy coming soon!')
            )}
            {renderSettingRow(
              'shield-checkmark',
              'Terms of Service',
              'Our terms and conditions',
              () => Alert.alert('Coming Soon', 'Terms of service coming soon!')
            )}
          </>
        ))}

        {showDebugSection && renderSection('🐛 Debug (DEV ONLY)', (
          <>
            {renderSettingRow(
              'information-circle',
              'Current Subscription Info',
              'View current subscription details',
              () => DebugService.showSubscriptionInfo()
            )}
            {renderSettingRow(
              'person',
              'Set to FREE',
              'Debug: Set subscription to free tier',
              () => handleDebugSetSubscription('free')
            )}
            {renderSettingRow(
              'star',
              'Set to PREMIUM',
              'Debug: Set subscription to active premium',
              () => handleDebugSetSubscription('active')
            )}
            {renderSettingRow(
              'gift',
              'Set to TRIAL',
              'Debug: Set subscription to trialing (7 days)',
              () => handleDebugSetSubscription('trialing')
            )}
            {renderSettingRow(
              'refresh',
              'Reset Trial Eligibility',
              'Debug: Allow user to start trial again',
              () => handleDebugResetTrial()
            )}
            {renderSettingRow(
              'timer',
              'Expiring Trial (2 min)',
              'Debug: Start trial that expires quickly',
              () => handleDebugExpiringTrial()
            )}
            
            <View style={[styles.debugSeparator, { backgroundColor: theme.borderPrimary }]} />
            <Text style={[styles.debugSectionTitle, { color: theme.textSecondary }]}>
              🔔 NOTIFICATION TESTING
            </Text>
            
            {renderSettingRow(
              'notifications',
              'Request Permissions',
              'Test permission request flow',
              async () => {
                const state = await NotificationPermissionManager.requestPermissionsWithExplanation();
                const description = NotificationPermissionManager.getPermissionStatusDescription(state);
                Alert.alert('Permission Result', description);
              }
            )}
            
            {renderSettingRow(
              'checkmark-circle',
              'Basic Test Notification',
              'Send simple test notification',
              () => NotificationTester.testBasicNotification()
            )}
            
            {renderSettingRow(
              'warning',
              'Test Expiry Alert',
              'Test food expiry notification',
              () => NotificationTester.testExpiryAlert()
            )}
            
            {renderSettingRow(
              'restaurant',
              'Test Recipe Suggestion',
              'Test recipe notification',
              () => NotificationTester.testRecipeSuggestion()
            )}
            
            {renderSettingRow(
              'bag',
              'Test Shopping Reminder',
              'Test shopping notification',
              () => NotificationTester.testShoppingReminder()
            )}
            
            {renderSettingRow(
              'trophy',
              'Test Milestone Alert',
              'Test achievement notification',
              () => NotificationTester.testMilestoneCelebration()
            )}
            
            {renderSettingRow(
              'time',
              'Test Scheduled (1 min)',
              'Test delayed notification',
              () => NotificationTester.testScheduledNotification()
            )}
            
            {renderSettingRow(
              'radio-button-on',
              'Test Badge Update',
              'Test app badge notification',
              () => NotificationTester.testBadgeNotification()
            )}
            
            {renderSettingRow(
              'flash',
              'Test Rapid Notifications',
              'Send 5 notifications quickly',
              () => NotificationTester.testRapidNotifications()
            )}
            
            {renderSettingRow(
              'bar-chart',
              'Show System Status',
              'View notification system info',
              () => NotificationTester.showNotificationStatus()
            )}
            
            {renderSettingRow(
              'stats-chart',
              'Show Analytics',
              'View notification analytics',
              () => NotificationTester.showNotificationAnalytics()
            )}
            
            {renderSettingRow(
              'trash',
              'Clear All Notifications',
              'Cancel scheduled & reset badge',
              () => NotificationTester.clearAllNotifications()
            )}
            
            {renderSettingRow(
              'refresh-circle',
              'Reset Notification System',
              'Reset all notification settings',
              () => NotificationTester.resetNotificationSystem()
            )}
            
            <View style={[styles.debugSeparator, { backgroundColor: theme.borderPrimary }]} />
            <Text style={[styles.debugSectionTitle, { color: theme.textSecondary }]}>
              🎯 ONBOARDING TESTING
            </Text>
            
            {renderSettingRow(
              'refresh',
              'Reset Onboarding',
              'Test onboarding flow again',
              async () => {
                Alert.alert(
                  '🎯 Reset Onboarding',
                  'This will reset the onboarding flow so you can test it again. The app will restart to the onboarding screens.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        await resetOnboarding();
                        // The app will automatically show onboarding on next navigation state change
                      }
                    }
                  ]
                );
              }
            )}
            
            <View style={[styles.debugSeparator, { backgroundColor: theme.borderPrimary }]} />
            
            {renderSettingRow(
              'eye-off',
              'Hide Debug Section',
              'Hide this debug section',
              () => setShowDebugSection(false)
            )}
          </>
        ))}

        {!showDebugSection && __DEV__ && (
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity 
              style={styles.debugToggle}
              onPress={() => setShowDebugSection(true)}
            >
              <Text style={styles.debugToggleText}>🐛 Show Debug Options</Text>
            </TouchableOpacity>
          </View>
        )}

        {renderSection('Account', (
          <>
            {renderSettingRow(
              'log-out',
              'Sign Out',
              'Sign out of your account',
              handleSignOut
            )}
          </>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            Made with 💚 for reducing food waste
          </Text>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            FridgeHero v1.0.0 Beta
          </Text>
        </View>
      </ScrollView>

      <FeedbackModal
        visible={showFeedbackModal}
        onClose={closeFeedbackModal}
        initialType={feedbackType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: designTokens.colors.pureWhite,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[100],
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Inter',
  },
  settingSubtitle: {
    fontSize: 12,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: designTokens.colors.gray[500],
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 4,
  },
  switch: {
    transform: [{ scale: 0.8 }],
  },
  premiumBanner: {
    marginBottom: 20,
  },
  premiumBannerGradient: {
    borderRadius: 12,
    padding: 16,
  },
  premiumBannerContent: {
    borderRadius: 12,
    padding: 16,
  },
  premiumBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
  },
  premiumBannerSubtitle: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  premiumBannerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  premiumBannerStat: {
    alignItems: 'center',
  },
  premiumBannerStatNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
  },
  premiumBannerStatLabel: {
    fontSize: 12,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    marginTop: 4,
  },
  premiumBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  premiumBannerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Inter',
  },
  debugToggle: {
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    borderRadius: 8,
    marginTop: 20,
  },
  debugToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Inter',
  },
  debugSeparator: {
    height: 1,
    marginVertical: 16,
  },
  debugSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
}); 