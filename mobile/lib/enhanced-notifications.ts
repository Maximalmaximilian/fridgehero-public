import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-check';
const GEOFENCING_TASK = 'geofencing-task';

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

interface NotificationData {
  type: 'expiry_alert' | 'recipe_suggestion' | 'shopping_reminder' | 'milestone' | 'system';
  urgency?: 'today' | 'tomorrow' | 'soon';
  items?: string[];
  recipeId?: string;
  recipeName?: string;
  category?: string;
  [key: string]: any;
}

class EnhancedNotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;
  private preferences: NotificationPreferences | null = null;

  async initialize() {
    try {
      console.log('📱 Enhanced Notifications: Initializing service...');
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('📱 Enhanced Notifications: Permission denied');
        return false;
      }

      // Get push token
      this.pushToken = await this.registerForPushNotifications();
      if (this.pushToken) {
        console.log('📱 Enhanced Notifications: Push token obtained');
        await this.savePushTokenToProfile();
      }

      // Load user preferences
      await this.loadNotificationPreferences();

      // Setup notification listeners
      this.setupNotificationListeners();
      
      // Setup background tasks
      await this.setupBackgroundTasks();

      // Setup geofencing if enabled
      if (this.preferences?.geofencing_enabled) {
        await this.setupGeofencing();
      }
      
      this.isInitialized = true;
      console.log('📱 Enhanced Notifications: Service initialized successfully');
      return true;
    } catch (error) {
      console.error('📱 Enhanced Notifications: Initialization failed:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('📱 Enhanced Notifications: Running on simulator, skipping permissions');
      return false;
    }

    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    // Request location permissions for geofencing
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus === 'granted') {
      await Location.requestBackgroundPermissionsAsync();
    }

    return true;
  }

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Enhanced Notifications: Push token generated:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to get push token:', error);
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
        console.error('📱 Enhanced Notifications: Failed to save push token:', error);
      } else {
        console.log('📱 Enhanced Notifications: Push token saved to profile');
      }
    } catch (error) {
      console.error('📱 Enhanced Notifications: Error saving push token:', error);
    }
  }

  private async loadNotificationPreferences() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences found, create default ones
        const { data: newPrefs } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        this.preferences = newPrefs;
      } else if (!error) {
        this.preferences = preferences;
      }

      console.log('📱 Enhanced Notifications: Preferences loaded');
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to load preferences:', error);
    }
  }

  private setupNotificationListeners() {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Enhanced Notifications: Received while app open:', notification);
      this.trackNotificationAnalytics('delivered', notification.request.content.data as NotificationData);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Enhanced Notifications: User tapped notification:', response);
      const data = response.notification.request.content.data as NotificationData;
      
      this.trackNotificationAnalytics('opened', data);
      this.handleNotificationAction(data);
    });

    // Handle notification dismissed (iOS)
    if (Platform.OS === 'ios') {
      Notifications.addNotificationReceivedListener(notification => {
        // Track dismissal if user doesn't interact within 10 seconds
        setTimeout(() => {
          this.trackNotificationAnalytics('dismissed', notification.request.content.data as NotificationData);
        }, 10000);
      });
    }
  }

  private async handleNotificationAction(data: NotificationData) {
    // Handle different notification types
    switch (data.type) {
      case 'expiry_alert':
        // Navigate to expiry items or specific item
        console.log('📱 Enhanced Notifications: Handling expiry alert');
        break;
      case 'recipe_suggestion':
        // Navigate to recipe details
        console.log('📱 Enhanced Notifications: Handling recipe suggestion');
        break;
      case 'shopping_reminder':
        // Navigate to shopping list
        console.log('📱 Enhanced Notifications: Handling shopping reminder');
        break;
      case 'milestone':
        // Show achievement details
        console.log('📱 Enhanced Notifications: Handling milestone celebration');
        break;
      default:
        console.log('📱 Enhanced Notifications: Unknown notification type');
    }
  }

  private async trackNotificationAnalytics(action: 'sent' | 'delivered' | 'opened' | 'dismissed', data: NotificationData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('notification_analytics').insert({
        user_id: user.id,
        notification_type: data.type,
        action,
        metadata: data
      });
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to track analytics:', error);
    }
  }

  private async setupBackgroundTasks() {
    try {
      // Define background task
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
        try {
          console.log('📱 Enhanced Notifications: Running background task');
          
          // Check for urgent notifications
          await this.checkAndScheduleUrgentNotifications();
          
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('📱 Enhanced Notifications: Background task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 60 * 60 * 1000, // 1 hour
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('📱 Enhanced Notifications: Background tasks registered');
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to setup background tasks:', error);
    }
  }

  private async setupGeofencing() {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('📱 Enhanced Notifications: Background location permission denied');
        return;
      }

      // Define geofencing task
      TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }: { data: any; error: any }) => {
        if (error) {
          console.error('📱 Enhanced Notifications: Geofencing error:', error);
          return;
        }
        
        if (data) {
          const { eventType, region } = data;
          if (eventType === Location.GeofencingEventType.Enter) {
            await this.handleGeofenceEnter(region);
          }
        }
      });

      // Get common grocery store locations (this could be enhanced with user's preferred stores)
      const commonGroceryStores = [
        { identifier: 'grocery-1', latitude: 37.7749, longitude: -122.4194, radius: 100 }, // Example coordinates
        // Add more grocery store locations based on user's area
      ];

      await Location.startGeofencingAsync(GEOFENCING_TASK, commonGroceryStores);
      console.log('📱 Enhanced Notifications: Geofencing setup complete');
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to setup geofencing:', error);
    }
  }

  private async handleGeofenceEnter(region: any) {
    if (!this.preferences?.shopping_reminders) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's shopping list items
      const { data: households } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id);

      if (!households?.length) return;

      const { data: shoppingItems } = await supabase
        .from('shopping_list_items')
        .select('name, quantity, unit')
        .in('household_id', households.map(h => h.household_id))
        .eq('completed', false)
        .limit(5);

      if (shoppingItems?.length) {
        const itemNames = shoppingItems.slice(0, 3).map(item => item.name);
        
        await this.scheduleLocalNotification({
          title: '🛒 Shopping Reminder',
          body: `You're near a grocery store! You have ${shoppingItems.length} items on your list: ${itemNames.join(', ')}`,
          data: {
            type: 'shopping_reminder',
            itemCount: shoppingItems.length,
            items: shoppingItems.map(item => item.name)
          }
        });
      }
    } catch (error) {
      console.error('📱 Enhanced Notifications: Error handling geofence enter:', error);
    }
  }

  private async checkAndScheduleUrgentNotifications() {
    if (!this.preferences) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for items expiring today
      const { data: households } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id);

      if (!households?.length) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: expiringToday } = await supabase
        .from('items')
        .select('id, name, expiry_date')
        .in('household_id', households.map(h => h.household_id))
        .eq('status', 'active')
        .eq('expiry_date', today);

      if (expiringToday?.length && this.preferences.expiry_alerts) {
        const itemNames = expiringToday.slice(0, 3).map(item => item.name);
        
        await this.scheduleLocalNotification({
          title: '🚨 Urgent: Items Expire Today!',
          body: `${expiringToday.length} items expire today: ${itemNames.join(', ')}. Use them now!`,
          data: {
            type: 'expiry_alert',
            urgency: 'today',
            items: expiringToday.map(item => item.id)
          }
        });
      }
    } catch (error) {
      console.error('📱 Enhanced Notifications: Error checking urgent notifications:', error);
    }
  }

  async scheduleLocalNotification(notification: {
    title: string;
    body: string;
    data: NotificationData;
    trigger?: Notifications.NotificationTriggerInput;
  }) {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
          badge: await this.getBadgeCount() + 1,
        },
        trigger: notification.trigger || null,
      });

      this.trackNotificationAnalytics('sent', notification.data);
      
      console.log(`📱 Enhanced Notifications: Scheduled notification ${identifier}`);
      return identifier;
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to schedule notification:', error);
      return null;
    }
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('📱 Enhanced Notifications: Failed to update preferences:', error);
        return false;
      }

      // Update local preferences
      this.preferences = { ...this.preferences, ...preferences } as NotificationPreferences;

      // Handle geofencing changes
      if (preferences.geofencing_enabled !== undefined) {
        if (preferences.geofencing_enabled) {
          await this.setupGeofencing();
        } else {
          await Location.stopGeofencingAsync(GEOFENCING_TASK);
        }
      }

      console.log('📱 Enhanced Notifications: Preferences updated');
      return true;
    } catch (error) {
      console.error('📱 Enhanced Notifications: Error updating preferences:', error);
      return false;
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to set badge count:', error);
    }
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  async getNotificationHistory(limit: number = 50) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return notifications || [];
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to get notification history:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('📱 Enhanced Notifications: Failed to mark as read:', error);
      }
    } catch (error) {
      console.error('📱 Enhanced Notifications: Error marking as read:', error);
    }
  }

  async getNotificationAnalytics(days: number = 30) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: analytics } = await supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString());

      return analytics || [];
    } catch (error) {
      console.error('📱 Enhanced Notifications: Failed to get analytics:', error);
      return null;
    }
  }

  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasPushToken: !!this.pushToken,
      preferences: this.preferences
    };
  }

  async cleanup() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      await Location.stopGeofencingAsync(GEOFENCING_TASK);
      console.log('📱 Enhanced Notifications: Cleanup complete');
    } catch (error) {
      console.error('📱 Enhanced Notifications: Cleanup error:', error);
    }
  }
}

export const enhancedNotificationService = new EnhancedNotificationService();
export default enhancedNotificationService; 