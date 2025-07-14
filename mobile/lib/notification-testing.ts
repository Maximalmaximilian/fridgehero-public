import { Alert } from 'react-native';
import { enhancedNotificationService } from './enhanced-notifications';
import { NotificationPermissionManager } from './notification-permissions';
import * as Notifications from 'expo-notifications';

export class NotificationTester {
  
  /**
   * Test basic notification functionality
   */
  static async testBasicNotification(): Promise<void> {
    try {
      const permissionState = await NotificationPermissionManager.checkPermissionStatus();
      
      if (!permissionState.hasPermission) {
        Alert.alert(
          '🔔 Notification Test',
          'Notifications are not enabled. Please enable them first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enable Now', 
              onPress: async () => {
                await NotificationPermissionManager.requestPermissionsWithExplanation();
              }
            }
          ]
        );
        return;
      }

      await enhancedNotificationService.scheduleLocalNotification({
        title: '🧪 Test Notification',
        body: 'This is a test notification from FridgeHero debug mode!',
        data: {
          type: 'system',
          testId: 'basic_test',
          timestamp: Date.now()
        }
      });

      Alert.alert('✅ Test Sent', 'A test notification should appear shortly!');
    } catch (error) {
      console.error('Notification test failed:', error);
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Test expiry alert notification
   */
  static async testExpiryAlert(): Promise<void> {
    try {
      await enhancedNotificationService.scheduleLocalNotification({
        title: '🚨 Items Expire Today!',
        body: '3 items expire today: Test Milk, Test Yogurt, Test Lettuce. Use them now!',
        data: {
          type: 'expiry_alert',
          urgency: 'today',
          items: ['test-item-1', 'test-item-2', 'test-item-3'],
          testMode: true
        }
      });

      Alert.alert('✅ Expiry Alert Sent', 'Test expiry notification scheduled!');
    } catch (error) {
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Test recipe suggestion notification
   */
  static async testRecipeSuggestion(): Promise<void> {
    try {
      await enhancedNotificationService.scheduleLocalNotification({
        title: '👨‍🍳 Recipe Suggestion',
        body: 'You can make Test Pasta Carbonara with your expiring ingredients!',
        data: {
          type: 'recipe_suggestion',
          recipeId: 'test-recipe-123',
          recipeName: 'Test Pasta Carbonara',
          matchingIngredients: ['eggs', 'pasta', 'cheese'],
          testMode: true
        }
      });

      Alert.alert('✅ Recipe Suggestion Sent', 'Test recipe notification scheduled!');
    } catch (error) {
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Test shopping reminder notification
   */
  static async testShoppingReminder(): Promise<void> {
    try {
      await enhancedNotificationService.scheduleLocalNotification({
        title: '🛒 Shopping Reminder',
        body: 'You\'re near a grocery store! You have 5 test items on your list.',
        data: {
          type: 'shopping_reminder',
          itemCount: 5,
          items: ['Test Milk', 'Test Bread', 'Test Apples'],
          testMode: true
        }
      });

      Alert.alert('✅ Shopping Reminder Sent', 'Test shopping notification scheduled!');
    } catch (error) {
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Test milestone celebration notification
   */
  static async testMilestoneCelebration(): Promise<void> {
    try {
      await enhancedNotificationService.scheduleLocalNotification({
        title: '🎉 Amazing Week!',
        body: 'You saved 10 test items from waste this week! You\'re making a real difference!',
        data: {
          type: 'milestone',
          category: 'items_saved',
          itemCount: 10,
          period: 'week',
          testMode: true
        }
      });

      Alert.alert('✅ Milestone Notification Sent', 'Test achievement notification scheduled!');
    } catch (error) {
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Test scheduled notification (1 minute delay)
   */
  static async testScheduledNotification(): Promise<void> {
    try {
      const triggerDate = new Date(Date.now() + 60000); // 1 minute from now
      
      await enhancedNotificationService.scheduleLocalNotification({
        title: '⏰ Scheduled Test',
        body: 'This notification was scheduled 1 minute ago for testing purposes!',
        data: {
          type: 'system',
          scheduledAt: Date.now(),
          testMode: true
        },
        trigger: {
          type: 'date',
          date: triggerDate
        } as Notifications.DateTriggerInput
      });

      Alert.alert(
        '✅ Scheduled Notification Set',
        `A test notification will appear in 1 minute (at ${triggerDate.toLocaleTimeString()})`
      );
    } catch (error) {
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Test notification with badge update
   */
  static async testBadgeNotification(): Promise<void> {
    try {
      const currentBadge = await enhancedNotificationService.getBadgeCount();
      const newBadge = currentBadge + 1;
      
      await enhancedNotificationService.scheduleLocalNotification({
        title: '🔴 Badge Test',
        body: `This notification should update your app badge to ${newBadge}`,
        data: {
          type: 'system',
          badgeTest: true,
          testMode: true
        }
      });

      await enhancedNotificationService.setBadgeCount(newBadge);
      
      Alert.alert('✅ Badge Test Sent', `App badge should now show ${newBadge}`);
    } catch (error) {
      Alert.alert('❌ Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Clear all notifications and reset badge
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await enhancedNotificationService.clearBadge();
      
      Alert.alert(
        '🧹 Notifications Cleared',
        'All scheduled notifications have been cancelled and badge reset to 0.'
      );
    } catch (error) {
      Alert.alert('❌ Clear Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Show notification system status
   */
  static async showNotificationStatus(): Promise<void> {
    try {
      const status = enhancedNotificationService.getStatus();
      const permissionState = await NotificationPermissionManager.checkPermissionStatus();
      const permissionDescription = NotificationPermissionManager.getPermissionStatusDescription(permissionState);
      const badgeCount = await enhancedNotificationService.getBadgeCount();
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const statusInfo = `
🔔 Notification System Status

📱 Service Status:
• Initialized: ${status.isInitialized ? '✅' : '❌'}
• Has Push Token: ${status.hasPushToken ? '✅' : '❌'}

🔐 Permissions:
• ${permissionDescription}
• Can Ask Again: ${permissionState.canAskAgain ? '✅' : '❌'}

📊 Current State:
• Badge Count: ${badgeCount}
• Scheduled Notifications: ${scheduledNotifications.length}

⚙️ Preferences:
• Expiry Alerts: ${status.preferences?.expiry_alerts ? '✅' : '❌'}
• Recipe Suggestions: ${status.preferences?.recipe_suggestions ? '✅' : '❌'}
• Shopping Reminders: ${status.preferences?.shopping_reminders ? '✅' : '❌'}
• Milestone Alerts: ${status.preferences?.milestone_alerts ? '✅' : '❌'}
• Geofencing: ${status.preferences?.geofencing_enabled ? '✅' : '❌'}
      `.trim();

      Alert.alert('📊 System Status', statusInfo);
    } catch (error) {
      Alert.alert('❌ Status Check Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Show notification analytics
   */
  static async showNotificationAnalytics(): Promise<void> {
    try {
      const analytics = await enhancedNotificationService.getNotificationAnalytics(7);
      
      if (!analytics || analytics.length === 0) {
        Alert.alert('📊 Analytics', 'No notification analytics data found for the last 7 days.');
        return;
      }

      const stats = analytics.reduce((acc, item) => {
        if (!acc[item.action]) acc[item.action] = 0;
        acc[item.action]++;
        return acc;
      }, {} as Record<string, number>);

      const analyticsInfo = `
📈 Notification Analytics (Last 7 Days)

📊 Total Events: ${analytics.length}

📋 Breakdown:
• Sent: ${stats.sent || 0}
• Delivered: ${stats.delivered || 0}
• Opened: ${stats.opened || 0}
• Dismissed: ${stats.dismissed || 0}

📱 Engagement Rate: ${stats.opened && stats.sent ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0}%
      `.trim();

      Alert.alert('📊 Analytics', analyticsInfo);
    } catch (error) {
      Alert.alert('❌ Analytics Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }

  /**
   * Reset all notification settings for testing
   */
  static async resetNotificationSystem(): Promise<void> {
    Alert.alert(
      '⚠️ Reset Notification System',
      'This will reset all notification settings and clear permission tracking. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
              await enhancedNotificationService.clearBadge();
              await NotificationPermissionManager.resetPermissionTracking();
              
              Alert.alert('✅ System Reset', 'Notification system has been reset. You can now test the permission flow again.');
            } catch (error) {
              Alert.alert('❌ Reset Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
            }
          }
        }
      ]
    );
  }

  /**
   * Test notification with quick succession (stress test)
   */
  static async testRapidNotifications(): Promise<void> {
    try {
      Alert.alert(
        '🔄 Rapid Notification Test',
        'This will send 5 notifications in quick succession. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: async () => {
              for (let i = 1; i <= 5; i++) {
                await enhancedNotificationService.scheduleLocalNotification({
                  title: `🔄 Rapid Test ${i}/5`,
                  body: `This is rapid test notification #${i}`,
                  data: {
                    type: 'system',
                    rapidTest: true,
                    sequenceNumber: i,
                    testMode: true
                  }
                });
                
                // Small delay between notifications
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              Alert.alert('✅ Rapid Test Complete', '5 notifications sent in quick succession!');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Rapid Test Failed', `Error: ${(error as Error).message || 'Unknown error'}`);
    }
  }
} 