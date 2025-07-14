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
import { useOnboarding } from '../../contexts/OnboardingContext';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { skipOnboarding } = useOnboarding();
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Track screen view
    analytics.track('onboarding_welcome_viewed', {
      timestamp: Date.now(),
      screen: 'welcome'
    });

    startAnimations();
  }, []);

  const startAnimations = () => {
    // Logo animation
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.2,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo rotation (subtle bounce)
    Animated.timing(logoRotate, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Tagline animation (delayed)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Button animation (more delayed)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800);
  };

  const handleGetStarted = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    analytics.track('onboarding_get_started_pressed', {
      timestamp: Date.now(),
      screen: 'welcome'
    });

    navigation.navigate('Problem');
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_skip_to_register_pressed', {
      timestamp: Date.now(),
      screen: 'welcome'
    });

    // Navigate to registration instead of login
    navigation.navigate('AccountSetup');
  };

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  return (
    <LinearGradient
      colors={[designTokens.colors.heroGreen, designTokens.colors.green[400]]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: logoScale },
                  { rotate: logoRotateInterpolate },
                ],
              },
            ]}
          >
            <Ionicons
              name="leaf"
              size={80}
              color={designTokens.colors.pureWhite}
            />
          </Animated.View>
          
          <Text style={styles.appName}>FridgeHero</Text>
        </View>

        {/* Tagline Section */}
        <Animated.View
          style={[
            styles.taglineSection,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          <Text style={styles.tagline}>Save Money.</Text>
          <Text style={styles.tagline}>Reduce Waste.</Text>
          <Text style={styles.tagline}>Eat Better.</Text>
          
          <Text style={styles.subtitle}>
            Your smart kitchen companion that helps you manage food, reduce waste, and discover delicious recipes.
          </Text>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View
          style={[
            styles.buttonSection,
            {
              opacity: buttonOpacity,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons
              name="arrow-forward"
              size={24}
              color={designTokens.colors.heroGreen}
              style={styles.buttonIcon}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: height * 0.02,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    letterSpacing: -1,
  },
  taglineSection: {
    alignItems: 'center',
    marginVertical: 20,
    flex: 1,
    justifyContent: 'center',
  },
  tagline: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 24,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  buttonSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: designTokens.colors.pureWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minWidth: width * 0.7,
    minHeight: 56,
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
}); 