import './lib/polyfills';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { InvitationProvider, useInvitations } from './contexts/InvitationContext';
import { designTokens } from './constants/DesignTokens';
import { notificationService } from './lib/notifications';
import { analytics } from './lib/analytics';
import { performanceService } from './lib/performance';
import { stripeService } from './lib/stripe';
import { supabase } from './lib/supabase';
import NotificationBadge from './components/NotificationBadge';

// Import screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddItemScreen from './screens/AddItemScreen';
import RecipesScreen from './screens/RecipesScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';
import ItemsScreen from './screens/ItemsScreen';
import HouseholdsScreen from './screens/HouseholdsScreen';
import HouseholdManagementScreen from './screens/HouseholdManagementScreen';
import SettingsScreen from './screens/SettingsScreen';
import ItemDetailsScreen from './screens/ItemDetailsScreen';
import PremiumScreen from './screens/PremiumScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';
import ShoppingListPreviewScreen from './screens/ShoppingListPreviewScreen';
import BarcodeScannerScreen from './screens/BarcodeScannerScreen';
import WasteAnalyticsScreen from './screens/WasteAnalyticsScreen';
import WasteAnalyticsPreviewScreen from './screens/WasteAnalyticsPreviewScreen';
import AccountDetailsScreen from './screens/AccountDetailsScreen';
import FoodSearchScreen from './screens/FoodSearchScreen';
import HouseholdActivityScreen from './screens/HouseholdActivityScreen';

// Import onboarding navigator
import OnboardingNavigator from './navigation/OnboardingNavigator';
import HouseholdSetupScreen from './screens/onboarding/HouseholdSetupScreen';
import PermissionsScreen from './screens/onboarding/PermissionsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Configure linking for OAuth redirects
const linking = {
  prefixes: [Linking.createURL('/'), 'fridgehero://'],
  config: {
    screens: {
      Login: 'login',
    },
  },
};

function MainTabNavigator() {
  const { theme } = useTheme();
  const { pendingCount } = useInvitations();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Items') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'AddItem') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Recipes') {
            iconName = focused ? 'restaurant' : 'restaurant-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          // Render icon with notification badge for Settings
          if (route.name === 'Settings') {
            return (
              <View style={{ position: 'relative' }}>
                <Ionicons name={iconName} size={size} color={color} />
                {pendingCount > 0 && (
                  <NotificationBadge 
                    count={pendingCount} 
                    size="small"
                    style={{ 
                      top: -8, 
                      right: -8,
                      backgroundColor: designTokens.colors.expiredRed 
                    }}
                  />
                )}
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: designTokens.colors.heroGreen,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.cardBackground,
          borderTopWidth: 1,
          borderTopColor: theme.borderPrimary,
          paddingVertical: 8,
          height: 85,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter',
          marginBottom: 5,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Items" 
        component={ItemsScreen}
        options={{ tabBarLabel: 'My Items' }}
      />
      <Tab.Screen 
        name="AddItem" 
        component={AddItemScreen}
        options={{ 
          tabBarLabel: 'Add Item',
          tabBarIconStyle: { marginBottom: -3 },
        }}
      />
      <Tab.Screen 
        name="Recipes" 
        component={RecipesScreen}
        options={{ tabBarLabel: 'Recipes' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user } = useAuth();
  const { shouldShowOnboarding, isLoading, hasProfile, shouldContinueOnboarding } = useOnboarding();

  useEffect(() => {
    initializeServices();
    setupDeepLinking();
  }, []);

  // Add debugging for navigation decisions
  useEffect(() => {
    console.log('🔄 App Navigation Status:', {
      user: !!user,
      userId: user?.id,
      shouldShowOnboarding,
      shouldContinueOnboarding,
      isLoading,
      hasProfile,
      userMetadata: {
        in_onboarding_flow: user?.user_metadata?.in_onboarding_flow,
        onboarding_completed: user?.user_metadata?.onboarding_completed,
        onboarding_household_choice: user?.user_metadata?.onboarding_household_choice
      },
      timestamp: Date.now()
    });
  }, [user, shouldShowOnboarding, shouldContinueOnboarding, isLoading, hasProfile]);

  const initializeServices = async () => {
    try {
      // Initialize core services
      console.log('🚀 App: Initializing services...');
      
      // Initialize notifications service
      const notificationInitialized = await notificationService.initialize();
      console.log('📱 Notifications initialized:', notificationInitialized);
      
      // Initialize stripe service
      const stripeInitialized = await stripeService.initialize();
      console.log('💳 Stripe initialized:', stripeInitialized);
      
      // Initialize analytics
      await analytics.initialize();
      console.log('📊 Analytics initialized');
      
      // Initialize performance monitoring
      await performanceService.initialize();
      console.log('⚡ Performance monitoring initialized');
      
      console.log('🎉 App: All services initialized successfully');
    } catch (error) {
      console.error('❌ App: Service initialization failed:', error);
    }
  };

  const setupDeepLinking = () => {
    // Handle OAuth redirects
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);
      
      // Handle OAuth callback
      if (url.includes('auth/callback')) {
        console.log('🔐 OAuth callback detected');
        // Supabase will automatically handle the session from the URL
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      handleDeepLink(event.url);
    });

    // Handle deep link when app is opened from a link
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  };

  // Show loading state while checking onboarding status
  if (isLoading) {
    console.log('🔄 App: Showing loading state...');
    return null; // Or a loading screen component
  }

  // CRITICAL SAFETY CHECK: Never show main app without authenticated user
  if (!user) {
    console.log('🚨 SAFETY CHECK: No user authenticated - forcing onboarding/login');
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Show onboarding if user should see it (newly registered users)
  if (shouldShowOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Show household setup for users who completed account creation but need to continue onboarding
  if (shouldContinueOnboarding) {
    console.log('🏠 🎯 User needs to continue onboarding - showing HouseholdSetup directly');
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="HouseholdSetup">
        <Stack.Screen name="HouseholdSetup" component={HouseholdSetupScreen} />
        <Stack.Screen name="Permissions" component={PermissionsScreen} />
      </Stack.Navigator>
    );
  }

  // User is authenticated and has completed onboarding - show main app
  console.log('🔄 App: Showing main app (onboarding complete)');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="Households" component={HouseholdsScreen} />
      <Stack.Screen name="HouseholdManagement" component={HouseholdManagementScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
      <Stack.Screen name="ShoppingListPreview" component={ShoppingListPreviewScreen} />
      <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
      <Stack.Screen name="WasteAnalytics" component={WasteAnalyticsScreen} />
      <Stack.Screen name="WasteAnalyticsPreview" component={WasteAnalyticsPreviewScreen} />
      <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
      <Stack.Screen name="FoodSearch" component={FoodSearchScreen} />
      <Stack.Screen name="HouseholdActivity" component={HouseholdActivityScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingProvider>
          <NotificationProvider>
            <HouseholdProvider>
              <SubscriptionProvider>
                <InvitationProvider>
                  <NavigationContainer linking={linking}>
                    <AppNavigator />
                    <StatusBar style="auto" />
                  </NavigationContainer>
                </InvitationProvider>
              </SubscriptionProvider>
            </HouseholdProvider>
          </NotificationProvider>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
