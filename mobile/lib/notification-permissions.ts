import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PermissionState {
  hasPermission: boolean;
  canAskAgain: boolean;
  hasAskedBefore: boolean;
  isFirstTime: boolean;
}

export class NotificationPermissionManager {
  private static readonly PERMISSION_ASKED_KEY = 'notification_permission_asked';
  private static readonly PERMISSION_DENIED_KEY = 'notification_permission_denied';

  /**
   * Request notification permissions with a user-friendly flow
   */
  static async requestPermissionsWithExplanation(): Promise<PermissionState> {
    try {
      if (!Device.isDevice) {
        console.log('📱 NotificationPermissions: Running on simulator');
        return {
          hasPermission: false,
          canAskAgain: false,
          hasAskedBefore: false,
          isFirstTime: true
        };
      }

      // Check current permission status
      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      const hasAskedBefore = await this.getHasAskedBefore();
      
      if (existingStatus === 'granted') {
        return {
          hasPermission: true,
          canAskAgain: true,
          hasAskedBefore,
          isFirstTime: !hasAskedBefore
        };
      }

      // If user previously denied and can't ask again, show settings prompt
      if (!canAskAgain && hasAskedBefore) {
        return await this.handlePermanentlyDenied();
      }

      // First time asking - show explanation
      if (!hasAskedBefore) {
        const shouldProceed = await this.showPermissionExplanation();
        if (!shouldProceed) {
          await this.setHasAskedBefore(true);
          return {
            hasPermission: false,
            canAskAgain: true,
            hasAskedBefore: true,
            isFirstTime: true
          };
        }
      }

      // Request permission
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      await this.setHasAskedBefore(true);

      if (newStatus === 'granted') {
        return {
          hasPermission: true,
          canAskAgain: true,
          hasAskedBefore: true,
          isFirstTime: !hasAskedBefore
        };
      } else {
        await this.setPermissionDenied(true);
        return {
          hasPermission: false,
          canAskAgain: canAskAgain,
          hasAskedBefore: true,
          isFirstTime: !hasAskedBefore
        };
      }
    } catch (error) {
      console.error('📱 NotificationPermissions: Error requesting permissions:', error);
      return {
        hasPermission: false,
        canAskAgain: false,
        hasAskedBefore: true,
        isFirstTime: false
      };
    }
  }

  /**
   * Show an explanation dialog before requesting permissions
   */
  private static showPermissionExplanation(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '🔔 Stay Updated with FridgeHero',
        'FridgeHero would like to send you helpful notifications to:\n\n' +
        '• 🚨 Alert you when food is about to expire\n' +
        '• 👨‍🍳 Suggest recipes using your ingredients\n' +
        '• 🛒 Remind you about shopping when near stores\n' +
        '• 🎉 Celebrate your waste reduction achievements\n\n' +
        'You can customize or turn off notifications anytime in Settings.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Allow Notifications',
            style: 'default',
            onPress: () => resolve(true)
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Handle case where user permanently denied notifications
   */
  private static handlePermanentlyDenied(): Promise<PermissionState> {
    return new Promise((resolve) => {
      Alert.alert(
        '🔔 Notifications Disabled',
        'You\'ve disabled notifications for FridgeHero. To receive helpful alerts about expiring food and recipe suggestions, you can enable them in your device settings.',
        [
          {
            text: 'Keep Disabled',
            style: 'cancel',
            onPress: () => resolve({
              hasPermission: false,
              canAskAgain: false,
              hasAskedBefore: true,
              isFirstTime: false
            })
          },
          {
            text: 'Open Settings',
            style: 'default',
            onPress: () => {
              Linking.openSettings();
              resolve({
                hasPermission: false,
                canAskAgain: false,
                hasAskedBefore: true,
                isFirstTime: false
              });
            }
          }
        ]
      );
    });
  }

  /**
   * Check if user has granted notification permissions
   */
  static async checkPermissionStatus(): Promise<PermissionState> {
    try {
      if (!Device.isDevice) {
        return {
          hasPermission: false,
          canAskAgain: false,
          hasAskedBefore: false,
          isFirstTime: true
        };
      }

      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      const hasAskedBefore = await this.getHasAskedBefore();

      return {
        hasPermission: status === 'granted',
        canAskAgain,
        hasAskedBefore,
        isFirstTime: !hasAskedBefore
      };
    } catch (error) {
      console.error('📱 NotificationPermissions: Error checking permissions:', error);
      return {
        hasPermission: false,
        canAskAgain: false,
        hasAskedBefore: true,
        isFirstTime: false
      };
    }
  }

  /**
   * Show notification settings instructions
   */
  static showSettingsInstructions(): void {
    const instructions = Platform.select({
      ios: 'Go to Settings > FridgeHero > Notifications and turn on "Allow Notifications"',
      android: 'Go to Settings > Apps > FridgeHero > Notifications and enable notifications'
    });

    Alert.alert(
      '🔔 Enable Notifications',
      `To receive helpful alerts from FridgeHero:\n\n${instructions}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }

  /**
   * Reset permission tracking (useful for testing)
   */
  static async resetPermissionTracking(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.PERMISSION_ASKED_KEY,
        this.PERMISSION_DENIED_KEY
      ]);
      console.log('📱 NotificationPermissions: Permission tracking reset');
    } catch (error) {
      console.error('📱 NotificationPermissions: Failed to reset tracking:', error);
    }
  }

  // Private helper methods
  private static async getHasAskedBefore(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(this.PERMISSION_ASKED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  private static async setHasAskedBefore(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PERMISSION_ASKED_KEY, value.toString());
    } catch (error) {
      console.error('📱 NotificationPermissions: Failed to save asked state:', error);
    }
  }

  private static async setPermissionDenied(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PERMISSION_DENIED_KEY, value.toString());
    } catch (error) {
      console.error('📱 NotificationPermissions: Failed to save denied state:', error);
    }
  }

  /**
   * Get user-friendly permission status description
   */
  static getPermissionStatusDescription(state: PermissionState): string {
    if (state.hasPermission) {
      return '✅ Notifications are enabled';
    } else if (!state.canAskAgain) {
      return '❌ Notifications disabled in settings';
    } else if (state.hasAskedBefore) {
      return '⚠️ Notifications were declined';
    } else {
      return '❓ Notifications not requested yet';
    }
  }
} 