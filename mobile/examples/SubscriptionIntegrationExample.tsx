/**
 * Example: Integrating SubscriptionContext into existing screens
 * 
 * This file shows how to update existing components to use the new
 * centralized subscription management system.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSubscription } from '../contexts/SubscriptionContext';

// Example 1: Premium Feature Protection
function BarcodeScannerButton({ navigation }: any) {
  const { checkFeatureAccess, handlePremiumFeatureAccess } = useSubscription();

  const handleScanPress = () => {
    if (!checkFeatureAccess('barcode_scanning')) {
      handlePremiumFeatureAccess(
        'Barcode Scanning',
        () => navigation.navigate('Premium', { source: 'barcode_button' })
      );
      return;
    }

    // Feature is accessible - proceed with scanning
    navigation.navigate('BarcodeScanner');
  };

  return (
    <TouchableOpacity onPress={handleScanPress}>
      <Text>Scan Barcode</Text>
    </TouchableOpacity>
  );
}

// Example 2: Item Creation with Limits
function AddItemScreen({ navigation }: any) {
  const { isPremium, limits, getHouseholdLimits } = useSubscription();
  const [canAddItem, setCanAddItem] = React.useState(true);

  React.useEffect(() => {
    checkItemLimits();
  }, []);

  const checkItemLimits = async () => {
    const householdLimits = await getHouseholdLimits();
    if (householdLimits && !householdLimits.canAddMore) {
      setCanAddItem(false);
    }
  };

  const handleAddItem = () => {
    if (!canAddItem) {
      Alert.alert(
        '🔒 Item Limit Reached',
        'Free accounts are limited to 20 items per household. Upgrade to Premium for unlimited items!',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade to Premium', 
            onPress: () => navigation.navigate('Premium', { source: 'item_limit' })
          }
        ]
      );
      return;
    }

    // Proceed with item creation
    // ... existing item creation logic
  };

  return (
    <View>
      {!canAddItem && (
        <View style={{ backgroundColor: '#FFF3CD', padding: 16 }}>
          <Text>⚠️ Item limit reached. Upgrade to Premium for unlimited items.</Text>
        </View>
      )}
      <TouchableOpacity onPress={handleAddItem}>
        <Text>Add Item</Text>
      </TouchableOpacity>
    </View>
  );
}

// Example 3: Analytics Screen with Premium Gate
function WasteAnalyticsPreview({ navigation }: any) {
  const { checkFeatureAccess, handlePremiumFeatureAccess } = useSubscription();

  const handleViewFullAnalytics = () => {
    if (!checkFeatureAccess('waste_analytics')) {
      handlePremiumFeatureAccess(
        'Waste Analytics',
        () => navigation.navigate('Premium', { source: 'analytics_preview' })
      );
      return;
    }

    navigation.navigate('WasteAnalytics');
  };

  return (
    <View>
      <Text>Analytics Preview</Text>
      {/* Show limited preview data */}
      
      <TouchableOpacity onPress={handleViewFullAnalytics}>
        <Text>View Full Analytics</Text>
      </TouchableOpacity>
    </View>
  );
}

// Example 4: Settings Screen Integration
function SettingsScreen({ navigation }: any) {
  const { 
    isPremium, 
    status, 
    planId, 
    isTrialing, 
    daysLeftInTrial,
    refreshSubscription 
  } = useSubscription();

  React.useEffect(() => {
    // Refresh subscription status when settings screen is focused
    refreshSubscription();
  }, []);

  const renderSubscriptionStatus = () => {
    if (isTrialing) {
      return (
        <View style={{ backgroundColor: '#E3F2FD', padding: 16, borderRadius: 8 }}>
          <Text style={{ fontWeight: 'bold' }}>
            🎉 Premium Trial Active
          </Text>
          <Text>
            {daysLeftInTrial} day{daysLeftInTrial !== 1 ? 's' : ''} remaining
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Premium')}>
            <Text style={{ color: '#1976D2' }}>Subscribe to Keep Premium</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isPremium) {
      return (
        <View style={{ backgroundColor: '#E8F5E8', padding: 16, borderRadius: 8 }}>
          <Text style={{ fontWeight: 'bold' }}>✨ Premium Active</Text>
          <Text>Plan: {planId}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Premium')}>
            <Text style={{ color: '#4CAF50' }}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ backgroundColor: '#FFF3E0', padding: 16, borderRadius: 8 }}>
        <Text style={{ fontWeight: 'bold' }}>Free Plan</Text>
        <Text>Upgrade to unlock all features</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Premium')}>
          <Text style={{ color: '#FF9800' }}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Settings</Text>
      
      {/* Subscription Status Section */}
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Subscription
        </Text>
        {renderSubscriptionStatus()}
      </View>

      {/* Other settings sections */}
    </View>
  );
}

// Example 5: Dashboard Integration
function DashboardScreen({ navigation }: any) {
  const { isPremium, limits, refreshSubscription } = useSubscription();

  // Refresh subscription on dashboard focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshSubscription();
    });

    return unsubscribe;
  }, [navigation]);

  const renderPremiumBanner = () => {
    if (isPremium) return null;

    return (
      <View style={{ 
        backgroundColor: '#F3E5F5', 
        padding: 16, 
        margin: 16, 
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E1BEE7'
      }}>
        <Text style={{ fontWeight: 'bold', color: '#7B1FA2' }}>
          🚀 Upgrade to Premium
        </Text>
        <Text style={{ color: '#8E24AA', marginTop: 4 }}>
          Unlock unlimited items, advanced features, and household sharing
        </Text>
        <TouchableOpacity 
          style={{ 
            backgroundColor: '#9C27B0', 
            padding: 12, 
            borderRadius: 8, 
            marginTop: 12,
            alignSelf: 'flex-start'
          }}
          onPress={() => navigation.navigate('Premium', { source: 'dashboard_banner' })}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>
            Start Free Trial
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View>
      {renderPremiumBanner()}
      
      {/* Dashboard content */}
      <Text>Welcome to FridgeHero!</Text>
      
      {/* Show limitations for free users */}
      {!isPremium && (
        <Text style={{ color: '#666', fontSize: 12 }}>
          Free Plan: {limits.maxItemsPerHousehold} items per household
        </Text>
      )}
    </View>
  );
}

export {
  BarcodeScannerButton,
  AddItemScreen,
  WasteAnalyticsPreview,
  SettingsScreen,
  DashboardScreen
}; 