import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { stripeService, SUBSCRIPTION_PLANS } from '../lib/stripe';
import { designTokens } from '../constants/DesignTokens';
import { 
  PREMIUM_FEATURES, 
  FREE_LIMITATIONS, 
  PRICING, 
  PREMIUM_MESSAGING
} from '../constants/PremiumFeatures';

const { width } = Dimensions.get('window');

export default function PremiumScreen({ navigation }: any) {
  const [selectedPlan, setSelectedPlan] = useState('premium_yearly');
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [pulseAnimation] = useState(new Animated.Value(1));
  const { user } = useAuth();

  useEffect(() => {
    checkSubscriptionStatus();
    checkTrialStatus();
    startAnimations();
    
    const interval = setInterval(() => {
      stripeService.checkTrialExpiration();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const startAnimations = () => {
    // Pulse animation for CTA button
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
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await stripeService.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const checkTrialStatus = async () => {
    try {
      const status = await stripeService.getTrialStatus();
      setTrialStatus(status);
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const success = await stripeService.startFreeTrial(selectedPlan);
      if (success) {
        await checkSubscriptionStatus();
        await checkTrialStatus();
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start free trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (subscriptionStatus?.isActive && subscriptionStatus?.status === 'active') {
      Alert.alert('Already Premium! 🎉', 'You already have an active premium subscription!');
      return;
    }

    setLoading(true);
    try {
      let success = false;
      
      if (subscriptionStatus?.isTrialing) {
        success = await stripeService.convertTrialToSubscription(selectedPlan);
      } else {
        success = await stripeService.startSubscription(selectedPlan);
      }
      
      if (success) {
        await checkSubscriptionStatus();
        await checkTrialStatus();
        Alert.alert(
          'Welcome to Premium! 🎉',
          'Your VIP access is now active. Start saving immediately!',
          [{ text: 'Start Saving!', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'This will open your subscription management page.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => {
          // Fallback to generic subscription management
          Alert.alert('Subscription Management', 'Please contact support to manage your subscription.');
        }}
      ]
    );
  };

  const animatePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderTrialBanner = () => {
    if (subscriptionStatus?.status === 'active') return null;

    if (subscriptionStatus?.isTrialing) {
      return (
        <View style={styles.trialBanner}>
          <LinearGradient
            colors={[designTokens.colors.ocean, designTokens.colors.primary[600]]}
            style={styles.trialBannerGradient}
          >
            <View style={styles.trialBannerContent}>
              <Ionicons name="time" size={24} color={designTokens.colors.pureWhite} />
              <View style={styles.trialBannerText}>
                <Text style={styles.trialBannerTitle} numberOfLines={1}>
                  {subscriptionStatus.daysLeftInTrial > 0 
                    ? `${subscriptionStatus.daysLeftInTrial} Day${subscriptionStatus.daysLeftInTrial !== 1 ? 's' : ''} Left`
                    : 'Trial Ending Soon'
                  }
                </Text>
                <Text style={styles.trialBannerSubtitle} numberOfLines={1}>
                  Trial ends {new Date(subscriptionStatus.trialEnd).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.trialConvertButton}
              onPress={handleUpgrade}
              disabled={loading}
            >
              <Text style={styles.trialConvertButtonText} numberOfLines={1}>
                {loading ? 'Processing...' : 'Keep Premium'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      );
    }

    if (trialStatus?.isEligibleForTrial) {
      return (
        <View style={styles.trialBanner}>
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.trialBannerGradient}
          >
            <View style={styles.trialBannerContent}>
              <Ionicons name="gift" size={24} color={designTokens.colors.pureWhite} />
              <View style={styles.trialBannerText}>
                <Text style={styles.trialBannerTitle}>🎁 7-Day VIP Trial</Text>
                <Text style={styles.trialBannerSubtitle} numberOfLines={1}>
                  Full access • No commitment • Cancel anytime
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.trialStartButton}
              onPress={handleStartTrial}
              disabled={loading}
            >
              <Text style={styles.trialStartButtonText} numberOfLines={1}>
                {loading ? 'Starting...' : 'Start Free Trial'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      );
    }

    return null;
  };

  const renderPainPoint = (painPoint: any, index: number) => (
    <View key={index} style={styles.painPoint}>
      <Ionicons name={painPoint.icon} size={20} color={designTokens.colors.expiredRed} />
      <View style={styles.painPointContent}>
        <Text style={styles.painPointTitle}>{painPoint.limitation}</Text>
        <Text style={styles.painPointDescription}>{painPoint.pain}</Text>
        <Text style={styles.painPointCost}>{painPoint.cost}</Text>
      </View>
    </View>
  );

  const renderFeature = (feature: any, index: number) => (
    <View key={index} style={styles.featureCard}>
      <View style={styles.featureHeader}>
        <Ionicons name={feature.icon as any} size={24} color={designTokens.colors.heroGreen} />
        <Text style={styles.featureTitle}>{feature.title}</Text>
      </View>
      <Text style={styles.featureDescription}>{feature.description}</Text>
      <Text style={styles.featureBenefit}>{feature.benefit}</Text>
    </View>
  );

  const renderPricingPlan = (plan: any) => {
    const isSelected = selectedPlan === plan.id;
    const savings = plan.id === 'premium_yearly' ? stripeService.getYearlySavings() : null;
    
    return (
      <Animated.View
        key={plan.id}
        style={[
          styles.pricingCard,
          isSelected && styles.pricingCardSelected,
          { transform: [{ scale: isSelected ? scaleAnimation : 1 }] }
        ]}
      >
        <TouchableOpacity
          onPress={() => animatePlanSelection(plan.id)}
          style={styles.pricingCardTouchable}
        >
          {plan.popular && (
            <View style={styles.popularBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.popularBadgeGradient}
              >
                <Ionicons name="star" size={12} color="white" />
                <Text style={styles.popularBadgeText}>BEST VALUE</Text>
              </LinearGradient>
            </View>
          )}
          
          <View style={styles.pricingHeader}>
            <View style={styles.pricingTitleContainer}>
              <Text style={styles.pricingTitle} numberOfLines={1}>{plan.name}</Text>
              {savings && (
                <Text style={styles.pricingSavings} numberOfLines={1}>
                  Save {savings.percentage}%
                </Text>
              )}
            </View>
            
            <View style={styles.pricingAmount}>
              <Text style={styles.pricingPrice}>${plan.price}</Text>
              <Text style={styles.pricingPeriod}>/{plan.interval}</Text>
            </View>
            
            {plan.trialDays && trialStatus?.isEligibleForTrial && (
              <Text style={styles.pricingTrial} numberOfLines={1}>
                🎁 {plan.trialDays} days free trial
              </Text>
            )}
          </View>
          
          <View style={styles.pricingFeatures}>
            {plan.features.slice(0, 3).map((feature: string, index: number) => (
              <View key={index} style={styles.pricingFeatureItem}>
                <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.heroGreen} />
                <Text style={styles.pricingFeatureText} numberOfLines={1}>{feature}</Text>
              </View>
            ))}
            {plan.features.length > 3 && (
              <Text style={styles.pricingMoreFeatures} numberOfLines={1}>
                +{plan.features.length - 3} more features
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // If user is already premium, show simplified active state
  if (subscriptionStatus?.isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={designTokens.colors.heroGreen} />
        <LinearGradient
          colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
          style={styles.activeHeader}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={designTokens.colors.pureWhite} />
          </TouchableOpacity>
          
          <View style={styles.activeHeaderContent}>
            <Text style={styles.activeHeaderTitle}>🎉 Premium Active</Text>
            <Text style={styles.activeHeaderSubtitle}>
              You're saving money and reducing waste!
            </Text>
            {subscriptionStatus.cancelAtPeriodEnd && (
              <Text style={styles.cancelWarning}>
                ⚠️ Cancels on {new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString()}
              </Text>
            )}
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.activeSubscriptionCard}>
            <Text style={styles.currentPlanTitle}>Your Premium Plan</Text>
            <Text style={styles.currentPlanName} numberOfLines={1}>
              {SUBSCRIPTION_PLANS.find(p => p.id === subscriptionStatus.planId)?.name || 'Premium'}
            </Text>
            
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageSubscription}
            >
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.premiumFeaturesSection}>
            <Text style={styles.sectionTitle}>Your Premium Features</Text>
            {PREMIUM_FEATURES.map((feature, index) => renderFeature(feature, index))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Premium offer screen - everything scrollable
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={designTokens.colors.expiredRed} />
      
      <ScrollView 
        style={styles.fullScrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Hero Header - Moved to top */}
        <LinearGradient
          colors={[designTokens.colors.expiredRed, designTokens.colors.heroGreen, designTokens.colors.ocean]}
          style={styles.scrollableHeader}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={designTokens.colors.pureWhite} />
          </TouchableOpacity>
          
          <View style={styles.heroContent}>
            {/* Social Proof */}
            <View style={styles.socialProof}>
              <View style={styles.socialProofStars}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name="star" size={16} color="#FFD700" />
                ))}
              </View>
              <Text style={styles.socialProofText} numberOfLines={2}>
                ⭐ 4.9/5 from 73,426 families • Featured in App Store
              </Text>
            </View>
            
            {/* Main Value Proposition */}
            <Text style={styles.heroTitle} numberOfLines={3}>
              Stop Wasting Food with Smart Organization
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={4}>
              Join families using AI-powered insights to reduce food waste and eat better with smart fridge management
            </Text>
            
            {/* Hero Stats */}
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>40%</Text>
                <Text style={styles.heroStatLabel}>Less waste</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>2 min</Text>
                <Text style={styles.heroStatLabel}>Daily setup</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNumber}>7 days</Text>
                <Text style={styles.heroStatLabel}>Free trial</Text>
              </View>
            </View>

            {/* Trial Focus */}
            <View style={styles.heroUrgency}>
              <Ionicons name="gift" size={16} color="#FFD700" />
              <Text style={styles.heroUrgencyText} numberOfLines={1}>
                7-day free trial • No payment required • Cancel anytime
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Trial Banner */}
        {renderTrialBanner()}

        {/* Problem Agitation Section */}
        <View style={styles.problemSection}>
          <Text style={styles.problemTitle} numberOfLines={2}>
            Still Using Free Version? Here's What You're Missing:
          </Text>
          
          <View style={styles.painPointsContainer}>
            {FREE_LIMITATIONS.map(renderPainPoint)}
          </View>
        </View>

        {/* Social Proof - Strategic Placement */}
        <View style={styles.socialProofSection}>
          <LinearGradient
            colors={[designTokens.colors.green[50], designTokens.colors.green[100]]}
            style={styles.socialProofGradient}
          >
            <Text style={styles.socialProofTitle} numberOfLines={1}>🚀 Join thousands who've upgraded today</Text>
            <View style={styles.socialProofStats}>
              <View style={styles.socialProofStat}>
                <Text style={styles.socialProofNumber}>{PREMIUM_MESSAGING.socialProof.userCount}</Text>
                <Text style={styles.socialProofLabel}>Happy families</Text>
              </View>
              <View style={styles.socialProofStat}>
                <Text style={styles.socialProofNumber}>{PREMIUM_MESSAGING.socialProof.wasteReduction}</Text>
                <Text style={styles.socialProofLabel}>Less waste</Text>
              </View>
              <View style={styles.socialProofStat}>
                <Text style={styles.socialProofNumber}>{PREMIUM_MESSAGING.socialProof.rating}★</Text>
                <Text style={styles.socialProofLabel}>App Store rating</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Pricing Plans */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle} numberOfLines={2}>
            Choose Your Money-Saving Plan
          </Text>
          <Text style={styles.pricingSubtitle} numberOfLines={2}>
            Both plans pay for themselves in the first month
          </Text>
          
          <View style={styles.pricingPlans}>
            {SUBSCRIPTION_PLANS.map(renderPricingPlan)}
          </View>
          
          {/* Risk Reversal */}
          <View style={styles.guaranteeSection}>
            <LinearGradient
              colors={[designTokens.colors.green[50], designTokens.colors.green[100]]}
              style={styles.guaranteeGradient}
            >
              <Ionicons name="shield-checkmark" size={24} color={designTokens.colors.heroGreen} />
              <View style={styles.guaranteeContent}>
                <Text style={styles.guaranteeTitle} numberOfLines={1}>30-Day Money-Back Guarantee</Text>
                <Text style={styles.guaranteeText} numberOfLines={2}>
                  Not saving money? Get 100% refund, no questions asked
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Value Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle} numberOfLines={2}>
            Everything You Get With Premium
          </Text>
          <Text style={styles.featuresSubtitle} numberOfLines={2}>
            Each feature designed to put money back in your pocket
          </Text>
          
          {PREMIUM_FEATURES.map((feature, index) => renderFeature(feature, index))}
        </View>

        {/* Testimonials */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>What Our VIP Members Say</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testimonialsScroll}>
            <View style={styles.testimonials}>
              {[
                { name: 'Sarah M.', text: 'No more spoiled food! The app actually works.' },
                { name: 'Mike R.', text: 'The recipe suggestions use everything. Love it!' },
                { name: 'Jennifer L.', text: 'Family sharing eliminated duplicate purchases!' }
              ].map((testimonial, index) => (
                <View key={index} style={styles.testimonialCard}>
                  <View style={styles.testimonialStars}>
                    {[1,2,3,4,5].map(i => (
                      <Ionicons key={i} name="star" size={12} color="#FFD700" />
                    ))}
                  </View>
                  <Text style={styles.testimonialText} numberOfLines={3}>"{testimonial.text}"</Text>
                  <View style={styles.testimonialAuthor}>
                    <Text style={styles.testimonialName} numberOfLines={1}>{testimonial.name}</Text>
                    <Text style={styles.testimonialSaving} numberOfLines={1}>Verified user</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Final CTA */}
        <View style={styles.finalCtaSection}>
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.finalCtaGradient}
          >
            <Text style={styles.finalCtaTitle} numberOfLines={2}>
              Ready to Reduce Food Waste?
            </Text>
            <Text style={styles.finalCtaSubtitle} numberOfLines={2}>
              Start your free trial and join the smart food management revolution
            </Text>
            
            <View style={styles.finalCtaStats}>
              <View style={styles.finalCtaStat}>
                <Text style={styles.finalCtaNumber}>7 days</Text>
                <Text style={styles.finalCtaLabel}>Free trial</Text>
              </View>
              <View style={styles.finalCtaStat}>
                <Text style={styles.finalCtaNumber}>No risk</Text>
                <Text style={styles.finalCtaLabel}>Cancel anytime</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Space for sticky button */}
        <View style={styles.stickyButtonSpace} />
      </ScrollView>

      {/* Sticky CTA Button */}
      <View style={styles.stickyCtaContainer}>
        <Animated.View style={[
          styles.upgradeButtonContainer,
          { transform: [{ scale: pulseAnimation }] }
        ]}>
          <TouchableOpacity
            style={[styles.upgradeButton, loading && styles.upgradeButtonDisabled]}
            onPress={handleUpgrade}
            disabled={loading}
          >
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
              style={styles.upgradeButtonGradient}
            >
              <Ionicons name="rocket" size={24} color={designTokens.colors.pureWhite} />
              <View style={styles.upgradeButtonContent}>
                <Text style={styles.upgradeButtonText} numberOfLines={1}>
                  {loading ? 'Starting...' : PREMIUM_MESSAGING.ctaText.trial}
                </Text>
                <Text style={styles.upgradeButtonSubtext} numberOfLines={1}>
                  {PREMIUM_MESSAGING.guarantees[0]} • {PREMIUM_MESSAGING.guarantees[2]}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        
        <Text style={styles.upgradeDisclaimer} numberOfLines={2}>
          💳 No payment required for trial • 🔒 30-day money-back guarantee
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.gray[50],
  },
  fullScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  scrollableHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  activeHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  activeHeaderContent: {
    alignItems: 'center',
  },
  socialProof: {
    alignItems: 'center',
    marginBottom: 20,
  },
  socialProofStars: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  socialProofText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 26,
  },
  activeHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 8,
  },
  activeHeaderSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 8,
  },
  cancelWarning: {
    fontSize: 14,
    color: designTokens.colors.amber[300],
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  pricingSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 24,
  },
  pricingSubtitle: {
    fontSize: 18,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 20,
  },
  pricingPlans: {
    gap: 16,
  },
  pricingCard: {
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  pricingCardSelected: {
    shadowColor: designTokens.colors.heroGreen,
    shadowOpacity: 0.3,
    elevation: 12,
  },
  pricingCardTouchable: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  popularBadge: {
    backgroundColor: designTokens.colors.amber[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  popularBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 16,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pricingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  pricingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
  },
  pricingAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Poppins',
  },
  pricingPeriod: {
    fontSize: 18,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  pricingSavings: {
    fontSize: 14,
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  pricingTrial: {
    fontSize: 14,
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  pricingFeatures: {
    gap: 8,
  },
  pricingFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: designTokens.colors.gray[700],
    fontFamily: 'Inter',
    flex: 1,
  },
  pricingMoreFeatures: {
    fontSize: 14,
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  featuresSection: {
    padding: 20,
    paddingTop: 0,
  },
  featuresSubtitle: {
    fontSize: 18,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 20,
  },
  testimonialsSection: {
    padding: 20,
  },
  testimonialsScroll: {
    marginTop: 16,
  },
  testimonials: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
  },
  testimonialCard: {
    backgroundColor: designTokens.colors.pureWhite,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: width * 0.8,
  },
  testimonialStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testimonialText: {
    fontSize: 14,
    color: designTokens.colors.gray[700],
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
  },
  testimonialSaving: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  finalCtaSection: {
    padding: 20,
  },
  finalCtaGradient: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  finalCtaTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 12,
  },
  finalCtaSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 20,
  },
  finalCtaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  finalCtaStat: {
    alignItems: 'center',
  },
  finalCtaNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  finalCtaLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  stickyCtaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: designTokens.colors.pureWhite,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradeButtonContainer: {
    marginBottom: 8,
  },
  upgradeButton: {
    borderRadius: 16,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
  },
  upgradeButtonContent: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  upgradeButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
  },
  upgradeDisclaimer: {
    fontSize: 12,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 16,
  },
  activeSubscriptionCard: {
    margin: 20,
    padding: 24,
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  currentPlanTitle: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  manageButton: {
    backgroundColor: designTokens.colors.gray[100],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.gray[700],
    fontFamily: 'Inter',
  },
  premiumFeaturesSection: {
    padding: 20,
  },
  featureCard: {
    backgroundColor: designTokens.colors.pureWhite,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  featureBenefit: {
    fontSize: 14,
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  problemSection: {
    padding: 20,
  },
  problemTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 16,
  },
  painPointsContainer: {
    gap: 12,
  },
  painPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  painPointContent: {
    flex: 1,
  },
  painPointTitle: {
    fontSize: 14,
    color: designTokens.colors.gray[700],
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  painPointDescription: {
    fontSize: 13,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  painPointCost: {
    fontSize: 13,
    color: designTokens.colors.expiredRed,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  socialProofSection: {
    padding: 20,
  },
  socialProofGradient: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  socialProofTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 16,
  },
  socialProofStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  socialProofStat: {
    alignItems: 'center',
  },
  socialProofNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Poppins',
  },
  socialProofLabel: {
    fontSize: 11,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  guaranteeSection: {
    marginTop: 20,
  },
  guaranteeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  guaranteeContent: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  guaranteeText: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  heroUrgency: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroUrgencyText: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  stickyButtonSpace: {
    height: 100,
  },
  
  // Trial banner styles
  trialBanner: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  trialBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  trialBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trialBannerText: {
    flexDirection: 'column',
    marginLeft: 16,
    flex: 1,
  },
  trialBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  trialBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
  },
  trialConvertButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  trialConvertButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
  trialStartButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  trialStartButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
  },
}); 