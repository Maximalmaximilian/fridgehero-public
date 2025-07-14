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

interface WasteMetric {
  id: string;
  label: string;
  value: string;
  trend: number;
  icon: string;
  color: string;
  description: string;
}

interface WastePrediction {
  item: string;
  category: string;
  daysLeft: number;
  confidence: number;
  suggestion: string;
  potentialSaving: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  reward: string;
  icon: string;
  unlocked: boolean;
}

export default function WasteAnalyticsPreviewScreen({ navigation }: any) {
  const [currentDemo, setCurrentDemo] = useState(0);
  const [animatedValue] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [shimmerAnimation] = useState(new Animated.Value(0));
  const [glowAnimation] = useState(new Animated.Value(0));
  const [countdownTimer, setCountdownTimer] = useState(179); // 2:59 countdown
  
  const { user } = useAuth();
  const { theme } = useTheme();
  const { selectedHousehold } = useHousehold();

  // Mock waste analytics data showcasing premium features
  const wasteMetrics: WasteMetric[] = [
    {
      id: '1',
      label: 'Money Saved',
      value: '$127.83',
      trend: 23.5,
      icon: 'cash-outline',
      color: designTokens.colors.heroGreen,
      description: 'This month vs. last month'
    },
    {
      id: '2',
      label: 'Waste Prevented',
      value: '8.4kg',
      trend: 31.2,
      icon: 'leaf-outline',
      color: designTokens.colors.primary[500],
      description: 'Environmental impact reduced'
    },
    {
      id: '3',
      label: 'CO₂ Prevented',
      value: '15.2kg',
      trend: 18.7,
      icon: 'earth-outline',
      color: designTokens.colors.green[600],
      description: 'Carbon footprint reduction'
    },
    {
      id: '4',
      label: 'Efficiency Score',
      value: '94%',
      trend: 12.1,
      icon: 'analytics-outline',
      color: designTokens.colors.amber[500],
      description: 'Food utilization rate'
    }
  ];

  const wastePredictions: WastePrediction[] = [
    {
      item: 'Organic Spinach',
      category: 'Produce',
      daysLeft: 1,
      confidence: 94,
      suggestion: 'Use in smoothie or salad today',
      potentialSaving: 4.99
    },
    {
      item: 'Greek Yogurt',
      category: 'Dairy',
      daysLeft: 2,
      confidence: 87,
      suggestion: 'Perfect for breakfast bowls',
      potentialSaving: 5.49
    },
    {
      item: 'Bell Peppers',
      category: 'Produce',
      daysLeft: 3,
      confidence: 91,
      suggestion: 'Ideal for stir-fry or stuffing',
      potentialSaving: 3.29
    }
  ];

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Zero Waste Warrior',
      description: 'Used 100% of groceries this week',
      progress: 87,
      reward: '50 EcoPoints',
      icon: 'trophy-outline',
      unlocked: false
    },
    {
      id: '2',
      title: 'Savings Champion',
      description: 'Saved $100+ this month',
      progress: 92,
      reward: '$5 grocery credit',
      icon: 'medal-outline',
      unlocked: false
    },
    {
      id: '3',
      title: 'Green Guardian',
      description: 'Prevented 20kg CO₂ emissions',
      progress: 76,
      reward: 'Eco badge',
      icon: 'shield-checkmark-outline',
      unlocked: true
    }
  ];

  const demoSteps = [
    {
      title: '📊 Smart Waste Analytics',
      subtitle: 'AI-powered insights into your food usage',
      description: 'Get detailed breakdowns of waste patterns, savings opportunities, and environmental impact.'
    },
    {
      title: '🔮 Predictive Alerts',
      subtitle: 'Know before food goes bad',
      description: 'AI predicts expiration with 94% accuracy and suggests optimal usage before waste occurs.'
    },
    {
      title: '💰 Financial Impact Tracking',
      subtitle: 'See your savings grow',
      description: 'Track exact dollar amounts saved by reducing waste. Users save $127 on average per month.'
    },
    {
      title: '🏆 Gamified Achievements',
      subtitle: 'Turn sustainability into rewards',
      description: 'Unlock achievements, earn points, and compete with household members for eco-friendly habits.'
    }
  ];

  useEffect(() => {
    startAnimations();
    startCountdown();
    cycleDemoSteps();
  }, []);

  const startAnimations = () => {
    // Continuous pulse animation for premium elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect for locked content
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow effect for analytics cards
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0.3,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startCountdown = () => {
    const interval = setInterval(() => {
      setCountdownTimer(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cycleDemoSteps = () => {
    const interval = setInterval(() => {
      setCurrentDemo(prev => (prev + 1) % demoSteps.length);
    }, 4000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpgrade = () => {
    navigation.navigate('Premium', { source: 'waste_analytics_preview' });
  };

  const renderWasteMetric = (metric: WasteMetric, index: number) => (
    <View 
      key={metric.id}
      style={[
        styles.metricCard,
        { backgroundColor: theme.cardBackground }
      ]}
    >
      <Animated.View style={[
        styles.metricContent,
        {
          opacity: shimmerAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 0.8]
          })
        }
      ]}>
        <View style={styles.metricHeader}>
          <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '20' }]}>
            <Ionicons name={metric.icon as any} size={24} color={metric.color} />
          </View>
          <View style={[styles.trendBadge, { 
            backgroundColor: metric.trend > 0 ? designTokens.colors.heroGreen + '20' : designTokens.colors.expiredRed + '20'
          }]}>
            <Ionicons 
              name={metric.trend > 0 ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={metric.trend > 0 ? designTokens.colors.heroGreen : designTokens.colors.expiredRed} 
            />
            <Text style={[styles.trendText, { 
              color: metric.trend > 0 ? designTokens.colors.heroGreen : designTokens.colors.expiredRed 
            }]}>
              {metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
        <Text style={[styles.metricLabel, { color: theme.textPrimary }]}>{metric.label}</Text>
        <Text style={[styles.metricDescription, { color: theme.textSecondary }]}>{metric.description}</Text>
      </Animated.View>
    </View>
  );

  const renderWastePrediction = (prediction: WastePrediction, index: number) => (
    <View 
      key={index}
      style={[styles.predictionCard, { backgroundColor: theme.cardBackground }]}
    >
      <Animated.View style={[
        styles.predictionContent,
        {
          opacity: shimmerAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 0.9]
          })
        }
      ]}>
        <View style={styles.predictionHeader}>
          <View style={styles.predictionInfo}>
            <Text style={[styles.predictionItem, { color: theme.textPrimary }]}>{prediction.item}</Text>
            <Text style={[styles.predictionCategory, { color: theme.textSecondary }]}>{prediction.category}</Text>
          </View>
          <View style={[styles.urgencyBadge, {
            backgroundColor: prediction.daysLeft <= 1 ? designTokens.colors.expiredRed : 
                            prediction.daysLeft <= 2 ? designTokens.colors.alertAmber : 
                            designTokens.colors.heroGreen
          }]}>
            <Text style={styles.urgencyText}>{prediction.daysLeft}d left</Text>
          </View>
        </View>

        <View style={styles.predictionDetails}>
          <View style={styles.confidenceRow}>
            <Text style={[styles.confidenceLabel, { color: theme.textTertiary }]}>AI Confidence:</Text>
            <Text style={[styles.confidenceValue, { color: designTokens.colors.heroGreen }]}>
              {prediction.confidence}%
            </Text>
          </View>
          
          <Text style={[styles.suggestion, { color: theme.textPrimary }]}>{prediction.suggestion}</Text>
          
          <View style={styles.savingRow}>
            <Ionicons name="cash-outline" size={16} color={designTokens.colors.heroGreen} />
            <Text style={[styles.savingText, { color: designTokens.colors.heroGreen }]}>
              Save ${prediction.potentialSaving.toFixed(2)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderAchievement = (achievement: Achievement, index: number) => (
    <View 
      key={achievement.id}
      style={[styles.achievementCard, { 
        backgroundColor: theme.cardBackground,
        opacity: achievement.unlocked ? 1 : 0.7
      }]}
    >
      <Animated.View style={[
        styles.achievementContent,
        {
          opacity: shimmerAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1]
          })
        }
      ]}>
        <View style={styles.achievementHeader}>
          <View style={[styles.achievementIconContainer, {
            backgroundColor: achievement.unlocked ? designTokens.colors.heroGreen + '20' : theme.bgTertiary
          }]}>
            <Ionicons 
              name={achievement.icon as any} 
              size={24} 
              color={achievement.unlocked ? designTokens.colors.heroGreen : theme.textTertiary} 
            />
          </View>
          {achievement.unlocked && (
            <View style={styles.unlockedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.heroGreen} />
            </View>
          )}
        </View>
        
        <Text style={[styles.achievementTitle, { color: theme.textPrimary }]}>{achievement.title}</Text>
        <Text style={[styles.achievementDescription, { color: theme.textSecondary }]}>{achievement.description}</Text>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.bgTertiary }]}>
            <View style={[styles.progressFill, { 
              width: `${achievement.progress}%`,
              backgroundColor: achievement.unlocked ? designTokens.colors.heroGreen : designTokens.colors.amber[500]
            }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textTertiary }]}>
            {achievement.progress}%
          </Text>
        </View>
        
        <View style={styles.rewardContainer}>
          <Ionicons name="gift-outline" size={14} color={designTokens.colors.amber[500]} />
          <Text style={[styles.rewardText, { color: designTokens.colors.amber[500] }]}>
            {achievement.reward}
          </Text>
        </View>
      </Animated.View>
    </View>
  );

  const renderDemoStep = () => {
    const step = demoSteps[currentDemo];
    return (
      <Animated.View style={[
        styles.demoCard,
        { backgroundColor: theme.cardBackground }
      ]}>
        <LinearGradient
          colors={[designTokens.colors.heroGreen + '10', designTokens.colors.primary[500] + '05']}
          style={styles.demoGradient}
        >
          <View style={styles.demoHeader}>
            <Text style={[styles.demoTitle, { color: theme.textPrimary }]}>{step.title}</Text>
            <Text style={[styles.demoSubtitle, { color: theme.textSecondary }]}>{step.subtitle}</Text>
          </View>
          <Text style={[styles.demoDescription, { color: theme.textSecondary }]}>{step.description}</Text>
          
          <View style={styles.demoIndicators}>
            {demoSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.demoIndicator,
                  {
                    backgroundColor: index === currentDemo ? designTokens.colors.heroGreen : theme.bgTertiary,
                    width: index === currentDemo ? 24 : 8,
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
    <View style={[styles.socialProofCard, { backgroundColor: theme.cardBackground }]}>
      <LinearGradient
        colors={[designTokens.colors.heroGreen + '15', designTokens.colors.primary[500] + '10']}
        style={styles.socialProofGradient}
      >
        <View style={styles.socialProofHeader}>
          <Ionicons name="people" size={32} color={designTokens.colors.heroGreen} />
          <Text style={[styles.socialProofTitle, { color: theme.textPrimary }]}>
            Join 18,000+ Users
          </Text>
        </View>
        
        <View style={styles.socialProofStats}>
          <View style={styles.socialProofStat}>
            <Text style={[styles.socialProofNumber, { color: designTokens.colors.heroGreen }]}>$127</Text>
            <Text style={[styles.socialProofLabel, { color: theme.textSecondary }]}>Avg monthly savings</Text>
          </View>
          <View style={styles.socialProofStat}>
            <Text style={[styles.socialProofNumber, { color: designTokens.colors.heroGreen }]}>94%</Text>
            <Text style={[styles.socialProofLabel, { color: theme.textSecondary }]}>Waste reduction</Text>
          </View>
          <View style={styles.socialProofStat}>
            <Text style={[styles.socialProofNumber, { color: designTokens.colors.heroGreen }]}>4.9★</Text>
            <Text style={[styles.socialProofLabel, { color: theme.textSecondary }]}>App Store rating</Text>
          </View>
        </View>
        
        <Text style={[styles.socialProofQuote, { color: theme.textSecondary }]}>
          "The waste analytics helped me save $200+ last month while becoming more eco-conscious!" - Sarah K.
        </Text>
      </LinearGradient>
    </View>
  );

  return (
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
          
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Waste Analytics
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              AI-powered insights & savings
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
        {/* Demo Animation */}
        {renderDemoStep()}

        {/* Blurred Analytics Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              📊 Your Waste Analytics
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Real-time insights into your food usage patterns
            </Text>
          </View>
          
          <View style={styles.metricsContainer}>
            <View style={styles.metricsGrid}>
              {wasteMetrics.map(renderWasteMetric)}
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
                <Ionicons name="analytics" size={48} color={designTokens.colors.amber[500]} />
                <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>
                  Advanced Analytics Locked
                </Text>
                <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>
                  Unlock detailed insights, trends & predictions
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* AI Waste Predictions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              🔮 AI Waste Predictions
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Know what's expiring before it happens
            </Text>
          </View>
          
          <View style={styles.predictionsContainer}>
            {wastePredictions.map(renderWastePrediction)}
            
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
                <Ionicons name="eye" size={32} color={designTokens.colors.amber[500]} />
                <Text style={[styles.lockText, { color: theme.textPrimary }]}>
                  Unlock AI predictions
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Achievements & Gamification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              🏆 Sustainability Achievements
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Turn eco-friendly habits into rewards
            </Text>
          </View>
          
          <View style={styles.achievementsContainer}>
            {achievements.map(renderAchievement)}
          </View>
        </View>

        {/* Social Proof */}
        {renderSocialProof()}

        {/* Features Comparison */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            ✨ Premium vs Free Analytics
          </Text>
          
          <View style={styles.comparisonContainer}>
            <View style={[styles.comparisonColumn, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.comparisonTitle, { color: theme.textTertiary }]}>Free Version</Text>
              <View style={styles.comparisonFeatures}>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Basic waste tracking</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ No AI predictions</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ Limited insights</Text>
                <Text style={[styles.comparisonFeature, { color: theme.textTertiary }]}>❌ No achievements</Text>
              </View>
            </View>
            
            <View style={[styles.comparisonColumn, styles.premiumColumn]}>
              <LinearGradient
                colors={[designTokens.colors.heroGreen + '20', designTokens.colors.heroGreen + '10']}
                style={styles.premiumColumnGradient}
              >
                <Text style={[styles.comparisonTitle, { color: designTokens.colors.heroGreen }]}>Premium 🌟</Text>
                <View style={styles.comparisonFeatures}>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ AI waste predictions</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Detailed analytics</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Money tracking</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ CO₂ impact reports</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Achievement system</Text>
                  <Text style={[styles.comparisonFeature, { color: theme.textPrimary }]}>✅ Custom alerts</Text>
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
              <Text style={styles.ctaTitle}>🌱 {PREMIUM_MESSAGING.tagline}</Text>
              <Text style={styles.ctaSubtitle}>
                {PREMIUM_MESSAGING.guarantees[0]} • No payment required • {PREMIUM_MESSAGING.guarantees[2]}
              </Text>
              <View style={styles.ctaFeatures}>
                <Text style={styles.ctaFeature}>📊 Real-time waste analytics</Text>
                <Text style={styles.ctaFeature}>🔮 AI expiration predictions</Text>
                <Text style={styles.ctaFeature}>💰 Save ${PREMIUM_MESSAGING.socialProof.avgSavings}+ monthly</Text>
                <Text style={styles.ctaFeature}>🏆 Unlock achievements</Text>
              </View>
              
              <TouchableOpacity style={styles.ctaButton} onPress={handleUpgrade}>
                <Text style={styles.ctaButtonText}>{PREMIUM_MESSAGING.ctaText.trial} →</Text>
              </TouchableOpacity>
              
              <Text style={styles.ctaDisclaimer}>
                Join {PREMIUM_MESSAGING.socialProof.userCount} users reducing waste & saving money
              </Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.gray[200],
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
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
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
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  urgencyBanner: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: designTokens.colors.amber[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  urgencyGradient: {
    padding: 16,
  },
  urgencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  urgencyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Demo Step
  demoCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  demoGradient: {
    padding: 20,
  },
  demoHeader: {
    marginBottom: 12,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  demoSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  demoDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  demoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  demoIndicator: {
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.colors.gray[300],
  },
  
  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  
  // Metrics
  metricsContainer: {
    position: 'relative',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 60) / 2,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  metricContent: {
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  
  // Predictions
  predictionsContainer: {
    position: 'relative',
    gap: 12,
  },
  predictionCard: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  predictionContent: {},
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionItem: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  predictionCategory: {
    fontSize: 12,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  predictionDetails: {
    gap: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestion: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Achievements
  achievementsContainer: {
    gap: 12,
  },
  achievementCard: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  achievementContent: {},
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedBadge: {
    backgroundColor: designTokens.colors.heroGreen + '20',
    borderRadius: 12,
    padding: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Locked Overlay
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconContainer: {
    alignItems: 'center',
    gap: 12,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  lockText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Social Proof
  socialProofCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  socialProofGradient: {
    padding: 20,
  },
  socialProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  socialProofTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  socialProofStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  socialProofStat: {
    alignItems: 'center',
  },
  socialProofNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  socialProofLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  socialProofQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Comparison
  comparisonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  comparisonColumn: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  premiumColumn: {
    overflow: 'hidden',
  },
  premiumColumnGradient: {
    padding: 16,
    margin: -16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  comparisonFeatures: {
    gap: 8,
  },
  comparisonFeature: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  // CTA
  ctaContainer: {
    marginBottom: 32,
  },
  ctaCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: designTokens.colors.heroGreen,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaFeatures: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  ctaFeature: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  ctaDisclaimer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
}); 