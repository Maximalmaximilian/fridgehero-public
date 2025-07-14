import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface ExpiryNotificationData {
  type: 'expiry_alert';
  itemId: string;
  itemName: string;
  daysUntilExpiry: number;
  [key: string]: unknown;
}

interface DailyReminderData {
  type: 'daily_reminder';
  expiringCount: number;
  [key: string]: unknown;
}

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;

  async initialize() {
    try {
      console.log('📱 Notifications: Initializing service...');
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('📱 Notifications: Permission denied');
        return false;
      }

      // Get push token
      this.pushToken = await this.registerForPushNotifications();
      if (this.pushToken) {
        console.log('📱 Notifications: Push token obtained');
        // Save token to user profile
        await this.savePushTokenToProfile();
      }

      // Setup notification listeners
      this.setupNotificationListeners();
      
      // Schedule daily reminder
      await this.scheduleDailyReminder();
      
      this.isInitialized = true;
      console.log('📱 Notifications: Service initialized successfully');
      return true;
    } catch (error) {
      console.error('📱 Notifications: Initialization failed:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('📱 Notifications: Running on simulator, skipping permissions');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Notifications: Push token generated:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('📱 Notifications: Failed to get push token:', error);
      return null;
    }
  }

  private async savePushTokenToProfile() {
    if (!this.pushToken) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: this.pushToken,
          notifications_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('📱 Notifications: Failed to save push token:', error);
      } else {
        console.log('📱 Notifications: Push token saved to profile');
      }
    } catch (error) {
      console.error('📱 Notifications: Error saving push token:', error);
    }
  }

  private setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notifications: Received while app open:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notifications: User tapped notification:', response);
      const data = response.notification.request.content.data as unknown;
      
      if (data && typeof data === 'object' && 'type' in data) {
        if ((data as ExpiryNotificationData).type === 'expiry_alert') {
          const expiryData = data as ExpiryNotificationData;
          console.log('📱 Notifications: Navigating to expiry alert for:', expiryData.itemName);
        } else if ((data as DailyReminderData).type === 'daily_reminder') {
          console.log('📱 Notifications: Opening daily reminder');
        }
      }
    });
  }

  async scheduleExpiryNotification(item: { id: string; name: string; expiry_date: string }) {
    if (!this.isInitialized) {
      console.log('📱 Notifications: Service not initialized, skipping notification schedule');
      return;
    }

    try {
      const expiryDate = new Date(item.expiry_date);
      const now = new Date();
      
      // Calculate days until expiry
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Schedule notifications at different intervals
      const notifications = [];
      
      // 3 days before (if applicable)
      if (daysUntilExpiry > 3) {
        const threeDaysBefore = new Date(expiryDate);
        threeDaysBefore.setDate(expiryDate.getDate() - 3);
        threeDaysBefore.setHours(9, 0, 0, 0); // 9 AM
        
        if (threeDaysBefore > now) {
          notifications.push({
            trigger: { type: 'date', date: threeDaysBefore } as Notifications.DateTriggerInput,
            title: "⚠️ Item Expiring Soon",
            body: `${item.name} expires in 3 days. Plan to use it!`,
            data: {
              type: 'expiry_alert',
              itemId: item.id,
              itemName: item.name,
              daysUntilExpiry: 3
            } as ExpiryNotificationData
          });
        }
      }
      
      // 1 day before
      if (daysUntilExpiry > 1) {
        const oneDayBefore = new Date(expiryDate);
        oneDayBefore.setDate(expiryDate.getDate() - 1);
        oneDayBefore.setHours(9, 0, 0, 0); // 9 AM
        
        if (oneDayBefore > now) {
          notifications.push({
            trigger: { type: 'date', date: oneDayBefore } as Notifications.DateTriggerInput,
            title: "🚨 Urgent: Item Expires Tomorrow!",
            body: `${item.name} expires tomorrow. Use it now!`,
            data: {
              type: 'expiry_alert',
              itemId: item.id,
              itemName: item.name,
              daysUntilExpiry: 1
            } as ExpiryNotificationData
          });
        }
      }
      
      // Day of expiry
      if (daysUntilExpiry >= 0) {
        const expiryDay = new Date(expiryDate);
        expiryDay.setHours(9, 0, 0, 0); // 9 AM
        
        if (expiryDay > now) {
          notifications.push({
            trigger: { type: 'date', date: expiryDay } as Notifications.DateTriggerInput,
            title: "🔴 Item Expires Today!",
            body: `${item.name} expires today. Don't let it go to waste!`,
            data: {
              type: 'expiry_alert',
              itemId: item.id,
              itemName: item.name,
              daysUntilExpiry: 0
            } as ExpiryNotificationData
          });
        }
      }
      
      // Schedule all notifications
      for (const notification of notifications) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            data: notification.data,
            sound: 'default',
            badge: 1,
          },
          trigger: notification.trigger,
        });
        
        console.log(`📱 Notifications: Scheduled notification ${identifier} for ${item.name}`);
      }
      
      console.log(`📱 Notifications: Scheduled ${notifications.length} notifications for ${item.name}`);
    } catch (error) {
      console.error('📱 Notifications: Failed to schedule expiry notification:', error);
    }
  }

  async cancelNotificationsForItem(itemId: string) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        const data = notification.content.data as unknown;
        if (data && typeof data === 'object' && 'type' in data && 'itemId' in data) {
          const expiryData = data as ExpiryNotificationData;
          if (expiryData.type === 'expiry_alert' && expiryData.itemId === itemId) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            console.log(`📱 Notifications: Cancelled notification ${notification.identifier} for item ${itemId}`);
          }
        }
      }
    } catch (error) {
      console.error('📱 Notifications: Failed to cancel notifications for item:', error);
    }
  }

  async scheduleDailyReminder() {
    try {
      // Cancel existing daily reminder
      await this.cancelDailyReminder();
      
      // Schedule new daily reminder at 9 AM
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌅 Good Morning!",
          body: "Check your fridge for items expiring today",
          data: {
            type: 'daily_reminder',
            expiringCount: 0
          } as DailyReminderData,
          sound: 'default',
          badge: 1,
        },
        trigger: {
          type: 'calendar',
          hour: 9,
          minute: 0,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
      });
      
      console.log(`📱 Notifications: Daily reminder scheduled with ID ${identifier}`);
    } catch (error) {
      console.error('📱 Notifications: Failed to schedule daily reminder:', error);
    }
  }

  async cancelDailyReminder() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        const data = notification.content.data as unknown;
        if (data && typeof data === 'object' && 'type' in data) {
          const reminderData = data as DailyReminderData;
          if (reminderData.type === 'daily_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            console.log(`📱 Notifications: Cancelled daily reminder ${notification.identifier}`);
          }
        }
      }
    } catch (error) {
      console.error('📱 Notifications: Failed to cancel daily reminder:', error);
    }
  }

  async sendTestNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧪 Test Notification",
          body: "FridgeHero notifications are working!",
          data: { type: 'test' },
          sound: 'default',
        },
        trigger: { type: 'timeInterval', seconds: 1 } as Notifications.TimeIntervalTriggerInput,
      });
      
      console.log('📱 Notifications: Test notification scheduled');
    } catch (error) {
      console.error('📱 Notifications: Failed to send test notification:', error);
    }
  }

  async updateNotificationPreferences(enabled: boolean, expiryReminders: boolean = true) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          notifications_enabled: enabled,
          expiry_reminders: expiryReminders,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('📱 Notifications: Failed to update preferences:', error);
      } else {
        console.log('📱 Notifications: Preferences updated');
        
        // Cancel/schedule daily reminder based on preference
        if (enabled && expiryReminders) {
          await this.scheduleDailyReminder();
        } else {
          await this.cancelDailyReminder();
        }
      }
    } catch (error) {
      console.error('📱 Notifications: Error updating preferences:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('📱 Notifications: Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`📱 Notifications: Badge count set to ${count}`);
    } catch (error) {
      console.error('📱 Notifications: Failed to set badge count:', error);
    }
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasPushToken: !!this.pushToken,
      pushToken: this.pushToken,
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 