import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { useTheme } from '../contexts/ThemeContext';
import { stripeService } from '../lib/stripe';
import { designTokens } from '../constants/DesignTokens';
import { 
  PREMIUM_FEATURES, 
  FREE_LIMITATIONS, 
  PRICING, 
  PREMIUM_MESSAGING
} from '../constants/PremiumFeatures';

const { width } = Dimensions.get('window');

interface SmartSuggestion {
  id: string;
  name: string;
  category: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  estimatedPrice: number;
  saves: string;
}

interface RecipeIntegration {
  name: string;
  ingredients: string[];
  preparationTime: string;
  difficulty: string;
}

export default function ShoppingListPreviewScreen({ navigation }: any) {
  const [currentDemo, setCurrentDemo] = useState(0);
  const [animatedValue] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [shimmerAnimation] = useState(new Animated.Value(0));
  
  const { user } = useAuth();
  const { theme } = useTheme();
  const { selectedHousehold } = useHousehold();

  // Mock data showcasing smart features
  const smartSuggestions: SmartSuggestion[] = [
    {
      id: '1',
      name: 'Organic Tomatoes',
      category: 'Fresh Produce',
      reason: 'Your tomatoes expire tomorrow - perfect for pasta!',
      urgency: 'high',
      estimatedPrice: 3.99,
      saves: '2 meals worth'
    },
    {
      id: '2',
      name: 'Extra Virgin Olive Oil',
      category: 'Pantry',
      reason: 'Complements your Mediterranean recipes',
      urgency: 'medium',
      estimatedPrice: 8.49,
      saves: 'Recipe compatibility'
    },
    {
      id: '3',
      name: 'Greek Yogurt',
      category: 'Dairy',
      reason: 'Low stock + high protein breakfast',
      urgency: 'medium',
      estimatedPrice: 4.29,
      saves: 'Nutritional balance'
    },
    {
      id: '4',
      name: 'Fresh Basil',
      category: 'Herbs',
      reason: 'Pairs with your existing ingredients',
      urgency: 'low',
      estimatedPrice: 2.99,
      saves: 'Flavor enhancement'
    }
  ];

  const recipeIntegrations: RecipeIntegration[] = [
    {
      name: 'Emergency Tomato Pasta',
      ingredients: ['Pasta', 'Tomatoes', 'Olive Oil', 'Basil'],
      preparationTime: '15 min',
      difficulty: 'Easy'
    },
    {
      name: 'Mediterranean Bowl',
      ingredients: ['Greek Yogurt', 'Tomatoes', 'Olive Oil', 'Herbs'],
      preparationTime: '10 min',
      difficulty: 'Easy'
    }
  ];

  const demoSteps = [
    {
      title: '🤖 AI Analyzes Your Fridge',
      subtitle: 'Smart detection of expiring items',
      description: 'Our AI scans your current inventory and expiration dates to suggest exactly what you need.'
    },
    {
      title: '📊 Optimizes for Zero Waste',
      subtitle: 'Intelligent meal planning',
      description: 'Get suggestions that use up ingredients before they expire, reducing waste by up to 40%.'
    },
    {
      title: '💰 Saves Money Automatically',
      subtitle: 'Budget-smart recommendations',
      description: 'Avoid duplicate purchases and get cost-effective alternatives. Users save $89/month on average.'
    },
    {
      title: '👨‍👩‍👧‍👦 Syncs With Household',
      subtitle: 'Collaborative shopping',
      description: 'Real-time updates when family members add items or complete purchases.'
    }
  ];

  useEffect(() => {
    startAnimations();
    cycleDemoSteps();
  }, []);

  const startAnimations = () => {
    // Continuous pulse animation for premium elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect for locked content
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const cycleDemoSteps = () => {
    const interval = setInterval(() => {
      setCurrentDemo(prev => (prev + 1) % demoSteps.length);
    }, 4000);
  };

  const handleUpgrade = () => {
    navigation.navigate('Premium', { source: 'shopping_list_preview' });
  };

  const renderSmartSuggestion = (suggestion: SmartSuggestion, index: number) => (
    <Animated.View 
      key={suggestion.id}
      style={[
        styles.suggestionCard,
        { 
          opacity: shimmerAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1]
          })
        }
      ]}
    >
      <LinearGradient
        colors={suggestion.urgency === 'high' 
          ? [designTokens.colors.amber[50], designTokens.colors.amber[100]]
          : [theme.cardBackground, theme.bgSecondary]
        }
        style={styles.suggestionGradient}
      >
        <View style={styles.suggestionHeader}>
          <View style={styles.suggestionInfo}>
            <Text style={[styles.suggestionName, { color: theme.textPrimary }]}>
              {suggestion.name}
            </Text>
            <Text style={[styles.suggestionCategory, { color: theme.textSecondary }]}>
              {suggestion.category} • ${suggestion.estimatedPrice}
            </Text>
          </View>
          <View style={[
            styles.urgencyBadge,
            { 
              backgroundColor: suggestion.urgency === 'high' 
                ? designTokens.colors.expiredRed
                : suggestion.urgency === 'medium'
                ? designTokens.colors.alertAmber  
                : designTokens.colors.heroGreen
            }
          ]}>
            <Text style={styles.urgencyText}>
              {suggestion.urgency === 'high' ? '!' : suggestion.urgency === 'medium' ? '•' : '✓'}
            </Text>
          </View>
        </View>
        <Text style={[styles.suggestionReason, { color: theme.textSecondary }]}>
          💡 {suggestion.reason}
        </Text>
        <View style={styles.suggestionFooter}>
          <Text style={[styles.suggestionSaves, { color: designTokens.colors.heroGreen }]}>
            Saves: {suggestion.saves}
          </Text>
          <Ionicons name="add-circle-outline" size={20} color={designTokens.colors.primary[500]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderRecipeIntegration = (recipe: RecipeIntegration, index: number) => (
    <View key={index} style={styles.recipeCard}>
      <LinearGradient
        colors={[designTokens.colors.sunset + '20', designTokens.colors.sunset + '10']}
        style={styles.recipeGradient}
      >
        <View style={styles.recipeHeader}>
          <Text style={[styles.recipeName, { color: theme.textPrimary }]}>{recipe.name}</Text>
          <View style={styles.recipeMetrics}>
            <Text style={[styles.recipeTime, { color: theme.textSecondary }]}>⏱ {recipe.preparationTime}</Text>
            <Text style={[styles.recipeDifficulty, { color: theme.textSecondary }]}>📈 {recipe.difficulty}</Text>
          </View>
        </View>
        <View style={styles.ingredientsList}>
          {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
            <View key={idx} style={[styles.ingredientChip, { backgroundColor: theme.bgTertiary }]}>
              <Text style={[styles.ingredientText, { color: theme.textPrimary }]}>{ingredient}</Text>
            </View>
          ))}
          {recipe.ingredients.length > 3 && (
            <Text style={[styles.moreIngredients, { color: theme.textSecondary }]}>
              +{recipe.ingredients.length - 3} more
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  const renderDemoStep = () => {
    const step = demoSteps[currentDemo];
    return (
      <Animated.View style={styles.demoContainer}>
        <LinearGradient
          colors={[designTokens.colors.primary[50], designTokens.colors.primary[100]]}
          style={styles.demoGradient}
        >
          <Text style={[styles.demoTitle, { color: theme.textPrimary }]}>{step.title}</Text>
          <Text style={[styles.demoSubtitle, { color: theme.textSecondary }]}>{step.subtitle}</Text>
          <Text style={[styles.demoDescription, { color: theme.textSecondary }]}>{step.description}</Text>
          
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {demoSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index === currentDemo 
                      ? designTokens.colors.primary[500] 
                      : theme.borderPrimary
                  }
                ]}
              />
            ))}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderSocialProof = () => (
    <View style={styles.socialProofContainer}>
      <LinearGradient
        colors={[designTokens.colors.heroGreen + '10', designTokens.colors.heroGreen + '05']}
        style={styles.socialProofGradient}
      >
        <View style={styles.socialProofHeader}>
          <Text style={[styles.socialProofTitle, { color: theme.textPrimary }]}>
            🌟 Join {PREMIUM_MESSAGING.socialProof.userCount} Happy Users
          </Text>
          <Text style={[styles.socialProofSubtitle, { color: theme.textSecondary }]}>
            Who've already reduced food waste by {PREMIUM_MESSAGING.socialProof.wasteReduction}
          </Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: designTokens.colors.heroGreen }]}>${PREMIUM_MESSAGING.socialProof.avgSavings}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Monthly Savings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: designTokens.colors.heroGreen }]}>{PREMIUM_MESSAGING.socialProof.wasteReduction}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Less Food Waste</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: designTokens.colors.heroGreen }]}>7 days</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Free Trial</Text>
          </View>
        </View>

        <View style={styles.testimonialsContainer}>
          <Text style={[styles.testimonial, { color: theme.textSecondary }]}>
            "The smart shopping list prevents duplicate purchases!" - Sarah M.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.cardBackground, theme.bgSecondary]}
        style={[styles.header, { borderBottomColor: theme.borderPrimary }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.bgTertiary }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>🛒 Smart Shopping List</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              AI-Powered Grocery Intelligence
            </Text>
          </View>
          <View style={styles.premiumBadge}>
            <LinearGradient
              colors={[designTokens.colors.amber[400], designTokens.colors.amber[600]]}
              style={styles.premiumBadgeGradient}
            >
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Demo Animation */}
        {renderDemoStep()}

        {/* Smart Suggestions Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              🤖 AI Smart Suggestions
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Based on your fridge contents and meal plans
            </Text>
          </View>
          
          <View style={styles.suggestionsContainer}>
            {smartSuggestions.slice(0, 3).map(renderSmartSuggestion)}
            
            {/* Locked content overlay */}
            <Animated.View style={[
              styles.lockedOverlay,
              {
                opacity: shimmerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.6]
                })
              }
            ]}>
              <View style={styles.lockIconContainer}>
                <Ionicons name="lock-closed" size={32} color={designTokens.colors.amber[500]} />
                <Text style={[styles.lockText, { color: theme.textPrimary }]}>
                  Unlock AI-powered suggestions
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Recipe Integration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              👨‍🍳 Recipe Integration
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Shop for ingredients that match your available recipes
            </Text>
          </View>
          
          <View style={styles.recipesContainer}>
            {recipeIntegrations.map(renderRecipeIntegration)}
          </View>
        </View>

        {/* Social Proof */}
        {renderSocialProof()}

        {/* Features Comparison */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            ✨ Premium vs Free
          </Text>
          
          <View style={styles.comparisonContainer}>
            <View style={[styles.comparisonColumn, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.comparisonTitle, { color: theme.textTertiary }]}>Free Version</Text>
              <View style={styles.comparisonFeatures}>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Manual list creation</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ No AI suggestions</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Limited to 20 items</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ No recipe integration</Text>
              </View>
            </View>
            
            <View style={[styles.comparisonColumn, styles.premiumColumn]}>
              <LinearGradient
                colors={[designTokens.colors.heroGreen + '20', designTokens.colors.heroGreen + '10']}
                style={styles.premiumColumnGradient}
              >
                <Text style={[styles.comparisonTitle, { color: designTokens.colors.heroGreen }]}>Premium 🌟</Text>
                <View style={styles.comparisonFeatures}>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ AI-powered suggestions</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Recipe integration</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Unlimited items</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Waste optimization</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Household sync</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Budget tracking</Text>
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
              <Text style={styles.ctaTitle}>🚀 Start Your 7-Day Free Trial</Text>
              <Text style={styles.ctaSubtitle}>
                No payment required • Cancel anytime • Instant access
              </Text>
              <View style={styles.ctaFeatures}>
                <Text style={styles.ctaFeature}>✨ Unlimited AI suggestions</Text>
                <Text style={styles.ctaFeature}>📱 Instant household sync</Text>
                <Text style={styles.ctaFeature}>💰 Average $89/month savings</Text>
              </View>
              
              <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade}>
                <Text style={styles.ctaButtonText}>Try Premium Free →</Text>
              </TouchableOpacity>
              
              <Text style={styles.ctaDisclaimer}>
                Join 12,847+ users reducing food waste
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: designTokens.colors.gray[100],
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
  },
  headerSubtitle: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  premiumBadge: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  premiumBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  urgencyBanner: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: designTokens.colors.expiredRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  urgencyGradient: {
    padding: 16,
  },
  urgencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  urgencyTextContainer: {
    alignItems: 'center',
  },
  urgencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  urgencySubtitle: {
    fontSize: 12,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    opacity: 0.9,
  },
  demoContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  demoGradient: {
    padding: 20,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  demoSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  demoDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  suggestionsContainer: {
    position: 'relative',
  },
  suggestionCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionGradient: {
    padding: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  suggestionCategory: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  urgencyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionReason: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionSaves: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  lockIconContainer: {
    alignItems: 'center',
    gap: 12,
  },
  lockText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  recipesContainer: {
    gap: 12,
  },
  recipeCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  recipeGradient: {
    padding: 16,
  },
  recipeHeader: {
    marginBottom: 12,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  recipeMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  recipeTime: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  recipeDifficulty: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  ingredientChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ingredientText: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  moreIngredients: {
    fontSize: 10,
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  socialProofContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  socialProofGradient: {
    padding: 20,
  },
  socialProofHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  socialProofTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  socialProofSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  testimonialsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  testimonial: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Inter',
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonColumn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
  },
  premiumColumn: {
    borderWidth: 2,
    borderColor: designTokens.colors.heroGreen,
  },
  premiumColumnGradient: {
    borderRadius: 10,
    padding: 16,
    margin: -16,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  comparisonFeatures: {
    gap: 8,
  },
  comparisonFeature: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter',
  },
  ctaContainer: {
    marginBottom: 40,
  },
  ctaCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
    fontFamily: 'Inter',
  },
  ctaFeatures: {
    marginBottom: 20,
    gap: 4,
  },
  ctaFeature: {
    fontSize: 12,
    color: designTokens.colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  ctaButton: {
    backgroundColor: designTokens.colors.pureWhite,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.colors.heroGreen,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  ctaDisclaimer: {
    fontSize: 10,
    color: designTokens.colors.pureWhite,
    textAlign: 'center',
    opacity: 0.8,
    fontFamily: 'Inter',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
  },
}); 