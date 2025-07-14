import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { designTokens } from '../constants/DesignTokens';
import { stripeService } from '../lib/stripe';
import { 
  recipeMatchingService, 
  type MatchedRecipe, 
  type FridgeItem,
  type RecipeMatchingOptions 
} from '../lib/recipe-matching';
import { aiRecipeService, type AIRecipe } from '../lib/ai-recipe-service';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { 
  PREMIUM_FEATURES, 
  FREE_LIMITATIONS, 
  PRICING, 
  PREMIUM_MESSAGING
} from '../constants/PremiumFeatures';
import ProfileAvatar from '../components/ProfileAvatar';

const { width, height } = Dimensions.get('window');

export default function RecipesScreen({ navigation }: any) {
  const [recipes, setRecipes] = useState<MatchedRecipe[]>([]);
  const [aiRecipes, setAiRecipes] = useState<AIRecipe[]>([]);
  const [expiringItems, setExpiringItems] = useState<FridgeItem[]>([]);
  const [featuredRecipe, setFeaturedRecipe] = useState<MatchedRecipe | null>(null);
  const [featuredAIRecipe, setFeaturedAIRecipe] = useState<AIRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [showAIRecipes, setShowAIRecipes] = useState(false);
  const [filterOptions, setFilterOptions] = useState<RecipeMatchingOptions>({
    prioritizeExpiring: true,
    maxResults: 20,
    minMatchScore: 0.2
  });
  
  // Enhanced animation values
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [slideAnimation] = useState(new Animated.Value(0));
  const [fadeAnimation] = useState(new Animated.Value(0));
  const [scaleAnimation] = useState(new Animated.Value(0.95));
  const [sparkleAnimation] = useState(new Animated.Value(0));
  const [glowAnimation] = useState(new Animated.Value(0));
  const [shimmerAnimation] = useState(new Animated.Value(0));
  
  const { user } = useAuth();
  const { theme } = useTheme();
  const { selectedHousehold } = useHousehold();

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedHousehold && isPremium) {
      fetchData();
      startPremiumAnimations();
    }
  }, [user, selectedHousehold, isPremium]);

  useEffect(() => {
    if (!isPremium && !checkingSubscription) {
      startAnimations();
    }
  }, [isPremium, checkingSubscription]);

  // Add focus effect to refresh subscription status when returning to screen
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('🍽️ Recipes screen focused - refreshing subscription status');
        checkSubscriptionStatus();
      }
    }, [user])
  );

  const checkSubscriptionStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setIsPremium(status.isActive);
      console.log('📱 Subscription status:', status.isActive ? 'Premium' : 'Free');
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
    } finally {
      setCheckingSubscription(false);
      setLoading(false);
    }
  };

  const startAnimations = () => {
    // Pulse animation for upgrade button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide animation for preview cards
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Fade animation for content
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  };

  const startPremiumAnimations = () => {
    // Enhanced entrance animations for premium content
    Animated.stagger(100, [
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous sparkle animation for premium elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnimation, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle glow animation for featured recipe
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const fetchData = async () => {
    if (!user || !selectedHousehold) return;

    try {
      setLoading(true);
      
      // Get fridge items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('household_id', selectedHousehold.household_id)
        .eq('status', 'active')
        .order('expiry_date', { ascending: true });

      if (itemsError) throw itemsError;

      const fridgeItems = items || [];
      
      // Filter expiring items (next 3 days)
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      const expiring = fridgeItems.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        return expiryDate <= threeDaysFromNow && expiryDate >= now;
      });

      setExpiringItems(expiring);

      // Get traditional recipe matches
      if (fridgeItems.length > 0) {
        const matchedRecipes = await recipeMatchingService.getSmartRecipeRecommendations(
          selectedHousehold.household_id,
          filterOptions
        );
        
        setRecipes(matchedRecipes);
        
        if (matchedRecipes.length > 0) {
          setFeaturedRecipe(matchedRecipes[0]);
        }
      }

      // Generate AI recipes for premium users
      if (isPremium && fridgeItems.length > 0) {
        await generateAIRecipes();
      }

    } catch (error) {
      console.error('Error fetching recipes:', error);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAIRecipes = async () => {
    if (!selectedHousehold || !isPremium) return;

    try {
      setAiLoading(true);
      console.log('🤖 Generating AI recipes...');

      const options = {
        focus_expiring_items: true,
        creative_mode: true,
        difficulty_preference: 'any' as const,
        max_ingredients: 10
      };

      const generatedRecipes = await aiRecipeService.generateSmartRecipes(
        selectedHousehold.household_id,
        options
      );

      console.log('🤖 Generated', generatedRecipes.length, 'AI recipes');
      setAiRecipes(generatedRecipes);
      
      if (generatedRecipes.length > 0) {
        setFeaturedAIRecipe(generatedRecipes[0]);
      }

    } catch (error) {
      console.error('Error generating AI recipes:', error);
      // Don't show error alert for AI features - they're experimental
      console.log('AI recipe generation failed, using traditional recipes only');
    } finally {
      setAiLoading(false);
    }
  };

  const generateExpiryRescueRecipe = async () => {
    if (!selectedHousehold || !isPremium || expiringItems.length === 0) return;

    try {
      setAiLoading(true);
      Alert.alert(
        '🤖 AI Recipe Generator',
        'Generating a custom recipe to use your expiring items...',
        [{ text: 'OK' }]
      );

      const expiringItemIds = expiringItems.slice(0, 3).map(item => item.id);
      const rescueRecipe = await aiRecipeService.generateExpiryRescueRecipe(
        selectedHousehold.household_id,
        expiringItemIds
      );

      setFeaturedAIRecipe(rescueRecipe);
      setShowAIRecipes(true);

      Alert.alert(
        '✨ Recipe Generated!',
        `Created "${rescueRecipe.name}" to help you use your expiring ingredients!`,
        [{ text: 'View Recipe' }]
      );

    } catch (error) {
      console.error('Error generating rescue recipe:', error);
      Alert.alert(
        'AI Generation Unavailable',
        'Unable to generate custom recipe right now. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('Premium');
  };

  const onRefresh = () => {
    if (isPremium) {
      setRefreshing(true);
      fetchData();
    } else {
      checkSubscriptionStatus();
    }
  };

  const markItemsAsUsed = async (recipe: MatchedRecipe) => {
    try {
      if (!selectedHousehold) return;
      
      const ingredientIds = recipe.matchingItems.map(item => item.id);
      
      await recipeMatchingService.markIngredientsAsUsed(
        recipe.id,
        selectedHousehold.household_id,
        ingredientIds
      );
      
      Alert.alert(
        'Success! 🎉', 
        `Great job cooking "${recipe.name}"! You've used ${recipe.matchingItems.length} ingredients and helped reduce food waste.`,
        [
          {
            text: 'See what I saved',
            onPress: () => {
              // Could navigate to waste tracking screen
              Alert.alert('Waste Saved!', `You prevented ${recipe.matchingItems.length} items from going to waste. Keep it up!`);
            }
          },
          { text: 'OK' }
        ]
      );
      
      // Refresh data to reflect changes
      fetchData();
    } catch (error) {
      console.error('Error marking items as used:', error);
      Alert.alert('Error', 'Failed to mark items as used. Please try again.');
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return designTokens.colors.green[600];
    if (score >= 0.6) return designTokens.colors.amber[600];
    if (score >= 0.4) return designTokens.colors.alertAmber;
    return designTokens.colors.gray[500];
  };

  // Mock preview data for free users
  const mockPreviewData = {
    expiringItems: [
      { name: 'Tomatoes', days: 1 },
      { name: 'Spinach', days: 2 },
      { name: 'Chicken Breast', days: 1 },
    ],
    recipes: [
      { name: 'Emergency Tomato Pasta', match: 94, saves: 3 },
      { name: 'Chicken Spinach Stir-fry', match: 89, saves: 2 },
      { name: 'Quick Caprese Salad', match: 82, saves: 2 },
    ],
    stats: {
      potentialSavings: 24.50,
      itemsRescued: 156,
      co2Reduced: 12.3
    }
  };

  const renderPremiumPreview = () => (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bgPrimary} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.bgPrimary, theme.bgSecondary + '80']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              AI Recipe Chef
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Smart recipes from your fridge
            </Text>
          </View>
          
          <View style={styles.premiumBadge}>
            <LinearGradient
              colors={[designTokens.colors.amber[500], designTokens.colors.sunset]}
              style={styles.premiumBadgeGradient}
            >
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Demo Section */}
        <Animated.View style={[
          styles.demoSection,
          {
            opacity: fadeAnimation,
            transform: [{
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              })
            }]
          }
        ]}>
          <View style={styles.demoHeader}>
            <Text style={[styles.demoTitle, { color: theme.textPrimary }]}>
              🤖 AI-Powered Recipe Generation
            </Text>
            <Text style={[styles.demoSubtitle, { color: theme.textSecondary }]}>
              Create personalized recipes in seconds using your exact fridge items
            </Text>
          </View>
        </Animated.View>

        {/* Blurred Recipe Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              🍽️ Your AI Recipe Suggestions
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Instant recipes tailored to your available ingredients
            </Text>
          </View>
          
          <View style={styles.recipesPreviewContainer}>
            {/* Mock Recipe Cards */}
            <View style={[styles.mockRecipeCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.mockRecipeHeader}>
                <View style={[styles.mockTitle, { backgroundColor: theme.textTertiary + '40' }]} />
                <View style={styles.mockAIBadge} />
              </View>
              <View style={[styles.mockDescription, { backgroundColor: theme.textTertiary + '20' }]} />
              <View style={[styles.mockIngredients, { backgroundColor: theme.textTertiary + '20' }]} />
              <View style={styles.mockStats}>
                <View style={[styles.mockStat, { backgroundColor: theme.textTertiary + '30' }]} />
                <View style={[styles.mockStat, { backgroundColor: theme.textTertiary + '30' }]} />
                <View style={[styles.mockStat, { backgroundColor: theme.textTertiary + '30' }]} />
              </View>
            </View>
            
            <View style={[styles.mockRecipeCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.mockRecipeHeader}>
                <View style={[styles.mockTitle, { backgroundColor: theme.textTertiary + '40' }]} />
                <View style={styles.mockRescueBadge} />
              </View>
              <View style={[styles.mockDescription, { backgroundColor: theme.textTertiary + '20' }]} />
              <View style={[styles.mockIngredients, { backgroundColor: theme.textTertiary + '20' }]} />
            </View>

            {/* Locked content overlay */}
            <Animated.View style={[
              styles.lockedOverlay,
              {
                opacity: shimmerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 0.7]
                })
              }
            ]}>
              <View style={styles.lockIconContainer}>
                <Ionicons name="restaurant" size={48} color={designTokens.colors.amber[500]} />
                <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>
                  AI Recipe Generator Locked
                </Text>
                <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>
                  Unlock personalized recipes from your exact ingredients
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* AI Features Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              ✨ AI Recipe Features
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Smart cooking powered by artificial intelligence
            </Text>
          </View>
          
          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="flash" size={24} color={designTokens.colors.heroGreen} />
              </View>
              <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Instant Generation</Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                Create custom recipes in 3 seconds using your exact ingredients
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="leaf" size={24} color={designTokens.colors.primary[500]} />
              </View>
              <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Zero-Waste Focus</Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                Prioritizes expiring items to prevent food waste
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="person" size={24} color={designTokens.colors.amber[500]} />
              </View>
              <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Personal Chef AI</Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                Learns your taste preferences and dietary restrictions
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="infinite" size={24} color={designTokens.colors.amber[500]} />
              </View>
              <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Unlimited Creativity</Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                Never run out of ideas with infinite recipe variations
              </Text>
            </View>
          </View>
        </View>

        {/* Social Proof */}
        <View style={styles.socialProofContainer}>
          <LinearGradient
            colors={[designTokens.colors.heroGreen + '10', designTokens.colors.heroGreen + '05']}
            style={styles.socialProofGradient}
          >
            <View style={styles.socialProofHeader}>
              <Text style={[styles.socialProofTitle, { color: theme.textPrimary }]}>
                🌟 Join 15,000+ Happy Home Cooks
              </Text>
              <Text style={[styles.socialProofSubtitle, { color: theme.textSecondary }]}>
                Who've already reduced food waste by 85% with AI recipes
              </Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: designTokens.colors.heroGreen }]}>94%</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Success Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: designTokens.colors.heroGreen }]}>$127</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Monthly Savings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: designTokens.colors.heroGreen }]}>7 days</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Free Trial</Text>
              </View>
            </View>

            <View style={styles.testimonialsContainer}>
              <Text style={[styles.testimonial, { color: theme.textSecondary }]}>
                "The AI recipes are better than what I could think of myself!" - Sarah M.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Features Comparison */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            ✨ Premium vs Free Recipes
          </Text>
          
          <View style={styles.comparisonContainer}>
            <View style={[styles.comparisonColumn, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.comparisonTitle, { color: theme.textTertiary }]}>Free Version</Text>
              <View style={styles.comparisonFeatures}>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Manual recipe search</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Generic suggestions</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Limited customization</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ No waste prevention</Text>
              </View>
            </View>
            
            <View style={[styles.comparisonColumn, styles.premiumColumn]}>
              <LinearGradient
                colors={[designTokens.colors.heroGreen + '20', designTokens.colors.heroGreen + '10']}
                style={styles.premiumColumnGradient}
              >
                <Text style={[styles.comparisonTitle, { color: designTokens.colors.heroGreen }]}>Premium 🌟</Text>
                <View style={styles.comparisonFeatures}>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ AI-generated recipes</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Personal preferences</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Expiry-based recipes</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Unlimited variations</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Dietary customization</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Waste optimization</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <Animated.View style={[styles.ctaCard, { transform: [{ scale: pulseAnimation }] }]}>
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaTitle}>🚀 Start Creating Amazing Recipes</Text>
              <Text style={styles.ctaSubtitle}>
                7-day free trial • Cancel anytime • No commitment required
              </Text>
              <View style={styles.ctaFeatures}>
                <Text style={styles.ctaFeature}>🤖 Unlimited AI recipe generation</Text>
                <Text style={styles.ctaFeature}>🍽️ Personalized to your taste</Text>
                <Text style={styles.ctaFeature}>♻️ Zero-waste recipe suggestions</Text>
                <Text style={styles.ctaFeature}>📱 Instant mobile access</Text>
              </View>
              
              <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade}>
                <Text style={styles.ctaButtonText}>Start Free Trial →</Text>
              </TouchableOpacity>
              
              <Text style={styles.ctaDisclaimer}>
                Join 15,000+ users reducing waste & discovering new flavors
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Show loading state while checking subscription
  if (checkingSubscription || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bgPrimary }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {checkingSubscription ? 'Checking subscription...' : 'Analyzing your fridge... 🧠'}
        </Text>
      </View>
    );
  }

  // Show premium preview for free users
  if (!isPremium) {
    return renderPremiumPreview();
  }

  // Enhanced Featured Recipe with premium styling
  const renderFeaturedRecipe = () => {
    if (!featuredRecipe) return null;

    return (
      <Animated.View style={[
        styles.featuredSection,
        {
          transform: [{ scale: scaleAnimation }],
          opacity: fadeAnimation,
        }
      ]}>
        <View style={styles.featuredHeader}>
          <View style={styles.premiumBadge}>
            <Animated.View style={{
              opacity: sparkleAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1]
              })
            }}>
              <Ionicons name="diamond" size={16} color="white" />
            </Animated.View>
            <Text style={styles.premiumBadgeText}>PREMIUM PICK</Text>
          </View>
          <Text style={[styles.featuredLabel, { color: theme.textSecondary }]}>🌟 Perfect Match for Your Fridge</Text>
        </View>
        
        <TouchableOpacity style={styles.featuredCard} activeOpacity={0.95}>
          <Animated.View style={{
            shadowOpacity: glowAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6]
            })
          }}>
            <LinearGradient
              colors={[
                designTokens.colors.heroGreen, 
                designTokens.colors.green[600],
                designTokens.colors.green[700]
              ]}
              style={styles.featuredGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.featuredContent}>
                <View style={styles.featuredMainHeader}>
                  <Text style={styles.featuredTitle}>{featuredRecipe.name}</Text>
                  <View style={styles.featuredMatchBadge}>
                    <Animated.View style={{
                      transform: [{
                        rotate: sparkleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }]
                    }}>
                      <Ionicons name="star" size={16} color="white" />
                    </Animated.View>
                    <Text style={styles.featuredBadgeText}>
                      {Math.round(featuredRecipe.matchScore * 100)}% match
                    </Text>
                  </View>
                </View>
                
                {featuredRecipe.expiringItemsUsed.length > 0 && (
                  <View style={styles.rescueAlert}>
                    <View style={styles.rescueIcon}>
                      <Ionicons name="leaf" size={20} color={designTokens.colors.green[400]} />
                    </View>
                    <Text style={styles.rescueText}>
                      🚨 Rescues: {featuredRecipe.expiringItemsUsed.map(item => item.name).join(', ')}
                    </Text>
                  </View>
                )}
                
                <View style={styles.ingredientsPreview}>
                  <Text style={styles.ingredientsTitle}>✅ Available ingredients:</Text>
                  <Text style={styles.ingredientsText}>
                    {featuredRecipe.matchingItems.map(item => item.name).slice(0, 3).join(', ')}
                    {featuredRecipe.matchingItems.length > 3 && ` +${featuredRecipe.matchingItems.length - 3} more`}
                  </Text>
                </View>
                
                <View style={styles.featuredStatsEnhanced}>
                  <View style={styles.featuredStatCard}>
                    <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featuredStatNumber}>{featuredRecipe.prep_time + featuredRecipe.cook_time}</Text>
                    <Text style={styles.featuredStatLabel}>mins</Text>
                  </View>
                  <View style={styles.featuredStatCard}>
                    <Ionicons name="people-outline" size={18} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featuredStatNumber}>{featuredRecipe.servings}</Text>
                    <Text style={styles.featuredStatLabel}>servings</Text>
                  </View>
                  <View style={styles.featuredStatCard}>
                    <Ionicons name="bar-chart-outline" size={18} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.featuredStatNumber}>{featuredRecipe.difficulty}</Text>
                    <Text style={styles.featuredStatLabel}>level</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.featuredActionEnhanced}
                  onPress={() => markItemsAsUsed(featuredRecipe)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.95)']}
                    style={styles.featuredActionGradient}
                  >
                    <Ionicons name="restaurant" size={20} color={designTokens.colors.heroGreen} />
                    <Text style={styles.featuredActionTextEnhanced}>Start Cooking & Save Food</Text>
                    <Ionicons name="arrow-forward" size={18} color={designTokens.colors.heroGreen} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Enhanced Recipe Card with premium styling
  const renderRecipeCard = ({ item }: { item: MatchedRecipe }) => {
    const hasMatches = item.matchingItems.length > 0;
    const hasExpiringItems = item.expiringItemsUsed.length > 0;
    
    // Convert MatchedRecipe to EnhancedRecipe format for detail screen
    const convertToEnhancedRecipe = (matchedRecipe: MatchedRecipe) => {
      return {
        id: matchedRecipe.id,
        name: matchedRecipe.name,
        description: matchedRecipe.description || '',
        ingredients: matchedRecipe.ingredients.map((ingredient, index) => ({
          name: ingredient,
          quantity: '1',
          unit: 'unit',
          category: 'pantry' as const,
          optional: false,
          importance: 'important' as const,
        })),
        instructions: matchedRecipe.instructions,
        prep_time: matchedRecipe.prep_time,
        cook_time: matchedRecipe.cook_time,
        servings: matchedRecipe.servings,
        difficulty: matchedRecipe.difficulty,
        cuisine_type: matchedRecipe.cuisine_type || 'International',
        diet_tags: matchedRecipe.diet_tags,
        meal_type: 'dinner' as const, // Default to dinner
        rating: matchedRecipe.rating,
        image_url: matchedRecipe.image_url,
        nutrition_info: undefined,
        tags: [],
        seasonality: [],
        skill_requirements: [],
        equipment_needed: [],
        cost_level: 'moderate' as const,
      };
    };

    const handleRecipePress = () => {
      const enhancedRecipe = convertToEnhancedRecipe(item);
      const matchData = {
        recipe: enhancedRecipe,
        matchScore: item.matchScore,
        availabilityScore: item.availabilityScore,
        urgencyScore: item.urgencyScore,
        creativityScore: 0,
        personalizedScore: 0,
        missingIngredients: item.missingIngredients.map(ingredient => ({
          name: ingredient,
          quantity: '1',
          unit: 'unit',
          category: 'pantry' as const,
          optional: false,
          importance: 'important' as const,
        })),
        availableIngredients: item.matchingItems.map(fridgeItem => ({
          name: fridgeItem.name,
          quantity: fridgeItem.quantity.toString(),
          unit: fridgeItem.unit || 'unit',
          category: 'pantry' as const,
          optional: false,
          importance: 'important' as const,
        })),
        substitutionSuggestions: [],
        wasteReductionImpact: item.expiringItemsUsed.length,
        estimatedCost: 0,
        reasonsToMake: hasExpiringItems 
          ? [`Rescue ${item.expiringItemsUsed.length} expiring items`]
          : hasMatches 
          ? [`Use ${item.matchingItems.length} ingredients you already have`]
          : [],
      };
      
      navigation.navigate('RecipeDetail', {
        recipe: enhancedRecipe,
        matchData: matchData,
      });
    };
    
    return (
      <Animated.View style={[
        styles.recipeCard,
        {
          transform: [{ scale: scaleAnimation }],
          opacity: fadeAnimation,
        }
      ]}>
        <TouchableOpacity activeOpacity={0.95} onPress={handleRecipePress}>
          <LinearGradient
            colors={hasExpiringItems 
              ? [designTokens.colors.red[50], designTokens.colors.red[100], designTokens.colors.red[200]]
              : hasMatches 
              ? [designTokens.colors.amber[50], designTokens.colors.amber[100], designTokens.colors.amber[200]]
              : [theme.cardBackground, theme.bgSecondary, theme.bgTertiary]
            }
            style={styles.recipeGradientEnhanced}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.recipeHeaderEnhanced}>
              <View style={styles.recipeMainInfo}>
                <Text style={[styles.recipeNameEnhanced, { color: theme.textPrimary }]}>{item.name}</Text>
                {item.description && (
                  <Text style={[styles.recipeDescriptionEnhanced, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              <View style={styles.scoreBadgeEnhanced}>
                <LinearGradient
                  colors={[getMatchScoreColor(item.matchScore), getMatchScoreColor(item.matchScore) + '90']}
                  style={styles.scoreBadgeGradient}
                >
                  <Ionicons name="star" size={14} color="white" />
                  <Text style={styles.scoreBadgeTextEnhanced}>
                    {Math.round(item.matchScore * 100)}%
                  </Text>
                </LinearGradient>
              </View>
            </View>
            
            {hasExpiringItems && (
              <View style={styles.matchingSectionEnhanced}>
                <LinearGradient
                  colors={[designTokens.colors.red[100], designTokens.colors.red[200]]}
                  style={styles.matchingSectionGradient}
                >
                  <View style={styles.matchingSectionHeader}>
                    <Ionicons name="warning" size={16} color={designTokens.colors.red[600]} />
                    <Text style={[styles.matchingLabelEnhanced, { color: designTokens.colors.red[800] }]}>
                      Expiring items you can rescue:
                    </Text>
                  </View>
                  <Text style={[styles.matchingItemsEnhanced, { color: designTokens.colors.red[700] }]}>
                    {item.expiringItemsUsed.slice(0, 3).map(item => item.name).join(', ')}
                    {item.expiringItemsUsed.length > 3 && ` +${item.expiringItemsUsed.length - 3} more`}
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            {hasMatches && (
              <View style={styles.matchingSectionEnhanced}>
                <LinearGradient
                  colors={[designTokens.colors.green[50], designTokens.colors.green[100]]}
                  style={styles.matchingSectionGradient}
                >
                  <View style={styles.matchingSectionHeader}>
                    <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.green[600]} />
                    <Text style={styles.matchingLabelEnhanced}>Available ingredients:</Text>
                  </View>
                  <Text style={styles.matchingItemsEnhanced}>
                    {item.matchingItems.slice(0, 4).map(item => item.name).join(', ')}
                    {item.matchingItems.length > 4 && ` +${item.matchingItems.length - 4} more`}
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            {item.missingIngredients.length > 0 && (
              <View style={styles.matchingSectionEnhanced}>
                <LinearGradient
                  colors={[designTokens.colors.gray[50], designTokens.colors.gray[100]]}
                  style={styles.matchingSectionGradient}
                >
                  <View style={styles.matchingSectionHeader}>
                    <Ionicons name="bag-add" size={16} color={designTokens.colors.gray[600]} />
                    <Text style={[styles.matchingLabelEnhanced, { color: designTokens.colors.gray[700] }]}>
                      Need to buy:
                    </Text>
                  </View>
                  <Text style={[styles.matchingItemsEnhanced, { color: designTokens.colors.gray[600] }]}>
                    {item.missingIngredients.slice(0, 3).join(', ')}
                    {item.missingIngredients.length > 3 && ` +${item.missingIngredients.length - 3} more`}
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            <View style={styles.recipeFooter}>
              <View style={styles.recipeStatsEnhanced}>
                <View style={styles.recipeStatEnhanced}>
                  <Ionicons name="time-outline" size={16} color={theme.textTertiary} />
                  <Text style={[styles.recipeStatTextEnhanced, { color: theme.textSecondary }]}>
                    {item.prep_time + item.cook_time}m
                  </Text>
                </View>
                <View style={styles.recipeStatEnhanced}>
                  <Ionicons name="people-outline" size={16} color={theme.textTertiary} />
                  <Text style={[styles.recipeStatTextEnhanced, { color: theme.textSecondary }]}>{item.servings}</Text>
                </View>
                <View style={styles.recipeStatEnhanced}>
                  <Ionicons name="bar-chart-outline" size={16} color={theme.textTertiary} />
                  <Text style={[styles.recipeStatTextEnhanced, { color: theme.textSecondary }]}>{item.difficulty}</Text>
                </View>
                {item.rating && (
                  <View style={styles.recipeStatEnhanced}>
                    <Ionicons name="star" size={16} color={designTokens.colors.amber[500]} />
                    <Text style={[styles.recipeStatTextEnhanced, { color: theme.textSecondary }]}>{item.rating}</Text>
                  </View>
                )}
              </View>
              
              {hasMatches && (
                <TouchableOpacity
                  style={styles.cookButtonEnhanced}
                  onPress={() => markItemsAsUsed(item)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                    style={styles.cookButtonGradientEnhanced}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="restaurant" size={18} color="white" />
                    <Text style={styles.cookButtonTextEnhanced}>Cook & Save Food</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderExpiringItem = ({ item }: { item: FridgeItem }) => {
    const days = getDaysUntilExpiry(item.expiry_date);
    
    return (
      <View style={styles.expiringItem}>
        <LinearGradient
          colors={days <= 1 
            ? [designTokens.colors.red[100], designTokens.colors.red[200]]
            : [designTokens.colors.amber[100], designTokens.colors.amber[200]]
          }
          style={styles.expiringItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.expiringItemName, { color: theme.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.expiringItemTime, { color: theme.textSecondary }]}>
            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderRecipeHeader = () => {
    if (!isPremium) return null;

    return (
      <View style={styles.recipeHeader}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>🍽️ Your Recipes</Text>
        
        {/* Recipe Mode Toggle */}
        <View style={styles.recipeModeToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !showAIRecipes && styles.toggleButtonActive,
              { backgroundColor: !showAIRecipes ? theme.bgPrimary : theme.bgTertiary }
            ]}
            onPress={() => setShowAIRecipes(false)}
          >
            <Ionicons 
              name="library" 
              size={16} 
              color={!showAIRecipes ? designTokens.colors.heroGreen : theme.textSecondary} 
            />
            <Text style={[
              styles.toggleButtonText,
              { color: !showAIRecipes ? designTokens.colors.heroGreen : theme.textSecondary }
            ]}>
              Traditional
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              showAIRecipes && styles.toggleButtonActive,
              { backgroundColor: showAIRecipes ? theme.bgPrimary : theme.bgTertiary }
            ]}
            onPress={() => setShowAIRecipes(true)}
          >
            <Ionicons 
              name="sparkles" 
              size={16} 
              color={showAIRecipes ? designTokens.colors.heroGreen : theme.textSecondary} 
            />
            <Text style={[
              styles.toggleButtonText,
              { color: showAIRecipes ? designTokens.colors.heroGreen : theme.textSecondary }
            ]}>
              AI Generated
            </Text>
            {aiLoading && (
              <View style={styles.loadingDot}>
                <Animated.View style={[
                  styles.loadingDotInner,
                  { opacity: sparkleAnimation }
                ]} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* AI Generate Button */}
        {showAIRecipes && (
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: theme.bgTertiary }]}
            onPress={generateAIRecipes}
            disabled={aiLoading}
          >
            <Ionicons 
              name="refresh" 
              size={16} 
              color={designTokens.colors.heroGreen} 
            />
            <Text style={[styles.generateButtonText, { color: theme.textPrimary }]}>
              {aiLoading ? 'Generating...' : 'Generate New'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Expiry Rescue Button */}
        {expiringItems.length > 0 && (
          <TouchableOpacity
            style={[styles.rescueButton, { backgroundColor: designTokens.colors.red[100] }]}
            onPress={generateExpiryRescueRecipe}
            disabled={aiLoading}
          >
            <Ionicons 
              name="warning" 
              size={16} 
              color={designTokens.colors.red[600]} 
            />
            <Text style={[styles.rescueButtonText, { color: designTokens.colors.red[600] }]}>
              🚨 Rescue {expiringItems.length} Expiring Items
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAIRecipeCard = ({ item }: { item: AIRecipe }) => (
    <View style={[styles.recipeCard, { backgroundColor: theme.cardBackground, borderColor: theme.borderPrimary }]}>
      <LinearGradient
        colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
        style={styles.aiRecipeGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.aiRecipeBadge}>
          <Ionicons name="sparkles" size={12} color={designTokens.colors.pureWhite} />
          <Text style={styles.aiRecipeBadgeText}>AI GENERATED</Text>
        </View>

        <Text style={styles.aiRecipeTitle}>{item.name}</Text>
        <Text style={styles.aiRecipeDescription}>{item.description}</Text>

        <View style={styles.aiRecipeStats}>
          <View style={styles.aiStat}>
            <Ionicons name="leaf" size={14} color={designTokens.colors.pureWhite} />
            <Text style={styles.aiStatText}>{item.waste_reduction_score}% Waste Reduction</Text>
          </View>
          <View style={styles.aiStat}>
            <Ionicons name="bulb" size={14} color={designTokens.colors.pureWhite} />
            <Text style={styles.aiStatText}>{item.creativity_score}% Creative</Text>
          </View>
        </View>

        <View style={styles.aiRecipeDetails}>
          <View style={styles.aiRecipeDetail}>
            <Ionicons name="time" size={14} color={designTokens.colors.pureWhite} />
            <Text style={styles.aiRecipeDetailText}>{item.prep_time + item.cook_time} min</Text>
          </View>
          <View style={styles.aiRecipeDetail}>
            <Ionicons name="people" size={14} color={designTokens.colors.pureWhite} />
            <Text style={styles.aiRecipeDetailText}>{item.servings} servings</Text>
          </View>
          <View style={styles.aiRecipeDetail}>
            <Ionicons name="bar-chart" size={14} color={designTokens.colors.pureWhite} />
            <Text style={styles.aiRecipeDetailText}>{item.difficulty}</Text>
          </View>
        </View>

        <View style={styles.aiIngredientsList}>
          <Text style={styles.ingredientsTitle}>Available Ingredients:</Text>
          <View style={styles.aiIngredients}>
            {item.ingredients.slice(0, 3).map((ingredient, index) => (
              <View key={index} style={styles.aiIngredientTag}>
                <Text style={styles.aiIngredientText}>
                  {ingredient.available ? '✅' : '❌'} {ingredient.name}
                </Text>
              </View>
            ))}
            {item.ingredients.length > 3 && (
              <Text style={styles.aiIngredientsMore}>
                +{item.ingredients.length - 3} more
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.aiRecipeButton}>
          <Text style={styles.aiRecipeButtonText}>View Full Recipe</Text>
          <Ionicons name="arrow-forward" size={16} color={designTokens.colors.heroGreen} />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  // Premium user content
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      <LinearGradient
        colors={[
          theme.bgPrimary,
          theme.bgSecondary,
          theme.bgTertiary
        ]}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderPrimary }]}>
          <ProfileAvatar 
            size={44} 
            onPress={() => navigation.navigate('AccountDetails')}
            isPremium={isPremium}
          />
          
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              AI Recipe Chef
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Smart recipes from your fridge
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: designTokens.colors.gray[100] }]}
            onPress={() => {
              // TODO: Open filters modal
              Alert.alert('Coming Soon', 'Recipe filters coming soon!');
            }}
          >
            <Ionicons name="options" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={[]}
          renderItem={() => null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
          ListHeaderComponent={
            <View style={styles.content}>
              {/* Expiring Items Banner */}
              {expiringItems.length > 0 && (
                <View style={styles.expiringBanner}>
                  <LinearGradient
                    colors={[designTokens.colors.amber[50], designTokens.colors.amber[100]]}
                    style={styles.expiringBannerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.expiringBannerHeader}>
                      <Ionicons name="warning-outline" size={20} color={designTokens.colors.alertAmber} />
                      <Text style={[styles.expiringBannerTitle, { color: theme.textPrimary }]}>
                        {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <FlatList
                        horizontal
                        data={expiringItems.slice(0, 10)} // Limit to 10 items
                        renderItem={renderExpiringItem}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.expiringList}
                      />
                    </ScrollView>
                  </LinearGradient>
                </View>
              )}

              {/* Featured Recipe */}
              {renderFeaturedRecipe()}

              {/* Recipe Categories */}
              <View style={styles.categoriesSection}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recipe Recommendations</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  {recipes.filter(r => r.expiringItemsUsed.length > 0).length} rescue recipes • {recipes.length} total matches
                </Text>
              </View>

              {/* Recipe Grid */}
              <View style={styles.recipeGrid}>
                {recipes.map((recipe) => (
                  <View key={recipe.id} style={styles.recipeCardContainer}>
                    {renderRecipeCard({ item: recipe })}
                  </View>
                ))}
              </View>

              {/* Empty State */}
              {recipes.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No recipe matches found</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Add more items to your fridge to get personalized recipe suggestions, or check if you have recipes in your database.
                  </Text>
                  <TouchableOpacity 
                    style={styles.addItemsButton}
                    onPress={() => navigation.navigate('AddItem')}
                  >
                    <LinearGradient
                      colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                      style={styles.addItemsButtonGradient}
                    >
                      <Ionicons name="add" size={20} color="white" />
                      <Text style={styles.addItemsButtonText}>Add Items to Fridge</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />
      </LinearGradient>
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
    backgroundColor: designTokens.colors.gray[50],
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: designTokens.colors.gray[100],
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
  placeholder: {
    width: 40,
  },
  content: {
    padding: designTokens.spacing.lg,
  },
  
  // Premium Preview Styles
  demoSection: {
    marginBottom: designTokens.spacing.xl,
  },
  demoHeader: {
    alignItems: 'center',
  },
  demoTitle: {
    ...designTokens.typography.textStyles.h2,
    color: designTokens.colors.deepCharcoal,
    marginBottom: designTokens.spacing.sm,
  },
  demoSubtitle: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    maxWidth: 280,
  },
  section: {
    marginBottom: designTokens.spacing.xl,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  sectionTitle: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.deepCharcoal,
  },
  sectionSubtitle: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    marginTop: 4,
  },
  recipesPreviewContainer: {
    position: 'relative',
  },
  mockRecipeCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
  },
  mockRecipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  mockTitle: {
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    flex: 1,
    marginRight: designTokens.spacing.md,
  },
  mockAIBadge: {
    height: 16,
    width: 60,
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderRadius: 8,
  },
  mockRescueBadge: {
    height: 16,
    width: 60,
    backgroundColor: 'rgba(255,107,107,0.3)',
    borderRadius: 8,
  },
  mockDescription: {
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: designTokens.spacing.sm,
  },
  mockIngredients: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: designTokens.spacing.sm,
    width: '80%',
  },
  mockStats: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  mockStat: {
    width: '33%',
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    alignItems: 'center',
  },
  lockTitle: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: 'white',
    marginBottom: designTokens.spacing.xs,
    fontWeight: '600',
  },
  lockSubtitle: {
    ...designTokens.typography.textStyles.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    maxWidth: 200,
  },
  
  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.md,
  },
  featureCard: {
    flex: 1,
    minWidth: (width - 80) / 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  featureTitle: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.deepCharcoal,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  featureDescription: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Social Proof
  socialProofContainer: {
    marginBottom: designTokens.spacing.xl,
  },
  socialProofGradient: {
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.lg,
  },
  socialProofHeader: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  socialProofTitle: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.deepCharcoal,
    marginBottom: designTokens.spacing.xs,
    textAlign: 'center',
  },
  socialProofSubtitle: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    maxWidth: 280,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: designTokens.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.heroGreen,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    ...designTokens.typography.textStyles.small,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
  },
  testimonialsContainer: {
    alignItems: 'center',
    marginTop: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.gray[200],
  },
  testimonial: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 280,
  },
  
  // Comparison
  comparisonContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  comparisonColumn: {
    flex: 1,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
  },
  comparisonTitle: {
    ...designTokens.typography.textStyles.bodyMedium,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: designTokens.spacing.md,
  },
  comparisonFeatures: {
    gap: designTokens.spacing.sm,
  },
  comparisonFeature: {
    ...designTokens.typography.textStyles.caption,
    lineHeight: 18,
  },
  premiumColumn: {
    borderWidth: 2,
    borderColor: designTokens.colors.heroGreen,
  },
  premiumColumnGradient: {
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.lg,
    margin: -designTokens.spacing.lg,
  },
  
  // CTA
  ctaContainer: {
    marginBottom: designTokens.spacing.xl,
  },
  ctaCard: {
    borderRadius: designTokens.borderRadius.xl,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaGradient: {
    padding: designTokens.spacing.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    ...designTokens.typography.textStyles.h2,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  ctaSubtitle: {
    ...designTokens.typography.textStyles.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  ctaFeatures: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
    gap: designTokens.spacing.xs,
  },
  ctaFeature: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
    marginBottom: designTokens.spacing.md,
  },
  ctaButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaDisclaimer: {
    ...designTokens.typography.textStyles.small,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  
  // Premium Badge
  premiumBadge: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  premiumBadgeGradient: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  premiumBadgeText: {
    ...designTokens.typography.textStyles.small,
    color: '#FFD700',
    fontWeight: '600',
  },
  
  // Expiring Items Banner
  expiringBanner: {
    marginBottom: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  expiringBannerGradient: {
    padding: designTokens.spacing.md,
  },
  expiringBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  expiringBannerTitle: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.amber[800],
    marginLeft: designTokens.spacing.sm,
  },
  expiringList: {
    paddingHorizontal: 0,
  },
  expiringItem: {
    marginRight: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
  },
  expiringItemGradient: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    minWidth: 100,
    alignItems: 'center',
  },
  expiringItemName: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.deepCharcoal,
    fontWeight: '600',
  },
  expiringItemTime: {
    ...designTokens.typography.textStyles.small,
    color: designTokens.colors.gray[600],
  },
  
  // Featured Recipe
  featuredSection: {
    marginBottom: designTokens.spacing.lg,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  featuredLabel: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    marginBottom: designTokens.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredCard: {
    borderRadius: designTokens.borderRadius.xl,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  featuredGradient: {
    padding: designTokens.spacing.lg,
  },
  featuredContent: {},
  featuredMainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  featuredTitle: {
    ...designTokens.typography.textStyles.h2,
    color: 'white',
    flex: 1,
    marginRight: designTokens.spacing.md,
  },
  featuredMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.full,
    gap: 4,
  },
  featuredBadgeText: {
    ...designTokens.typography.textStyles.small,
    color: 'white',
    fontWeight: '600',
  },
  rescueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
  },
  rescueIcon: {
    marginRight: designTokens.spacing.sm,
  },
  rescueText: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
    flex: 1,
  },
  ingredientsPreview: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  ingredientsTitle: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
    fontWeight: '600',
    marginBottom: designTokens.spacing.xs,
  },
  ingredientsText: {
    ...designTokens.typography.textStyles.body,
    color: 'rgba(255,255,255,0.9)',
  },
  featuredStatsEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  featuredStatCard: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  featuredStatNumber: {
    ...designTokens.typography.textStyles.h3,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  featuredStatLabel: {
    ...designTokens.typography.textStyles.small,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  featuredActionEnhanced: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  featuredActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  featuredActionTextEnhanced: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.heroGreen,
    fontWeight: '600',
  },
  
  // Categories Section
  categoriesSection: {
    marginBottom: designTokens.spacing.lg,
  },
  
  // Recipe Grid
  recipeGrid: {
    gap: designTokens.spacing.md,
  },
  recipeCardContainer: {
    marginBottom: designTokens.spacing.md,
  },
  recipeCard: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  recipeGradientEnhanced: {
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.lg,
  },
  recipeHeaderEnhanced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.md,
  },
  recipeMainInfo: {
    flex: 1,
    marginRight: designTokens.spacing.md,
  },
  recipeNameEnhanced: {
    ...designTokens.typography.textStyles.h3,
    color: designTokens.colors.deepCharcoal,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: designTokens.spacing.xs,
  },
  recipeDescriptionEnhanced: {
    ...designTokens.typography.textStyles.body,
    color: designTokens.colors.gray[600],
    fontSize: 14,
    lineHeight: 20,
  },
  scoreBadgeEnhanced: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    gap: 4,
  },
  scoreBadgeTextEnhanced: {
    ...designTokens.typography.textStyles.small,
    color: 'white',
    fontWeight: '700',
  },
  matchingSectionEnhanced: {
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  matchingSectionGradient: {
    padding: designTokens.spacing.md,
  },
  matchingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
    gap: designTokens.spacing.sm,
  },
  matchingLabelEnhanced: {
    ...designTokens.typography.textStyles.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchingItemsEnhanced: {
    ...designTokens.typography.textStyles.body,
    fontSize: 14,
    lineHeight: 20,
  },
  recipeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: designTokens.spacing.md,
  },
  recipeStatsEnhanced: {
    flexDirection: 'row',
    flex: 1,
    gap: designTokens.spacing.lg,
  },
  recipeStatEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipeStatTextEnhanced: {
    ...designTokens.typography.textStyles.caption,
    color: designTokens.colors.gray[600],
    fontWeight: '500',
  },
  cookButtonEnhanced: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginLeft: designTokens.spacing.md,
  },
  cookButtonGradientEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  cookButtonTextEnhanced: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  
  // Empty State
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
  addItemsButton: {
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  addItemsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  addItemsButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.heroGreen,
    fontWeight: '600',
  },
  
  // Legacy styles still referenced elsewhere
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  recipeModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  toggleButton: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  toggleButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.deepCharcoal,
    fontWeight: '600',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: designTokens.spacing.sm,
  },
  loadingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    margin: 2,
  },
  generateButton: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  generateButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.deepCharcoal,
    fontWeight: '600',
  },
  rescueButton: {
    padding: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  rescueButtonText: {
    ...designTokens.typography.textStyles.bodyMedium,
    color: designTokens.colors.deepCharcoal,
    fontWeight: '600',
  },
  aiRecipeGradient: {
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.borderRadius.lg,
  },
  aiRecipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    gap: designTokens.spacing.sm,
  },
  aiRecipeBadgeText: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
    fontWeight: '600',
  },
  aiRecipeTitle: {
    ...designTokens.typography.textStyles.h3,
    color: 'white',
    marginBottom: designTokens.spacing.sm,
  },
  aiRecipeDescription: {
    ...designTokens.typography.textStyles.body,
    color: 'rgba(255,255,255,0.9)',
  },
  aiRecipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: designTokens.spacing.md,
  },
  aiStat: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  aiStatText: {
    ...designTokens.typography.textStyles.caption,
    color: 'rgba(255,255,255,0.9)',
  },
  aiRecipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: designTokens.spacing.md,
  },
  aiRecipeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiRecipeDetailText: {
    ...designTokens.typography.textStyles.caption,
    color: 'rgba(255,255,255,0.9)',
  },
  aiIngredientsList: {
    marginBottom: designTokens.spacing.md,
  },
  aiIngredients: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  aiIngredientTag: {
    padding: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  aiIngredientText: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
  },
  aiIngredientsMore: {
    ...designTokens.typography.textStyles.caption,
    color: 'rgba(255,255,255,0.9)',
  },
  aiRecipeButton: {
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginTop: designTokens.spacing.md,
  },
  aiRecipeButtonText: {
    ...designTokens.typography.textStyles.caption,
    color: 'white',
    fontWeight: '600',
  },
}); 