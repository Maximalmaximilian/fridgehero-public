import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

// Import optimized subscription components and hooks
import { SubscriptionLoadingBoundary, ConditionalPremium } from '../components/SubscriptionLoadingBoundary';
import { 
  PremiumOnly, 
  LockedFeatureNotice, 
  PremiumButton,
  FeatureLimitBanner,
  PremiumUpgradeCard 
} from '../components/PremiumComponents';
import { 
  useBarcodeScanning,
  useWasteAnalytics,
  useItemLimits,
  useSubscriptionStatus 
} from '../hooks/usePremiumFeatures';

interface DashboardProps {
  navigation: any;
}

// Main dashboard component wrapped with loading boundary
const DashboardScreen: React.FC<DashboardProps> = ({ navigation }) => {
  return (
    <SubscriptionLoadingBoundary>
      <DashboardContent navigation={navigation} />
    </SubscriptionLoadingBoundary>
  );
};

// Dashboard content that renders after subscription is loaded
const DashboardContent: React.FC<DashboardProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [itemCount, setItemCount] = useState(12); // Example item count
  
  // Use Premium feature hooks
  const barcodeScanning = useBarcodeScanning();
  const wasteAnalytics = useWasteAnalytics();
  const itemLimits = useItemLimits();
  const subscriptionStatus = useSubscriptionStatus();
  
  // Fetch actual item count on mount
  useEffect(() => {
    // Simulate fetching item count
    // In real app, this would fetch from your data source
    const fetchItemCount = async () => {
      // const count = await getItemCount();
      // setItemCount(count);
    };
    fetchItemCount();
  }, []);
  
  const navigateToPremium = () => {
    navigation.navigate('Premium', { source: 'dashboard' });
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>
            Welcome back! 👋
          </Text>
          <Text style={[styles.subtitleText, { color: theme.textSecondary }]}>
            Here's what's happening in your kitchen
          </Text>
        </View>
        
        {/* Subscription Status Banner - Only shows for relevant states */}
        {subscriptionStatus.isFree && (
          <PremiumUpgradeCard
            title="Upgrade to Premium"
            subtitle="Unlock all features and save more money"
            features={[
              'Unlimited items and households',
              'Barcode scanning',
              'Advanced analytics',
            ]}
            onUpgrade={navigateToPremium}
            compact={true}
          />
        )}
        
        {/* Item Limit Banner - Shows progress for Free users */}
        <FeatureLimitBanner
          currentUsage={itemCount}
          limit={itemLimits.maxItems}
          feature="Items"
          onUpgrade={navigateToPremium}
        />
        
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionGrid}>
            {/* Add Item Button - Always available */}
            <TouchableOpacity
              style={StyleSheet.flatten([
                styles.actionCard, 
                { backgroundColor: theme.cardBackground }
              ])}
              onPress={() => navigation.navigate('AddItem')}
            >
              <Ionicons name="add-circle" size={32} color={designTokens.colors.heroGreen} />
              <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>
                Add Item
              </Text>
            </TouchableOpacity>
            
            {/* Barcode Scanner - Premium gated */}
            <PremiumButton
              style={StyleSheet.flatten([
                styles.actionCard, 
                { backgroundColor: theme.cardBackground }
              ])}
              onPress={() => navigation.navigate('BarcodeScanner')}
              feature="barcode_scanning"
            >
              <View style={styles.actionContent}>
                <Ionicons 
                  name={barcodeScanning.hasAccess ? "scan" : "lock-closed"} 
                  size={32} 
                  color={barcodeScanning.hasAccess ? designTokens.colors.heroGreen : designTokens.colors.amber[600]} 
                />
                <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>
                  Scan Barcode
                </Text>
                {barcodeScanning.isLocked && (
                  <Text style={styles.premiumLabel}>Premium</Text>
                )}
              </View>
            </PremiumButton>
            
            {/* Shopping List - Always available */}
            <TouchableOpacity
              style={StyleSheet.flatten([
                styles.actionCard, 
                { backgroundColor: theme.cardBackground }
              ])}
              onPress={() => navigation.navigate('ShoppingList')}
            >
              <Ionicons name="list" size={32} color={designTokens.colors.heroGreen} />
              <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>
                Shopping List
              </Text>
            </TouchableOpacity>
            
            {/* Analytics - Premium gated with fallback */}
            <PremiumOnly
              feature="waste_analytics"
              fallback={
                <TouchableOpacity
                  style={StyleSheet.flatten([
                    styles.actionCard, 
                    styles.lockedCard, 
                    { backgroundColor: theme.cardBackground }
                  ])}
                  onPress={() => wasteAnalytics.requestAccess(navigateToPremium)}
                >
                  <Ionicons name="lock-closed" size={32} color={designTokens.colors.amber[600]} />
                  <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>
                    Analytics
                  </Text>
                  <Text style={styles.premiumLabel}>Premium</Text>
                </TouchableOpacity>
              }
            >
              <TouchableOpacity
                style={StyleSheet.flatten([
                  styles.actionCard, 
                  { backgroundColor: theme.cardBackground }
                ])}
                onPress={() => navigation.navigate('WasteAnalytics')}
              >
                <Ionicons name="analytics" size={32} color={designTokens.colors.heroGreen} />
                <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>
                  Analytics
                </Text>
              </TouchableOpacity>
            </PremiumOnly>
          </View>
        </View>
        
        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Recent Activity
          </Text>
          
          {/* Example recent items */}
          <View style={[styles.recentCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.recentTitle, { color: theme.textPrimary }]}>
              3 items expiring soon
            </Text>
            <Text style={[styles.recentSubtitle, { color: theme.textSecondary }]}>
              Check your items to avoid waste
            </Text>
          </View>
        </View>
        
        {/* Premium Features Preview - Only for Free users */}
        {subscriptionStatus.isFree && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Premium Features
            </Text>
            
            <LockedFeatureNotice
              message="Unlock barcode scanning, analytics, and unlimited households"
              onUpgrade={navigateToPremium}
              feature="premium_features"
            />
          </View>
        )}
        
        {/* Trial Status - Only during trial */}
        {subscriptionStatus.isTrialing && (
          <View style={styles.section}>
            <View style={[styles.trialBanner, { backgroundColor: designTokens.colors.heroGreen }]}>
              <Ionicons name="star" size={24} color={designTokens.colors.pureWhite} />
              <View style={styles.trialText}>
                <Text style={styles.trialTitle}>
                  Premium Trial Active
                </Text>
                <Text style={styles.trialSubtitle}>
                  {subscriptionStatus.daysLeftInTrial} days remaining
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.trialButton}
                onPress={navigateToPremium}
              >
                <Text style={styles.trialButtonText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionCard: {
    width: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    // Shadow styles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedCard: {
    borderColor: designTokens.colors.amber[300],
    backgroundColor: designTokens.colors.amber[50],
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 8,
    textAlign: 'center',
  },
  actionContent: {
    alignItems: 'center',
  },
  premiumLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.amber[700],
    backgroundColor: designTokens.colors.amber[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    fontFamily: 'Inter',
  },
  recentCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    // Shadow styles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  trialBanner: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trialText: {
    flex: 1,
    marginLeft: 12,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  trialSubtitle: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    opacity: 0.9,
  },
  trialButton: {
    backgroundColor: designTokens.colors.pureWhite,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
  },
});

export default DashboardScreen; 