import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../constants/DesignTokens';
import { analytics } from '../../lib/analytics';

const { width, height } = Dimensions.get('window');

interface SolutionScreenProps {
  navigation: any;
}

const benefits = [
  {
    icon: 'scan',
    title: 'Track Expiration Dates Automatically',
    description: 'Scan barcodes or add items manually. Get smart alerts before food expires.',
    color: designTokens.colors.heroGreen,
  },
  {
    icon: 'restaurant',
    title: 'Get Smart Recipe Suggestions',
    description: 'Discover delicious recipes using ingredients that are about to expire.',
    color: designTokens.colors.primary[500],
  },
  {
    icon: 'list',
    title: 'Create Shopping Lists that Save Money',
    description: 'Only buy what you need. Avoid duplicate purchases and reduce waste.',
    color: designTokens.colors.alertAmber,
  },
];

export default function SolutionScreen({ navigation }: SolutionScreenProps) {
  const fadeInOpacity = useRef(new Animated.Value(0)).current;
  const slideUpTransform = useRef(new Animated.Value(50)).current;
  const benefitAnimations = useRef(
    benefits.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(30),
    }))
  ).current;
  const enterTime = useRef(Date.now()).current;

  useEffect(() => {
    // Track screen view
    analytics.track('onboarding_solution_viewed', {
      timestamp: Date.now(),
      screen: 'solution'
    });

    startAnimations();
  }, []);

  const startAnimations = () => {
    // Initial fade in
    Animated.parallel([
      Animated.timing(fadeInOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpTransform, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered benefit animations
    benefitAnimations.forEach((anim, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 400 + index * 200);
    });
  };

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const timeSpent = Date.now() - enterTime;
    analytics.track('onboarding_solution_continue_pressed', {
      timestamp: Date.now(),
      screen: 'solution',
      time_spent_seconds: Math.round(timeSpent / 1000)
    });

    navigation.navigate('Demo');
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_solution_back_pressed', {
      timestamp: Date.now(),
      screen: 'solution'
    });

    navigation.goBack();
  };

  const renderBenefit = (benefit: typeof benefits[0], index: number) => (
    <Animated.View
      key={index}
      style={[
        styles.benefitCard,
        {
          opacity: benefitAnimations[index].opacity,
          transform: [
            { scale: benefitAnimations[index].scale },
            { translateX: benefitAnimations[index].translateX },
          ],
        },
      ]}
    >
      <View style={[styles.benefitIconContainer, { backgroundColor: `${benefit.color}15` }]}>
        <Ionicons
          name={benefit.icon as any}
          size={32}
          color={benefit.color}
        />
      </View>
      
      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>{benefit.title}</Text>
        <Text style={styles.benefitDescription}>{benefit.description}</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.deepCharcoal} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeInOpacity,
            transform: [{ translateY: slideUpTransform }],
          },
        ]}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>FridgeHero Helps You</Text>
          <Text style={styles.subtitle}>
            Turn food waste into savings with smart tracking and recommendations
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          {benefits.map(renderBenefit)}
        </View>

        {/* Results Preview */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Users save an average of</Text>
          <View style={styles.savingsContainer}>
            <Text style={styles.savingsAmount}>$800</Text>
            <Text style={styles.savingsLabel}>per year</Text>
          </View>
          <Text style={styles.resultsSubtext}>by reducing food waste by 60%</Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.buttonGradient}
          >
            <Text style={styles.continueText}>See How It Works</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={designTokens.colors.pureWhite}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.pureWhite,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: designTokens.spacing['2xl'],
    paddingBottom: designTokens.spacing.sm,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: designTokens.spacing['2xl'],
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing['2xl'],
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing['2xl'],
    paddingHorizontal: designTokens.spacing.xs,
  },
  mainTitle: {
    fontSize: designTokens.typography.fontSize['3xl'],
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    textAlign: 'center',
    marginBottom: designTokens.spacing.sm,
    lineHeight: designTokens.typography.fontSize['3xl'] * 1.2,
  },
  subtitle: {
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize.base * 1.3,
    paddingHorizontal: 0,
  },
  benefitsSection: {
    marginBottom: designTokens.spacing['2xl'],
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[100],
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    marginTop: 0,
    flexShrink: 0,
  },
  benefitContent: {
    flex: 1,
    paddingTop: 0,
  },
  benefitTitle: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    marginBottom: designTokens.spacing.xs,
    lineHeight: designTokens.typography.fontSize.base * 1.25,
  },
  benefitDescription: {
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    lineHeight: designTokens.typography.fontSize.sm * 1.3,
  },
  resultsSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.xl,
    padding: designTokens.spacing.lg,
    backgroundColor: `${designTokens.colors.heroGreen}10`,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${designTokens.colors.heroGreen}20`,
  },
  resultsTitle: {
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    marginBottom: designTokens.spacing.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: designTokens.spacing.xs,
    justifyContent: 'center',
  },
  savingsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: designTokens.colors.heroGreen,
    fontFamily: designTokens.typography.display,
    letterSpacing: -1,
    lineHeight: 36,
  },
  savingsLabel: {
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.heroGreen,
    fontFamily: designTokens.typography.primary,
    marginLeft: designTokens.spacing.xs,
    fontWeight: '600',
    lineHeight: designTokens.typography.fontSize.base * 1.1,
  },
  resultsSubtext: {
    fontSize: designTokens.typography.fontSize.xs,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: designTokens.typography.fontSize.xs * 1.3,
  },
  continueButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing['3xl'],
    minHeight: 52,
  },
  continueText: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: designTokens.typography.primary,
    marginRight: designTokens.spacing.sm,
  },
}); 