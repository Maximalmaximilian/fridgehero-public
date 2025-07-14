import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';
import { enhancedNotificationService } from '../lib/enhanced-notifications';
import { NotificationPermissionManager, PermissionState } from '../lib/notification-permissions';

interface NotificationPreferences {
  expiry_alerts: boolean;
  recipe_suggestions: boolean;
  shopping_reminders: boolean;
  milestone_alerts: boolean;
  expiry_alert_time: string;
  recipe_suggestion_time: string;
  expiry_days_before: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  daily_summary_enabled: boolean;
  weekly_insights_enabled: boolean;
  geofencing_enabled: boolean;
}

export default function NotificationSettingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>({
    hasPermission: false,
    canAskAgain: true,
    hasAskedBefore: false,
    isFirstTime: true
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    expiry_alerts: true,
    recipe_suggestions: true,
    shopping_reminders: true,
    milestone_alerts: true,
    expiry_alert_time: '08:00:00',
    recipe_suggestion_time: '17:00:00',
    expiry_days_before: 2,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
    daily_summary_enabled: true,
    weekly_insights_enabled: true,
    geofencing_enabled: false,
  });
  
  const [showTimePicker, setShowTimePicker] = useState<{
    type: string | null;
    visible: boolean;
  }>({ type: null, visible: false });

  useEffect(() => {
    loadPreferences();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const state = await NotificationPermissionManager.checkPermissionStatus();
      setPermissionState(state);
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const currentPrefs = enhancedNotificationService.getPreferences();
      if (currentPrefs) {
        setPreferences(currentPrefs);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWithPermission = async (key: keyof NotificationPreferences, value: boolean) => {
    // If user is trying to enable a notification type but doesn't have permission
    if (value && !permissionState.hasPermission) {
      const newState = await NotificationPermissionManager.requestPermissionsWithExplanation();
      setPermissionState(newState);
      
      if (!newState.hasPermission) {
        // Permission was denied, don't update the preference
        return;
      }
    }
    
    await updatePreference(key, value);
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: any) => {
    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      
      setSaving(true);
      const success = await enhancedNotificationService.updateNotificationPreferences({
        [key]: value
      });
      
      if (!success) {
        Alert.alert('Error', 'Failed to save notification preferences');
        // Revert the change
        setPreferences(preferences);
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const showTimePickerModal = (type: string) => {
    setShowTimePicker({ type, visible: true });
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker({ type: null, visible: false });
    }
    
    if (selectedTime && showTimePicker.type) {
      const timeString = selectedTime.toTimeString().slice(0, 8); // HH:MM:SS format
      updatePreference(showTimePicker.type as keyof NotificationPreferences, timeString);
    }
    
    if (Platform.OS === 'ios') {
      setShowTimePicker({ type: null, visible: false });
    }
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (timeString: string): string => {
    return parseTime(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const requestLocationPermission = async () => {
    try {
      Alert.alert(
        'Location Permission',
        'FridgeHero needs location access to send you shopping reminders when you\'re near grocery stores.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Allow',
            onPress: async () => {
              // The permission will be requested when geofencing is enabled
              await updatePreference('geofencing_enabled', true);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to request location permission:', error);
    }
  };

  const renderSectionHeader = (title: string, subtitle?: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.bgPrimary }]}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderToggleRow = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    icon: string
  ) => (
    <View style={[styles.settingRow, { backgroundColor: theme.bgSecondary }]}>
      <View style={styles.settingLeft}>
        <Ionicons
          name={icon as any}
          size={24}
          color={designTokens.colors.heroGreen}
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
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
      />
    </View>
  );

  const renderTimeRow = (
    title: string,
    subtitle: string,
    timeKey: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[styles.settingRow, { backgroundColor: theme.bgSecondary }]}
      onPress={() => showTimePickerModal(timeKey)}
    >
      <View style={styles.settingLeft}>
        <Ionicons
          name={icon as any}
          size={24}
          color={designTokens.colors.heroGreen}
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        <Text style={[styles.timeValue, { color: theme.textPrimary }]}>
          {formatTime(preferences[timeKey as keyof NotificationPreferences] as string)}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderNumberRow = (
    title: string,
    subtitle: string,
    value: number,
    onDecrease: () => void,
    onIncrease: () => void,
    icon: string,
    min: number = 1,
    max: number = 7
  ) => (
    <View style={[styles.settingRow, { backgroundColor: theme.bgSecondary }]}>
      <View style={styles.settingLeft}>
        <Ionicons
          name={icon as any}
          size={24}
          color={designTokens.colors.heroGreen}
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.numberControls}>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: theme.bgTertiary }]}
          onPress={onDecrease}
          disabled={value <= min}
        >
          <Ionicons
            name="remove"
            size={20}
            color={value <= min ? theme.textSecondary : theme.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.numberValue, { color: theme.textPrimary }]}>{value}</Text>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: theme.bgTertiary }]}
          onPress={onIncrease}
          disabled={value >= max}
        >
          <Ionicons
            name="add"
            size={20}
            color={value >= max ? theme.textSecondary : theme.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPermissionBanner = () => {
    if (permissionState.hasPermission) return null;

    return (
      <View style={[styles.permissionBanner, { backgroundColor: theme.bgTertiary, borderColor: theme.borderPrimary }]}>
        <View style={styles.permissionBannerContent}>
          <Ionicons 
            name="notifications-off" 
            size={24} 
            color={designTokens.colors.alertAmber} 
            style={styles.permissionBannerIcon}
          />
          <View style={styles.permissionBannerText}>
            <Text style={[styles.permissionBannerTitle, { color: theme.textPrimary }]}>
              Notifications Disabled
            </Text>
            <Text style={[styles.permissionBannerSubtitle, { color: theme.textSecondary }]}>
              {NotificationPermissionManager.getPermissionStatusDescription(permissionState)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.permissionBannerButton, { backgroundColor: designTokens.colors.heroGreen }]}
            onPress={async () => {
              if (permissionState.canAskAgain) {
                const newState = await NotificationPermissionManager.requestPermissionsWithExplanation();
                setPermissionState(newState);
              } else {
                NotificationPermissionManager.showSettingsInstructions();
              }
            }}
          >
            <Text style={[styles.permissionBannerButtonText, { color: designTokens.colors.pureWhite }]}>
              {permissionState.canAskAgain ? 'Enable' : 'Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Notification Types */}
        {renderSectionHeader('Notification Types', 'Choose which notifications you want to receive')}
        
        {renderToggleRow(
          'Expiry Alerts',
          'Get notified when your food is about to expire',
          preferences.expiry_alerts,
          (value) => handleToggleWithPermission('expiry_alerts', value),
          'warning-outline'
        )}

        {renderToggleRow(
          'Recipe Suggestions',
          'Discover recipes using your expiring ingredients',
          preferences.recipe_suggestions,
          (value) => handleToggleWithPermission('recipe_suggestions', value),
          'restaurant-outline'
        )}

        {renderToggleRow(
          'Shopping Reminders',
          'Get reminded when you\'re near grocery stores',
          preferences.shopping_reminders,
          (value) => handleToggleWithPermission('shopping_reminders', value),
          'storefront-outline'
        )}

        {renderToggleRow(
          'Milestone Celebrations',
          'Celebrate your waste reduction achievements',
          preferences.milestone_alerts,
          (value) => handleToggleWithPermission('milestone_alerts', value),
          'trophy-outline'
        )}

        {/* Timing Settings */}
        {renderSectionHeader('Timing', 'When would you like to receive notifications?')}

        {renderTimeRow(
          'Expiry Alert Time',
          'Daily check for expiring items',
          'expiry_alert_time',
          'time-outline'
        )}

        {renderTimeRow(
          'Recipe Suggestion Time',
          'Evening recipe recommendations',
          'recipe_suggestion_time',
          'restaurant-outline'
        )}

        {renderNumberRow(
          'Expiry Warning Days',
          'How many days before expiry to alert you',
          preferences.expiry_days_before,
          () => updatePreference('expiry_days_before', Math.max(1, preferences.expiry_days_before - 1)),
          () => updatePreference('expiry_days_before', Math.min(7, preferences.expiry_days_before + 1)),
          'calendar-outline'
        )}

        {/* Advanced Settings */}
        {renderSectionHeader('Advanced', 'Additional notification features')}

        {renderToggleRow(
          'Daily Summary',
          'Get a daily overview of your fridge status',
          preferences.daily_summary_enabled,
          (value) => handleToggleWithPermission('daily_summary_enabled', value),
          'today-outline'
        )}

        {renderToggleRow(
          'Weekly Insights',
          'Weekly waste reduction insights and tips',
          preferences.weekly_insights_enabled,
          (value) => handleToggleWithPermission('weekly_insights_enabled', value),
          'analytics-outline'
        )}

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: theme.bgSecondary }]}
          onPress={() => {
            if (preferences.geofencing_enabled) {
              updatePreference('geofencing_enabled', false);
            } else {
              requestLocationPermission();
            }
          }}
        >
          <View style={styles.settingLeft}>
            <Ionicons
              name="location-outline"
              size={24}
              color={designTokens.colors.heroGreen}
              style={styles.settingIcon}
            />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Location-Based Reminders</Text>
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                Shopping reminders near grocery stores
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.geofencing_enabled}
            onValueChange={() => {}} // Handled by the TouchableOpacity
            trackColor={{
              false: theme.borderPrimary,
              true: designTokens.colors.heroGreen
            }}
            thumbColor={preferences.geofencing_enabled ? designTokens.colors.pureWhite : theme.bgPrimary}
          />
        </TouchableOpacity>

        {/* Quiet Hours */}
        {renderSectionHeader('Quiet Hours', 'Set times when you don\'t want to be disturbed')}

        {renderTimeRow(
          'Quiet Hours Start',
          'No notifications after this time',
          'quiet_hours_start',
          'moon-outline'
        )}

        {renderTimeRow(
          'Quiet Hours End',
          'Resume notifications after this time',
          'quiet_hours_end',
          'sunny-outline'
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker.visible && (
        <DateTimePicker
          value={parseTime(preferences[showTimePicker.type as keyof NotificationPreferences] as string)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {saving && (
        <View style={[styles.savingOverlay, { backgroundColor: `${theme.bgPrimary}CC` }]}>
          <Text style={[styles.savingText, { color: theme.textPrimary }]}>Saving...</Text>
        </View>
      )}

      {renderPermissionBanner()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 2,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  numberControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberValue: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  bottomPadding: {
    height: 30,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  permissionBanner: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  permissionBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionBannerIcon: {
    marginRight: 15,
  },
  permissionBannerText: {
    flex: 1,
  },
  permissionBannerTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  permissionBannerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  permissionBannerButton: {
    padding: 10,
    borderRadius: 5,
  },
  permissionBannerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 