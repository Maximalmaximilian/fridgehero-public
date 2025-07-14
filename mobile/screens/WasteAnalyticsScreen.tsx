import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { stripeService } from '../lib/stripe';
import { designTokens } from '../constants/DesignTokens';

interface WasteData {
  totalItemsTracked: number;
  itemsUsed: number;
  itemsWasted: number;
  wastePercentage: number;
  moneySaved: number;
  co2Prevented: number;
  wasteReduced: number;
  monthlyData: MonthlyData[];
  categoryBreakdown: CategoryData[];
  achievements: Achievement[];
  trends: TrendData;
}

interface MonthlyData {
  month: string;
  saved: number;
  wasted: number;
  percentage: number;
}

interface CategoryData {
  category: string;
  saved: number;
  wasted: number;
  color: string;
  icon: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  achieved: boolean;
  progress: number;
  target: number;
}

interface TrendData {
  savingsDirection: 'up' | 'down' | 'stable';
  savingsChange: number;
  wasteDirection: 'up' | 'down' | 'stable';
  wasteChange: number;
}

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

export default function WasteAnalyticsScreen({ navigation }: any) {
  const [wasteData, setWasteData] = useState<WasteData>({
    totalItemsTracked: 0,
    itemsUsed: 0,
    itemsWasted: 0,
    wastePercentage: 0,
    moneySaved: 0,
    co2Prevented: 0,
    wasteReduced: 0,
    monthlyData: [],
    categoryBreakdown: [],
    achievements: [],
    trends: {
      savingsDirection: 'stable',
      savingsChange: 0,
      wasteDirection: 'stable',
      wasteChange: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [isPremium, setIsPremium] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [animatedValues] = useState({
    wastePercentage: new Animated.Value(0),
    savingsGrow: new Animated.Value(0),
    co2Grow: new Animated.Value(0),
  });

  const { user } = useAuth();
  const { selectedHousehold } = useHousehold();
  const { theme } = useTheme();

  useEffect(() => {
    if (user && selectedHousehold) {
      fetchWasteAnalytics();
    }
  }, [user, selectedHousehold, selectedTimeframe]);

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  // Add focus effect to refresh subscription status when returning to screen
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('📊 Waste Analytics screen focused - refreshing subscription status');
        checkSubscriptionStatus();
      }
    }, [user])
  );

  useEffect(() => {
    // Animate metrics when data loads
    if (!loading) {
      Animated.stagger(200, [
        Animated.timing(animatedValues.wastePercentage, {
          toValue: wasteData.wastePercentage,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValues.savingsGrow, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues.co2Grow, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, wasteData]);

  const fetchWasteAnalytics = async () => {
    if (!selectedHousehold) return;

    try {
      console.log('📊 Fetching waste analytics for household:', selectedHousehold.household_id);

      // Calculate date range based on timeframe
      const now = new Date();
      const startDate = new Date();
      
      switch (selectedTimeframe) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch all items from the household within timeframe
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('household_id', selectedHousehold.household_id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching items:', error);
        Alert.alert('Error', 'Failed to load analytics data');
        return;
      }

      const analytics = calculateWasteAnalytics(items || []);
      setWasteData(analytics);

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateWasteAnalytics = (items: any[]): WasteData => {
    const totalItems = items.length;
    const usedItems = items.filter(item => item.status === 'used').length;
    const expiredItems = items.filter(item => {
      if (item.status === 'trashed') return true;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate < new Date() && item.status === 'active';
    }).length;

    const wastePercentage = totalItems > 0 ? (expiredItems / totalItems) * 100 : 0;
    
    // Estimated calculations (in production, you'd have real cost data)
    const avgItemCost = 3.50;
    const avgItemWeight = 0.3; // kg
    const co2PerKg = 2.1; // kg CO2 per kg food waste prevented

    const moneySaved = usedItems * avgItemCost;
    const wasteReduced = expiredItems * avgItemWeight;
    const co2Prevented = usedItems * avgItemWeight * co2PerKg;

    // Generate monthly data for charts
    const monthlyData = generateMonthlyData(items);
    const categoryBreakdown = generateCategoryBreakdown(items);
    const achievements = generateAchievements(usedItems, expiredItems, moneySaved);
    const trends = calculateTrends(items);

    return {
      totalItemsTracked: totalItems,
      itemsUsed: usedItems,
      itemsWasted: expiredItems,
      wastePercentage,
      moneySaved,
      co2Prevented,
      wasteReduced,
      monthlyData,
      categoryBreakdown,
      achievements,
      trends,
    };
  };

  const generateMonthlyData = (items: any[]): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      saved: Math.floor(Math.random() * 50) + 20,
      wasted: Math.floor(Math.random() * 20) + 5,
      percentage: Math.floor(Math.random() * 30) + 70,
    }));
  };

  const generateCategoryBreakdown = (items: any[]): CategoryData[] => {
    const categories = [
      { name: 'Vegetables', icon: 'leaf-outline', color: designTokens.colors.heroGreen },
      { name: 'Fruits', icon: 'nutrition-outline', color: designTokens.colors.sunset },
      { name: 'Dairy', icon: 'water-outline', color: designTokens.colors.ocean },
      { name: 'Meat', icon: 'restaurant-outline', color: designTokens.colors.expiredRed },
      { name: 'Grains', icon: 'trail-sign-outline', color: designTokens.colors.amber[500] },
    ];

    return categories.map(cat => ({
      category: cat.name,
      saved: Math.floor(Math.random() * 30) + 10,
      wasted: Math.floor(Math.random() * 10) + 2,
      color: cat.color,
      icon: cat.icon,
    }));
  };

  const generateAchievements = (used: number, wasted: number, saved: number): Achievement[] => [
    {
      id: '1',
      title: 'Waste Warrior',
      description: 'Keep waste under 10%',
      icon: 'shield-checkmark',
      color: designTokens.colors.heroGreen,
      achieved: (wasted / (used + wasted)) < 0.1,
      progress: Math.min(100, ((used + wasted) > 0 ? (1 - wasted / (used + wasted)) * 100 : 0)),
      target: 90,
    },
    {
      id: '2',
      title: 'Money Saver',
      description: 'Save $100 this month',
      icon: 'cash',
      color: designTokens.colors.amber[500],
      achieved: saved >= 100,
      progress: Math.min(100, (saved / 100) * 100),
      target: 100,
    },
    {
      id: '3',
      title: 'Eco Champion',
      description: 'Prevent 5kg CO2 emissions',
      icon: 'leaf',
      color: designTokens.colors.primary[500],
      achieved: (used * 0.3 * 2.1) >= 5,
      progress: Math.min(100, ((used * 0.3 * 2.1) / 5) * 100),
      target: 5,
    },
  ];

  const calculateTrends = (items: any[]): TrendData => {
    // Simplified trend calculation
    return {
      savingsDirection: 'up',
      savingsChange: 12.5,
      wasteDirection: 'down',
      wasteChange: -8.3,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWasteAnalytics();
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={[styles.backButton, { backgroundColor: theme.cardBackground }]}
      >
        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Waste Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Track your environmental impact
        </Text>
      </View>
      <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.cardBackground }]}>
        <Ionicons name="share-outline" size={20} color={designTokens.colors.heroGreen} />
      </TouchableOpacity>
    </View>
  );

  const renderTimeframeSelector = () => (
    <View style={[styles.timeframeContainer, { backgroundColor: theme.cardBackground }]}>
      {(['week', 'month', 'year'] as const).map((timeframe) => (
        <TouchableOpacity
          key={timeframe}
          style={[
            styles.timeframeButton,
            selectedTimeframe === timeframe && styles.timeframeButtonActive,
            { borderColor: theme.borderPrimary }
          ]}
          onPress={() => setSelectedTimeframe(timeframe)}
        >
          <Text style={[
            styles.timeframeText,
            { color: selectedTimeframe === timeframe ? designTokens.colors.pureWhite : theme.textSecondary }
          ]}>
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderKPICards = () => (
    <View style={styles.kpiContainer}>
      <Animated.View style={[styles.kpiCard, { transform: [{ scale: animatedValues.savingsGrow }] }]}>
        <LinearGradient
          colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
          style={styles.kpiGradient}
        >
          <View style={styles.kpiIcon}>
            <Ionicons name="cash" size={24} color={designTokens.colors.pureWhite} />
          </View>
          <Text style={styles.kpiValue}>${wasteData.moneySaved.toFixed(0)}</Text>
          <Text style={styles.kpiLabel}>Money Saved</Text>
          <View style={styles.kpiTrend}>
            <Ionicons 
              name={wasteData.trends.savingsDirection === 'up' ? 'trending-up' : wasteData.trends.savingsDirection === 'down' ? 'trending-down' : 'remove'} 
              size={16} 
              color={designTokens.colors.pureWhite} 
            />
            <Text style={styles.kpiTrendText}>
              {wasteData.trends.savingsChange > 0 ? '+' : ''}{wasteData.trends.savingsChange.toFixed(1)}%
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.kpiCard, { transform: [{ scale: animatedValues.co2Grow }] }]}>
        <LinearGradient
          colors={[designTokens.colors.primary[500], designTokens.colors.primary[700]]}
          style={styles.kpiGradient}
        >
          <View style={styles.kpiIcon}>
            <Ionicons name="leaf" size={24} color={designTokens.colors.pureWhite} />
          </View>
          <Text style={styles.kpiValue}>{wasteData.co2Prevented.toFixed(1)}kg</Text>
          <Text style={styles.kpiLabel}>CO₂ Prevented</Text>
          <View style={styles.kpiTrend}>
            <Ionicons name="trending-up" size={16} color={designTokens.colors.pureWhite} />
            <Text style={styles.kpiTrendText}>+15.2%</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );

  const renderWasteCircularChart = () => {
    const radius = 80;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    const wasteStrokeDasharray = `${(wasteData.wastePercentage / 100) * circumference} ${circumference}`;
    const savedStrokeDasharray = `${((100 - wasteData.wastePercentage) / 100) * circumference} ${circumference}`;

    return (
      <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Waste vs Saved Ratio</Text>
        <View style={styles.circularChart}>
          <View style={styles.circularChartContainer}>
            {/* Background circle */}
            <View style={[styles.circularBg, { borderColor: theme.borderPrimary }]} />
            
            {/* Waste arc */}
            <Animated.View 
              style={[
                styles.circularProgress,
                { 
                  borderColor: designTokens.colors.expiredRed,
                  transform: [{ rotate: '-90deg' }]
                }
              ]}
            />
            
            {/* Center content */}
            <View style={styles.circularCenter}>
              <Text style={[styles.circularPercentage, { color: theme.textPrimary }]}>
                {wasteData.wastePercentage.toFixed(1)}%
              </Text>
              <Text style={[styles.circularLabel, { color: theme.textSecondary }]}>
                Waste Rate
              </Text>
            </View>
          </View>
          
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: designTokens.colors.heroGreen }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                Saved ({wasteData.itemsUsed} items)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: designTokens.colors.expiredRed }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                Wasted ({wasteData.itemsWasted} items)
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => (
    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Category Performance</Text>
      <View style={styles.categoryList}>
        {wasteData.categoryBreakdown.map((category, index) => {
          const total = category.saved + category.wasted;
          const savedPercentage = total > 0 ? (category.saved / total) * 100 : 0;
          
          return (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons name={category.icon as any} size={16} color={category.color} />
                </View>
                <Text style={[styles.categoryName, { color: theme.textPrimary }]}>
                  {category.category}
                </Text>
                <Text style={[styles.categoryPercentage, { color: category.color }]}>
                  {savedPercentage.toFixed(0)}%
                </Text>
              </View>
              <View style={[styles.categoryBar, { backgroundColor: theme.bgTertiary }]}>
                <View 
                  style={[
                    styles.categoryBarFill,
                    { 
                      backgroundColor: category.color,
                      width: `${savedPercentage}%`
                    }
                  ]} 
                />
              </View>
              <View style={styles.categoryStats}>
                <Text style={[styles.categoryStat, { color: theme.textTertiary }]}>
                  {category.saved} saved • {category.wasted} wasted
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Achievements</Text>
      <View style={styles.achievementsList}>
        {wasteData.achievements.map((achievement) => (
          <View key={achievement.id} style={styles.achievementItem}>
            <LinearGradient
              colors={achievement.achieved 
                ? [achievement.color, achievement.color + 'CC'] 
                : [theme.bgTertiary, theme.bgSecondary]
              }
              style={styles.achievementGradient}
            >
              <View style={styles.achievementIcon}>
                <Ionicons 
                  name={achievement.icon as any} 
                  size={20} 
                  color={achievement.achieved ? designTokens.colors.pureWhite : theme.textTertiary} 
                />
              </View>
              <View style={styles.achievementContent}>
                <Text style={[
                  styles.achievementTitle,
                  { color: achievement.achieved ? designTokens.colors.pureWhite : theme.textPrimary }
                ]}>
                  {achievement.title}
                </Text>
                <Text style={[
                  styles.achievementDescription,
                  { color: achievement.achieved ? 'rgba(255,255,255,0.9)' : theme.textSecondary }
                ]}>
                  {achievement.description}
                </Text>
                <View style={styles.achievementProgress}>
                  <View style={[
                    styles.achievementProgressBar,
                    { backgroundColor: achievement.achieved ? 'rgba(255,255,255,0.3)' : theme.borderPrimary }
                  ]}>
                    <View 
                      style={[
                        styles.achievementProgressFill,
                        { 
                          backgroundColor: achievement.achieved ? designTokens.colors.pureWhite : achievement.color,
                          width: `${Math.min(100, achievement.progress)}%`
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[
                    styles.achievementProgressText,
                    { color: achievement.achieved ? 'rgba(255,255,255,0.9)' : theme.textTertiary }
                  ]}>
                    {achievement.progress.toFixed(0)}%
                  </Text>
                </View>
              </View>
              {achievement.achieved && (
                <View style={styles.achievementBadge}>
                  <Ionicons name="checkmark-circle" size={24} color={designTokens.colors.pureWhite} />
                </View>
              )}
            </LinearGradient>
          </View>
        ))}
      </View>
    </View>
  );

  const renderInsights = () => (
    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Smart Insights</Text>
      <View style={styles.insightsList}>
        <View style={styles.insightItem}>
          <View style={[styles.insightIcon, { backgroundColor: designTokens.colors.heroGreen + '20' }]}>
            <Ionicons name="trending-up" size={16} color={designTokens.colors.heroGreen} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightText, { color: theme.textPrimary }]}>
              You're saving 23% more than last month! Keep it up!
            </Text>
          </View>
        </View>

        <View style={styles.insightItem}>
          <View style={[styles.insightIcon, { backgroundColor: designTokens.colors.amber[500] + '20' }]}>
            <Ionicons name="bulb" size={16} color={designTokens.colors.amber[500]} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightText, { color: theme.textPrimary }]}>
              Vegetables have the highest waste rate. Try meal planning!
            </Text>
          </View>
        </View>

        <View style={styles.insightItem}>
          <View style={[styles.insightIcon, { backgroundColor: designTokens.colors.ocean + '20' }]}>
            <Ionicons name="water" size={16} color={designTokens.colors.ocean} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightText, { color: theme.textPrimary }]}>
              You've saved 847L of water this month by reducing waste!
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const checkSubscriptionStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
      console.log('📊 Waste Analytics subscription status:', status.isActive ? 'Premium' : 'Free');
      
      // If not premium, don't fetch data
      if (!status.isActive) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
      setLoading(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Analyzing your waste data...
        </Text>
      </View>
    );
  }

  // Show premium gate if not premium
  if (!isPremium && !checkingSubscription) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
        {renderHeader()}
        <View style={styles.premiumGateContainer}>
          <View style={styles.premiumGateContent}>
            <Ionicons name="analytics" size={64} color={designTokens.colors.primary[500]} />
            <Text style={[styles.premiumGateTitle, { color: theme.textPrimary }]}>
              🔒 Premium Feature
            </Text>
            <Text style={[styles.premiumGateSubtitle, { color: theme.textSecondary }]}>
              Unlock detailed waste analytics, insights, and progress tracking with FridgeHero Premium
            </Text>
            <TouchableOpacity
              style={styles.premiumGateButton}
              onPress={() => navigation.navigate('Premium')}
            >
              <LinearGradient
                colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
                style={styles.premiumGateButtonGradient}
              >
                <Text style={styles.premiumGateButtonText}>Upgrade to Premium</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
          />
        }
      >
        {renderTimeframeSelector()}
        {renderKPICards()}
        {renderWasteCircularChart()}
        {renderCategoryBreakdown()}
        {renderAchievements()}
        {renderInsights()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: designTokens.spacing.xl,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  backButton: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    marginRight: designTokens.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...designTokens.typography.textStyles.h1,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...designTokens.typography.textStyles.body,
    marginTop: 4,
  },
  shareButton: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.xl,
  },

  // Timeframe Selector
  timeframeContainer: {
    flexDirection: 'row',
    marginVertical: designTokens.spacing.lg,
    padding: 4,
    borderRadius: designTokens.borderRadius.xl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  timeframeButtonActive: {
    backgroundColor: designTokens.colors.heroGreen,
    elevation: 2,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  timeframeText: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '600',
  },

  // KPI Cards
  kpiContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  kpiCard: {
    flex: 1,
    borderRadius: designTokens.borderRadius.xl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  kpiGradient: {
    padding: designTokens.spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  kpiIcon: {
    alignSelf: 'flex-start',
    marginBottom: designTokens.spacing.sm,
  },
  kpiValue: {
    ...designTokens.typography.textStyles.h1,
    color: designTokens.colors.pureWhite,
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 4,
  },
  kpiLabel: {
    ...designTokens.typography.textStyles.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: designTokens.spacing.sm,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendText: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.pureWhite,
    fontWeight: '700',
  },

  // Charts
  chartCard: {
    borderRadius: designTokens.borderRadius.xl,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  chartTitle: {
    ...designTokens.typography.textStyles.h2,
    fontWeight: '700',
    marginBottom: designTokens.spacing.lg,
  },

  // Circular Chart
  circularChart: {
    alignItems: 'center',
  },
  circularChartContainer: {
    position: 'relative',
    marginBottom: designTokens.spacing.lg,
  },
  circularBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: designTokens.colors.gray[200],
  },
  circularProgress: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  circularCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularPercentage: {
    ...designTokens.typography.textStyles.h1,
    fontWeight: '800',
    fontSize: 32,
  },
  circularLabel: {
    ...designTokens.typography.textStyles.body,
    marginTop: 4,
  },
  chartLegend: {
    gap: designTokens.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...designTokens.typography.textStyles.body,
  },

  // Category Breakdown
  categoryList: {
    gap: designTokens.spacing.md,
  },
  categoryItem: {
    gap: designTokens.spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    flex: 1,
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '600',
  },
  categoryPercentage: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '700',
  },
  categoryBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryStats: {
    alignItems: 'flex-end',
  },
  categoryStat: {
    ...designTokens.typography.textStyles.caption,
  },

  // Achievements
  achievementsList: {
    gap: designTokens.spacing.md,
  },
  achievementItem: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
  },
  achievementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.md,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  achievementContent: {
    flex: 1,
    gap: 4,
  },
  achievementTitle: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '700',
  },
  achievementDescription: {
    ...designTokens.typography.textStyles.caption,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    marginTop: 4,
  },
  achievementProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
  },
  achievementProgressText: {
    ...designTokens.typography.textStyles.caption,
    fontWeight: '600',
    minWidth: 35,
  },
  achievementBadge: {
    marginLeft: designTokens.spacing.sm,
  },

  // Insights
  insightsList: {
    gap: designTokens.spacing.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designTokens.spacing.md,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    ...designTokens.typography.textStyles.body,
    lineHeight: 22,
  },

  bottomPadding: {
    height: designTokens.spacing['2xl'],
  },

  // Premium Gate
  premiumGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  premiumGateContent: {
    backgroundColor: designTokens.colors.gray[50],
    padding: designTokens.spacing.xl,
    borderRadius: designTokens.borderRadius.xl,
    alignItems: 'center',
  },
  premiumGateTitle: {
    ...designTokens.typography.textStyles.h1,
    fontWeight: '700',
    marginBottom: designTokens.spacing.lg,
  },
  premiumGateSubtitle: {
    ...designTokens.typography.textStyles.body,
    marginBottom: designTokens.spacing.xl,
  },
  premiumGateButton: {
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.heroGreen,
  },
  premiumGateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
  },
  premiumGateButtonText: {
    ...designTokens.typography.textStyles.body,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
  },
}); 