import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../constants/DesignTokens';
import { analytics } from '../../lib/analytics';

const { width, height } = Dimensions.get('window');

interface ProblemScreenProps {
  navigation: any;
}

export default function ProblemScreen({ navigation }: ProblemScreenProps) {
  const [currentAmount, setCurrentAmount] = useState(0);
  const fadeInOpacity = useRef(new Animated.Value(0)).current;
  const slideUpTransform = useRef(new Animated.Value(50)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const statsFadeIn = useRef(new Animated.Value(0)).current;
  const enterTime = useRef(Date.now()).current;

  useEffect(() => {
    // Track screen view
    analytics.track('onboarding_problem_viewed', {
      timestamp: Date.now(),
      screen: 'problem'
    });

    startAnimations();
  }, []);

  const startAnimations = () => {
    // Initial fade in
    Animated.timing(fadeInOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Slide up animation
    Animated.timing(slideUpTransform, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Icon scale animation (delayed)
    setTimeout(() => {
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Counter animation (more delayed)
    setTimeout(() => {
      animateCounter();
    }, 600);

    // Stats fade in (most delayed)
    setTimeout(() => {
      Animated.timing(statsFadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 1200);
  };

  const animateCounter = () => {
    const targetAmount = 1500;
    const duration = 2000;
    const startTime = Date.now();

    const updateCounter = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newAmount = Math.floor(easeOut * targetAmount);
      
      setCurrentAmount(newAmount);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        // Add haptic feedback when counter finishes
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    requestAnimationFrame(updateCounter);
  };

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const timeSpent = Date.now() - enterTime;
    analytics.track('onboarding_problem_continue_pressed', {
      timestamp: Date.now(),
      screen: 'problem',
      time_spent_seconds: Math.round(timeSpent / 1000)
    });

    navigation.navigate('Solution');
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_problem_back_pressed', {
      timestamp: Date.now(),
      screen: 'problem'
    });

    navigation.goBack();
  };

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

      <Animated.ScrollView
        style={[
          styles.content,
          {
            opacity: fadeInOpacity,
            transform: [{ translateY: slideUpTransform }],
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Problem Statement */}
        <View style={styles.problemSection}>
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Ionicons
              name="trash"
              size={60}
              color={designTokens.colors.expiredRed}
            />
          </Animated.View>

          <Text style={styles.problemTitle}>
            The Average Family Wastes
          </Text>

          {/* Animated Counter */}
          <View style={styles.counterContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <Text style={styles.counterAmount}>
              {currentAmount.toLocaleString()}
            </Text>
          </View>

          <Text style={styles.counterLabel}>in food every year</Text>
        </View>

        {/* Statistics */}
        <Animated.View
          style={[
            styles.statsSection,
            {
              opacity: statsFadeIn,
            },
          ]}
        >
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons
                name="pie-chart"
                size={32}
                color={designTokens.colors.alertAmber}
              />
              <Text style={styles.statPercentage}>40%</Text>
            </View>
            <Text style={styles.statDescription}>
              of all food purchased gets thrown away
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons
                name="calendar"
                size={32}
                color={designTokens.colors.heroGreen}
              />
              <Text style={styles.statPercentage}>30 lbs</Text>
            </View>
            <Text style={styles.statDescription}>
              of food wasted per person monthly
            </Text>
          </View>
        </Animated.View>

        {/* Visual Impact */}
        <View style={styles.impactSection}>
          <Text style={styles.impactText}>
            That's like throwing money directly in the trash! 🗑️💰
          </Text>
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
            <Text style={styles.continueText}>I Want to Save Money!</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={designTokens.colors.pureWhite}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: designTokens.spacing['2xl'],
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing['2xl'],
    justifyContent: 'space-between',
  },
  problemSection: {
    alignItems: 'center',
    marginTop: designTokens.spacing.sm,
    marginBottom: designTokens.spacing['2xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${designTokens.colors.expiredRed}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
    shadowColor: designTokens.colors.expiredRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  problemTitle: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
    lineHeight: designTokens.typography.fontSize['2xl'] * 1.25,
    paddingHorizontal: designTokens.spacing.md,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
  },
  dollarSign: {
    fontSize: 32,
    fontWeight: '800',
    color: designTokens.colors.expiredRed,
    fontFamily: designTokens.typography.display,
  },
  counterAmount: {
    fontSize: 56,
    fontWeight: '800',
    color: designTokens.colors.expiredRed,
    fontFamily: designTokens.typography.display,
    letterSpacing: -2,
  },
  counterLabel: {
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: designTokens.typography.fontSize.base * 1.3,
  },
  statsSection: {
    marginVertical: designTokens.spacing['2xl'],
    paddingHorizontal: designTokens.spacing.sm,
  },
  statCard: {
    backgroundColor: designTokens.colors.gray[50],
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.heroGreen,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  statPercentage: {
    fontSize: designTokens.typography.fontSize.xl,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    marginLeft: designTokens.spacing.md,
    lineHeight: designTokens.typography.fontSize.xl * 1.2,
  },
  statDescription: {
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    lineHeight: designTokens.typography.fontSize.sm * 1.3,
    marginLeft: 36,
  },
  impactSection: {
    alignItems: 'center',
    marginVertical: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.md,
  },
  impactText: {
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.gray[700],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize.base * 1.3,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  continueButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.sm,
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