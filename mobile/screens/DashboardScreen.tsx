import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  ScrollView,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { stripeService } from '../lib/stripe';
import { designTokens, getExpiryColor, getExpiryGradient, getContextualShadow } from '../constants/DesignTokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileAvatar from '../components/ProfileAvatar';

interface FridgeItem {
  id: string;
  name: string;
  expiry_date: string;
  category: string;
  quantity: number;
  status: string;
  created_at: string;
  added_by: string;
}

interface DashboardStats {
  expiringToday: number;
  expiringThisWeek: number;
  totalItems: number;
  itemsSaved: number;
  moneySaved: number;
  wasteReduced: number;
  recentActivity: any[];
}

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradient: string[];
  onPress: () => void;
  isPremium?: boolean;
}

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  return (
    <DashboardContent navigation={navigation} />
  );
}

// Internal Dashboard Content Component - Contains all the main Dashboard logic
function DashboardContent({ navigation }: any) {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    expiringToday: 0,
    expiringThisWeek: 0,
    totalItems: 0,
    itemsSaved: 0,
    moneySaved: 0,
    wasteReduced: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [showHouseholdSelector, setShowHouseholdSelector] = useState(false);
  const [householdLimits, setHouseholdLimits] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  // Enhanced animations for premium features
  const [shimmerAnimation] = useState(new Animated.Value(0));
  const [lockPulseAnimation] = useState(new Animated.Value(1));
  
  const { user } = useAuth();
  const { households, selectedHousehold, selectHousehold, loading: householdLoading } = useHousehold();
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedHousehold && !householdLoading) {
      fetchDashboardData();
      checkHouseholdLimits();
      startPulseAnimation();
    }
  }, [user, selectedHousehold, householdLoading]);

  useEffect(() => {
    if (!isPremium) {
      startLockAnimations();
    }
  }, [isPremium]);

  // Add focus effect to refresh premium status when returning to dashboard
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('📱 Dashboard focused - refreshing premium status');
        checkPremiumStatus();
      }
      if (selectedHousehold) {
        fetchDashboardData();
        checkHouseholdLimits();
      }
    }, [user, selectedHousehold])
  );

  const checkPremiumStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
      console.log('📱 Dashboard premium status:', status.isActive ? 'Premium' : 'Free');
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handlePremiumFeature = (featureName: string) => {
    Alert.alert(
      '🔒 Premium Feature',
      `${featureName} is available with FridgeHero Premium. Upgrade now to unlock smart features and save more money!`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { 
          text: 'Upgrade Now', 
          onPress: () => navigation.navigate('Premium'),
          style: 'default' 
        }
      ]
    );
  };

  // New method to check household limits
  const checkHouseholdLimits = async () => {
    if (!selectedHousehold) return;
    
    try {
      const limits = await stripeService.checkFreeTierLimits(selectedHousehold.household_id);
      setHouseholdLimits(limits);
      console.log('📱 Dashboard household limits updated:', limits);
    } catch (error) {
      console.error('Error checking household limits:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startLockAnimations = () => {
    // Shimmer effect for locked content
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Lock pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lockPulseAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fetchDashboardData = async () => {
    if (!selectedHousehold) {
      console.log('📱 No selected household, skipping dashboard fetch');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('📱 Fetching dashboard data for household:', selectedHousehold.households.name);
      
      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('household_id', selectedHousehold.household_id)
        .eq('status', 'active')
        .order('expiry_date', { ascending: true });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        Alert.alert('Error', 'Failed to load items');
        return;
      }

      // Fetch recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activityData, error: activityError } = await supabase
        .from('items')
        .select(`
          id,
          name,
          status,
          created_at,
          updated_at,
          added_by
        `)
        .eq('household_id', selectedHousehold.household_id)
        .gte('updated_at', sevenDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);

      // Fetch user profiles for the activity items
      let enrichedActivityData = activityData || [];
      if (activityData && activityData.length > 0) {
        const userIds = [...new Set(activityData.map(item => item.added_by).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, username')
            .in('id', userIds);

          // Enrich activity data with profile information
          enrichedActivityData = activityData.map(item => ({
            ...item,
            profiles: profilesData?.find(profile => profile.id === item.added_by) || null
          }));
        }
      }

      if (activityError) {
        console.error('Error fetching activity:', activityError);
      }



      const fetchedItems = itemsData || [];
      const recentActivity = enrichedActivityData || [];
      
      console.log('📱 Found items:', fetchedItems.length);
      setItems(fetchedItems);
      calculateStats(fetchedItems, recentActivity);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (items: FridgeItem[], activity: any[]) => {
    const today = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);

    const expiringToday = items.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      return expiryDate.toDateString() === today.toDateString();
    }).length;

    const expiringThisWeek = items.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= oneWeekFromNow && expiryDate >= today;
    }).length;

    // Calculate estimated savings (rough estimates for demo)
    const totalItems = items.length;
    const estimatedMoneySaved = totalItems * 3.5; // Avg $3.50 per item saved
    const estimatedWasteReduced = totalItems * 0.3; // Avg 0.3kg per item

    setStats({
      expiringToday,
      expiringThisWeek,
      totalItems,
      itemsSaved: activity.filter(a => a.status === 'used').length,
      moneySaved: estimatedMoneySaved,
      wasteReduced: estimatedWasteReduced,
      recentActivity: activity,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryText = (days: number) => {
    if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const getTimeOfDayContext = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'morning';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'default';
  };

  const getHeroWidget = () => {
    const context = getTimeOfDayContext();
    const urgentItems = items.filter(item => getDaysUntilExpiry(item.expiry_date) <= 1);

    if (urgentItems.length > 0) {
      return {
        title: '⚡ Action Needed',
        subtitle: `${urgentItems.length} item${urgentItems.length !== 1 ? 's' : ''} expiring soon`,
        action: 'Cook Now',
        gradient: designTokens.gradients.amber,
        onPress: () => navigation.navigate('Recipes'),
      };
    }

    switch (context) {
      case 'morning':
        return {
          title: '🌅 Good Morning!',
          subtitle: 'Ready to add today\'s groceries?',
          action: 'Quick Add',
          gradient: designTokens.gradients.heroMorning,
          onPress: () => navigation.navigate('AddItem'),
        };
      case 'evening':
        return {
          title: '🍽️ Dinner Time',
          subtitle: 'Find recipes with your ingredients',
          action: 'Cook Now',
          gradient: designTokens.gradients.heroEvening,
          onPress: () => navigation.navigate('Recipes'),
        };
      default:
        return {
          title: '🏠 Your Kitchen',
          subtitle: 'Everything looks fresh and organized',
          action: 'View Fridge',
          gradient: designTokens.gradients.cardFresh,
          onPress: () => {},
        };
    }
  };

  const markAsUsed = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'used' })
        .eq('id', itemId);

      if (error) {
        Alert.alert('Error', 'Failed to mark item as used');
      } else {
        // Trigger celebration animation
        fetchDashboardData();
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const renderExpiryItem = ({ item }: { item: FridgeItem }) => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
    const shouldPulse = daysUntilExpiry <= 1;

    return (
      <Animated.View
        style={[
          styles.expiryItem,
          shouldPulse && { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <LinearGradient
          colors={daysUntilExpiry <= 1 ? ['#FEF3C7', '#FBBF24'] : ['#F0FDF4', '#DCFCE7']}
          style={styles.expiryItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.expiryItemName}>{item.name}</Text>
          <Text style={[styles.expiryItemTime, { color: getExpiryColor(daysUntilExpiry) }]}>
            {getExpiryText(daysUntilExpiry)}
          </Text>
          <TouchableOpacity
            style={styles.useButton}
            onPress={() => markAsUsed(item.id)}
          >
            <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.heroGreen} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };

  const heroWidget = getHeroWidget();

  const renderHouseholdSelector = () => (
    <View style={[styles.householdSelector, { backgroundColor: theme.cardBackground, borderBottomColor: theme.borderPrimary }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.householdScrollView}>
        <View style={styles.householdList}>
          {households.map((household) => (
            <TouchableOpacity
              key={household.household_id}
              style={[
                styles.householdChip,
                { 
                  backgroundColor: selectedHousehold?.household_id === household.household_id ? designTokens.colors.heroGreen : theme.bgTertiary,
                  borderColor: selectedHousehold?.household_id === household.household_id ? designTokens.colors.heroGreen : theme.borderPrimary
                }
              ]}
              onPress={() => {
                selectHousehold(household);
                setShowHouseholdSelector(false);
              }}
            >
              <Ionicons 
                name="home" 
                size={16} 
                color={selectedHousehold?.household_id === household.household_id ? designTokens.colors.pureWhite : theme.textSecondary}
              />
              <Text style={[
                styles.householdChipText,
                { 
                  color: selectedHousehold?.household_id === household.household_id ? designTokens.colors.pureWhite : theme.textPrimary
                }
              ]}>
                {household.households.name}
              </Text>
              {household.role === 'owner' && (
                <Ionicons 
                  name="star" 
                  size={12} 
                  color={selectedHousehold?.household_id === household.household_id ? designTokens.colors.amber[200] : designTokens.colors.amber[500]} 
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderActivityItem = (activity: any, index: number) => {
    // Get the username from the joined profiles data
    const username = activity.profiles?.full_name || activity.profiles?.username || 'Someone';
    

    
    return (
      <View key={`${activity.id}-${index}`} style={[styles.activityItem, { borderBottomColor: theme.borderPrimary }]}>
        <View style={[styles.activityIcon, { backgroundColor: theme.bgTertiary }]}>
          <Ionicons 
            name={activity.status === 'used' ? 'checkmark-circle' : 'add-circle'} 
            size={16} 
            color={activity.status === 'used' ? designTokens.colors.heroGreen : designTokens.colors.primary[500]} 
          />
        </View>
        <View style={styles.activityContent}>
          <Text style={[styles.activityText, { color: theme.textSecondary }]}>
            <Text style={[styles.activityUser, { color: theme.textPrimary }]}>
              {username}
            </Text>
            {' '}
            {activity.status === 'used' ? 'used' : 'added'}
            {' '}
            <Text style={styles.activityItemName}>{activity.name}</Text>
          </Text>
          <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
            {new Date(activity.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  const quickActions: QuickAction[] = [
    {
      id: 'add_item',
      title: 'Add Item',
      icon: 'add-circle',
      color: designTokens.colors.heroGreen,
      gradient: [designTokens.colors.heroGreen, designTokens.colors.primary[600]],
      onPress: () => navigation.navigate('AddItem'),
      isPremium: false,
    },
    {
      id: 'scan_barcode',
      title: 'Scan Barcode',
      icon: 'scan',
      color: designTokens.colors.ocean,
      gradient: [designTokens.colors.ocean, designTokens.colors.primary[700]],
      onPress: () => {
        if (!isPremium) {
          handlePremiumFeature('Barcode Scanner');
        } else {
          navigation.navigate('BarcodeScanner');
        }
      },
      isPremium: true,
    },
    {
      id: 'view_recipes',
      title: 'Smart Recipes',
      icon: 'restaurant',
      color: designTokens.colors.sunset,
      gradient: [designTokens.colors.sunset, designTokens.colors.amber[600]],
      onPress: () => navigation.navigate('Recipes'),
      isPremium: true,
    },
    {
      id: 'manage_households',
      title: 'Households',
      icon: 'people',
      color: designTokens.colors.primary[500],
      gradient: [designTokens.colors.primary[500], designTokens.colors.primary[700]],
      onPress: () => navigation.navigate('Households'),
      isPremium: false,
    },
  ];

  const navigationBlocks = [
    {
      id: 'my_items',
      title: 'My Items',
      subtitle: `${stats.totalItems} active items`,
      icon: 'list',
      color: designTokens.colors.heroGreen,
      onPress: () => navigation.navigate('Items'),
      isPremium: false,
    },
    {
      id: 'recipes',
      title: 'Smart Recipe AI',
      subtitle: isPremium ? 'Cook with what you have' : '🔒 Premium Feature',
      icon: 'restaurant',
      color: designTokens.colors.sunset,
      onPress: () => navigation.navigate('Recipes'),
      isPremium: true,
      previewData: {
        recipes: [
          { name: 'Emergency Tomato Pasta', match: 94 },
          { name: 'Leftover Stir-fry', match: 89 },
          { name: 'Quick Salad Bowl', match: 82 },
        ],
        savings: '$24.50'
      }
    },
    {
      id: 'shopping_list',
      title: 'Smart Shopping List',
      subtitle: isPremium ? 'AI-powered grocery planning' : '🔒 Premium Feature',
      icon: 'bag',
      color: designTokens.colors.ocean,
      onPress: () => navigation.navigate('ShoppingList'),
      isPremium: true,
      previewData: {
        items: ['Tomatoes', 'Spinach', 'Olive Oil', 'Garlic'],
        autoGenerated: 8
      }
    },
    {
      id: 'waste_reports',
      title: 'Waste Analytics',
      subtitle: isPremium ? 'Track your progress & savings' : '🔒 Premium Feature',
      icon: 'analytics',
      color: designTokens.colors.primary[500],
      onPress: () => navigation.navigate('WasteAnalytics'),
      isPremium: true,
      previewData: {
        wasteReduced: '12.3kg',
        moneySaved: '$89.50',
        co2Prevented: '24.1kg'
      }
    },
  ];

  const renderMetricCard = (title: string, value: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap, color: string) => (
    <View style={styles.metricCard}>
      <LinearGradient
        colors={[theme.cardBackground, theme.bgSecondary]}
        style={styles.metricGradient}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <Text style={[styles.metricTitle, { color: theme.textSecondary }]}>{title}</Text>
        </View>
        <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{value}</Text>
        <Text style={[styles.metricSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
      </LinearGradient>
    </View>
  );

  const renderEnhancedQuickAction = (action: QuickAction) => {
    const isPremiumLocked = action.isPremium && !isPremium;

    return (
      <TouchableOpacity
        key={action.id}
        style={[
          styles.quickAction,
          isPremiumLocked && styles.lockedQuickActionEnhanced
        ]}
        onPress={action.onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isPremiumLocked ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.25)'] : action.gradient as any}
          style={styles.quickActionGradient}
        >
          {/* Main Content */}
          <View style={styles.quickActionContent}>
            <Animated.View style={isPremiumLocked ? {
              opacity: shimmerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0.9]
              })
            } : {}}>
              <Ionicons 
                name={action.icon} 
                size={22} 
                color={isPremiumLocked ? 'rgba(255, 165, 0, 0.9)' : designTokens.colors.pureWhite} 
              />
            </Animated.View>
            <Text style={[
              styles.quickActionText,
              isPremiumLocked && styles.quickActionTextLocked
            ]}>
              {action.title}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEnhancedNavigationBlock = (block: any) => {
    const hasFeatureAccess = !block.isPremium || isPremium;
    
    if (hasFeatureAccess) {
      return (
        <TouchableOpacity
          key={block.id}
          style={styles.navBlock}
          onPress={block.onPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.cardBackground, theme.bgSecondary]}
            style={styles.navBlockGradient}
          >
            <View style={[styles.navBlockIcon, { backgroundColor: block.color + '20' }]}>
              <Ionicons name={block.icon} size={24} color={block.color} />
            </View>
            <View style={styles.navBlockContent}>
              <Text style={[styles.navBlockTitle, { color: theme.textPrimary }]}>{block.title}</Text>
              <Text style={[styles.navBlockSubtitle, { color: theme.textSecondary }]}>{block.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    // Locked premium navigation block with preview
    return (
      <TouchableOpacity
        key={block.id}
        style={[styles.navBlock, styles.lockedNavBlockEnhanced]}
        onPress={block.onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.05)', 'rgba(255, 165, 0, 0.1)']}
          style={styles.navBlockGradient}
        >
          <View style={[styles.navBlockIcon, { backgroundColor: block.color + '20' }]}>
            <Ionicons name={block.icon} size={24} color={block.color} />
          </View>
          <View style={styles.navBlockContent}>
            <View style={styles.lockedNavBlockHeader}>
              <Text style={[styles.navBlockTitle, { color: theme.textPrimary }]}>{block.title}</Text>
            </View>
            <Text style={[styles.navBlockSubtitle, { color: theme.textSecondary }]}>{block.subtitle}</Text>
            
            {/* Preview Data */}
            {block.previewData && (
              <View style={styles.previewDataContainer}>
                {block.id === 'recipes' && (
                  <View style={styles.recipePreview}>
                    <Text style={styles.previewLabel}>Available recipes:</Text>
                    <Text style={styles.previewValue}>
                      {block.previewData.recipes.slice(0, 2).map((r: any) => r.name).join(', ')}...
                    </Text>
                  </View>
                )}
                {block.id === 'shopping_list' && (
                  <View style={styles.shoppingPreview}>
                    <Text style={styles.previewLabel}>Smart suggestions:</Text>
                    <Text style={styles.previewValue}>
                      {block.previewData.autoGenerated} items auto-generated
                    </Text>
                  </View>
                )}
                {block.id === 'waste_reports' && (
                  <View style={styles.analyticsPreview}>
                    <Text style={styles.previewLabel}>This month:</Text>
                    <Text style={styles.previewValue}>
                      {block.previewData.moneySaved} saved • {block.previewData.wasteReduced} waste reduced
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {/* Enhanced Shimmer effect overlay */}
          <Animated.View style={[
            styles.shimmerOverlayEnhanced,
            {
              opacity: shimmerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4]
              })
            }
          ]} />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading || householdLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your kitchen...</Text>
      </View>
    );
  }

  if (!selectedHousehold) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>No household selected</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
        <ProfileAvatar 
          size={44} 
          onPress={() => navigation.navigate('AccountDetails')}
          isPremium={isPremium}
        />
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>🏠 {selectedHousehold.households.name}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {householdLimits?.isHouseholdPremium ? (
              `${stats.totalItems} items • Premium Household ✨`
            ) : householdLimits?.itemLimit > 0 ? (
              `${stats.totalItems}/${householdLimits.itemLimit} items`
            ) : (
              `${stats.totalItems} items`
            )}
          </Text>
        </View>
        
        {households.length > 1 && (
          <TouchableOpacity 
            onPress={() => setShowHouseholdSelector(!showHouseholdSelector)} 
            style={[styles.headerButton, { backgroundColor: designTokens.colors.gray[100] }]}
          >
            <Ionicons name="swap-horizontal-outline" size={24} color={designTokens.colors.heroGreen} />
          </TouchableOpacity>
        )}
      </View>
        
      {/* Household Selector */}
      {showHouseholdSelector && renderHouseholdSelector()}

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Metrics */}
        <View style={styles.metricsSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Today's Overview</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Expiring Today',
              stats.expiringToday.toString(),
              'Items need attention',
              'time',
              designTokens.colors.expiredRed
            )}
            {renderMetricCard(
              'This Week',
              stats.expiringThisWeek.toString(),
              'Items expiring soon',
              'calendar',
              designTokens.colors.alertAmber
            )}
            {renderMetricCard(
              'Money Saved',
              `$${stats.moneySaved.toFixed(0)}`,
              'Estimated this month',
              'cash',
              designTokens.colors.heroGreen
            )}
            {renderMetricCard(
              'Waste Reduced',
              `${stats.wasteReduced.toFixed(1)}kg`,
              'Environmental impact',
              'leaf',
              designTokens.colors.primary[500]
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderEnhancedQuickAction)}
          </View>
        </View>

        {/* Navigation Blocks */}
        <View style={styles.navigationSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Navigate</Text>
          {navigationBlocks.map(renderEnhancedNavigationBlock)}
        </View>

        {/* Expiring Soon */}
        {items.filter(item => getDaysUntilExpiry(item.expiry_date) <= 3).length > 0 && (
          <View style={styles.expiringSection}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>⚡ Items Expiring Soon</Text>
            <FlatList
              horizontal
              data={items.filter(item => getDaysUntilExpiry(item.expiry_date) <= 3)}
              renderItem={renderExpiryItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.expiringList}
            />
          </View>
        )}

        {/* Recent Activity */}
        {stats.recentActivity.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Activity</Text>
            <View style={[styles.activityList, { backgroundColor: theme.cardBackground }]}>
              {stats.recentActivity.slice(0, 5).map(renderActivityItem)}
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('HouseholdActivity')}
            >
              <Text style={styles.viewAllButtonText}>View All Activity</Text>
              <Ionicons name="chevron-forward" size={16} color={designTokens.colors.primary[600]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {stats.totalItems === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Start Your Food Journey</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Add your first items to begin tracking freshness and reducing waste
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('AddItem')}
            >
              <LinearGradient
                colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
                style={styles.emptyStateButtonGradient}
              >
                <Ionicons name="add" size={20} color={designTokens.colors.pureWhite} />
                <Text style={styles.emptyStateButtonText}>Add First Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddItem')}
      >
        <LinearGradient
          colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: designTokens.colors.gray[100],
  },
  headerTitleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    padding: designTokens.spacing.md,
  },
  heroWidget: {
    marginBottom: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.xl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  heroWidgetGradient: {
    padding: designTokens.spacing.lg,
    minHeight: 120,
    justifyContent: 'center',
  },
  heroTitle: {
    ...designTokens.typography.textStyles.h2,
    color: designTokens.colors.deepCharcoal,
    marginBottom: 4,
  },
  heroSubtitle: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
    marginBottom: designTokens.spacing.md,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  heroActionText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.heroGreen,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statGradient: {
    padding: designTokens.spacing.md,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  statNumber: {
    ...designTokens.typography.textStyles.h2,
    color: designTokens.colors.deepCharcoal,
    marginBottom: 4,
  },
  statLabel: {
    ...designTokens.typography.textStyles.small,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    marginBottom: 4,
  },
  expiringSection: {
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.md,
  },
  sectionTitle: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.deepCharcoal,
    marginBottom: designTokens.spacing.sm,
    fontWeight: '700',
  },
  expiringList: {
    paddingHorizontal: 0,
  },
  expiryItem: {
    marginRight: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  expiryItemGradient: {
    padding: designTokens.spacing.sm,
    width: 120,
    minHeight: 85,
    justifyContent: 'space-between',
  },
  expiryItemName: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.deepCharcoal,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 13,
  },
  expiryItemTime: {
    ...designTokens.typography.textStyles.caption,
    fontWeight: '500',
    marginBottom: designTokens.spacing.xs,
    fontSize: 11,
  },
  useButton: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing['2xl'],
  },
  emptyTitle: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.deepCharcoal,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  emptySubtitle: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    maxWidth: 280,
  },
  fab: {
    position: 'absolute',
    bottom: designTokens.spacing.lg,
    right: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.full,
    elevation: 8,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumPrompt: {
    marginTop: designTokens.spacing.md,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  premiumPromptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
  },
  premiumPromptIcon: {
    marginRight: designTokens.spacing.md,
  },
  premiumPromptContent: {
    flex: 1,
  },
  premiumPromptTitle: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.deepCharcoal,
    marginBottom: 4,
  },
  premiumPromptSubtitle: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
  },
  householdSelector: {
    marginTop: designTokens.spacing.md,
    padding: designTokens.spacing.md,
  },
  householdScrollView: {
    padding: designTokens.spacing.md,
  },
  householdList: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  householdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designTokens.colors.primary[200],
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    gap: designTokens.spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  householdChipText: {
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray[700],
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  premiumHeaderButton: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
  },
  premiumHeaderGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
    marginHorizontal: 2,
  },
  fabPremiumBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: designTokens.colors.amber[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPremiumBadgeGradient: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPremiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  
  // Metrics Section - Reduced sizes
  metricsSection: {
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 50) / 2,
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  metricGradient: {
    padding: designTokens.spacing.sm,
    minHeight: 75,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  metricIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.xs,
  },
  metricTitle: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    fontWeight: '500',
    fontSize: 11,
  },
  metricValue: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.deepCharcoal,
    marginBottom: 2,
    fontSize: 18,
  },
  metricSubtitle: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[500],
    fontSize: 10,
  },

  // Quick Actions - Reduced sizes
  quickActionsSection: {
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  quickAction: {
    flex: 1,
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    height: 70,
  },
  quickActionGradient: {
    flex: 1,
    position: 'relative',
  },
  quickActionContent: {
    flex: 1,
    padding: designTokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickActionText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.pureWhite,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    maxWidth: '100%',
  },
  quickActionTextLocked: {
    color: 'rgba(255, 165, 0, 0.9)',
    fontWeight: '700',
  },
  quickActionPremiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quickActionPremiumBadgeGradient: {
    padding: 3,
    borderRadius: 8,
  },

  // Navigation Blocks - Reduced sizes
  navigationSection: {
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  navBlock: {
    marginBottom: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  navBlockGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
  },
  navBlockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  navBlockContent: {
    flex: 1,
  },
  navBlockTitle: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.deepCharcoal,
    marginBottom: 2,
    fontWeight: '600',
    fontSize: 14,
  },
  navBlockSubtitle: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    fontSize: 11,
  },

  // Enhanced Expiry Items
  expiryItemCategory: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expiryItemCategoryText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[700],
    fontWeight: '500',
    fontSize: 10,
  },

  // Activity Feed
  activitySection: {
    paddingHorizontal: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.md,
  },
  activityList: {
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[100],
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: designTokens.colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[700],
    marginBottom: 2,
    fontSize: 12,
  },
  activityUser: {
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
  },
  activityItemName: {
    fontWeight: '500',
    color: designTokens.colors.primary[600],
  },
  activityTime: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[500],
    fontSize: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: designTokens.spacing.sm,
    padding: designTokens.spacing.xs,
    gap: designTokens.spacing.xs,
  },
  viewAllButtonText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.primary[600],
    fontWeight: '500',
    fontSize: 12,
  },

  // Enhanced Empty State
  emptyStateButton: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginTop: designTokens.spacing.lg,
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  emptyStateButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.pureWhite,
    fontWeight: '600',
  },

  // Premium Button Container
  premiumButtonContainer: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: designTokens.colors.amber[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  premiumButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  premiumBadge: {
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginLeft: 2,
    minWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    textAlign: 'center',
  },

  // Enhanced Quick Actions with Premium Locking
  lockedQuickAction: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  lockedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
  },
  lockedQuickActionText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.pureWhite,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 10,
  },
  premiumLockBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 2,
    marginTop: 2,
  },

  // Enhanced Navigation Blocks with Premium Features - Reduced padding
  lockedNavBlock: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  lockedNavBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewDataContainer: {
    paddingTop: designTokens.spacing.xs,
    paddingBottom: 2,
  },
  recipePreview: {
    marginBottom: 4,
  },
  previewLabel: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    fontWeight: '500',
    fontSize: 10,
  },
  previewValue: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.deepCharcoal,
    fontWeight: '600',
    fontSize: 10,
  },
  shoppingPreview: {
    marginBottom: 4,
  },
  analyticsPreview: {
    marginBottom: 4,
  },
  upgradeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: designTokens.spacing.sm,
  },
  upgradeText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.amber[600],
    fontWeight: '600',
    marginRight: 4,
    fontSize: 10,
  },
  premiumLockBadgeNavEnhanced: {
    backgroundColor: designTokens.colors.amber[500],
    borderRadius: 8,
    padding: 3,
    marginLeft: designTokens.spacing.xs,
  },
  premiumLockBadgeNavGradient: {
    borderRadius: 8,
    padding: 3,
  },
  shimmerOverlayEnhanced: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: designTokens.borderRadius.lg,
  },
  upgradeIndicatorEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: designTokens.spacing.sm,
  },
  upgradeIndicatorGradient: {
    borderRadius: 8,
    padding: 3,
  },
  upgradeTextEnhanced: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.amber[600],
    fontWeight: '600',
    marginRight: 4,
    fontSize: 10,
  },
  lockedQuickActionEnhanced: {
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    elevation: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  lockedNavBlockEnhanced: {
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
}); 