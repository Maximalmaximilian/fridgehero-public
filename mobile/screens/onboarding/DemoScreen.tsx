import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../../constants/DesignTokens';
import { analytics } from '../../lib/analytics';

const { width, height } = Dimensions.get('window');

interface DemoScreenProps {
  navigation: any;
}

const demoSteps = [
  {
    id: 1,
    title: 'Add Items Easily',
    description: 'Scan barcodes or search by name',
    icon: 'scan',
    mockUI: 'scanner',
  },
  {
    id: 2,
    title: 'Get Smart Alerts',
    description: 'Never let food expire again',
    icon: 'notifications',
    mockUI: 'notification',
  },
  {
    id: 3,
    title: 'Discover Recipes',
    description: 'Turn expiring ingredients into meals',
    icon: 'restaurant',
    mockUI: 'recipe',
  },
];

export default function DemoScreen({ navigation }: DemoScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeInOpacity = useRef(new Animated.Value(0)).current;
  const slideUpTransform = useRef(new Animated.Value(50)).current;
  const stepAnimation = useRef(new Animated.Value(0)).current;
  const enterTime = useRef(Date.now()).current;

  useEffect(() => {
    // Track screen view
    analytics.track('onboarding_demo_viewed', {
      timestamp: Date.now(),
      screen: 'demo'
    });

    startAnimations();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playDemo();
    }
  }, [isPlaying]);

  const startAnimations = () => {
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
  };

  const playDemo = async () => {
    analytics.track('onboarding_demo_started', {
      timestamp: Date.now(),
      screen: 'demo'
    });

    for (let i = 0; i < demoSteps.length; i++) {
      setCurrentStep(i);
      
      // Animate step transition
      stepAnimation.setValue(0);
      Animated.spring(stepAnimation, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Wait for step demonstration
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsPlaying(false);
    
    analytics.track('onboarding_demo_completed', {
      timestamp: Date.now(),
      screen: 'demo'
    });
  };

  const handleTryIt = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const timeSpent = Date.now() - enterTime;
    analytics.track('onboarding_demo_try_pressed', {
      timestamp: Date.now(),
      screen: 'demo',
      time_spent_seconds: Math.round(timeSpent / 1000),
      demo_completed: !isPlaying
    });

    navigation.navigate('AccountSetup');
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    analytics.track('onboarding_demo_back_pressed', {
      timestamp: Date.now(),
      screen: 'demo'
    });

    navigation.goBack();
  };

  const renderMockUI = (type: string) => {
    const scale = stepAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    const opacity = stepAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    switch (type) {
      case 'scanner':
        return (
          <Animated.View style={[styles.mockUI, { transform: [{ scale }], opacity }]}>
            <View style={styles.scannerFrame}>
              <View style={styles.scannerCorner} />
              <View style={[styles.scannerCorner, styles.topRight]} />
              <View style={[styles.scannerCorner, styles.bottomLeft]} />
              <View style={[styles.scannerCorner, styles.bottomRight]} />
              <View style={styles.scanLine} />
            </View>
            <Text style={styles.mockText}>Scanning barcode...</Text>
          </Animated.View>
        );
      
      case 'notification':
        return (
          <Animated.View style={[styles.mockUI, { transform: [{ scale }], opacity }]}>
            <View style={styles.notificationCard}>
              <Ionicons name="warning" size={24} color={designTokens.colors.alertAmber} />
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>Milk expires today!</Text>
                <Text style={styles.notificationText}>Use it before it goes bad</Text>
              </View>
            </View>
          </Animated.View>
        );
      
      case 'recipe':
        return (
          <Animated.View style={[styles.mockUI, { transform: [{ scale }], opacity }]}>
            <View style={styles.recipeCard}>
              <View style={styles.recipeImage} />
              <Text style={styles.recipeTitle}>Creamy Pasta</Text>
              <Text style={styles.recipeText}>Using: Milk, Pasta, Cheese</Text>
            </View>
          </Animated.View>
        );
      
      default:
        return null;
    }
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
          <Text style={styles.mainTitle}>See It In Action</Text>
          <Text style={styles.subtitle}>
            Watch how FridgeHero makes food management effortless
          </Text>
        </View>

        {/* Demo Area */}
        <View style={styles.demoArea}>
          {/* Step Indicators */}
          <View style={styles.stepIndicators}>
            {demoSteps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: index <= currentStep 
                      ? designTokens.colors.heroGreen 
                      : designTokens.colors.gray[300]
                  }
                ]}
              />
            ))}
          </View>

          {/* Current Step Display */}
          <View style={styles.stepDisplay}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: `${designTokens.colors.heroGreen}15` }]}>
                <Ionicons
                  name={demoSteps[currentStep]?.icon as any}
                  size={32}
                  color={designTokens.colors.heroGreen}
                />
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{demoSteps[currentStep]?.title}</Text>
                <Text style={styles.stepDescription}>{demoSteps[currentStep]?.description}</Text>
              </View>
            </View>

            {/* Mock UI */}
            <View style={styles.mockContainer}>
              {renderMockUI(demoSteps[currentStep]?.mockUI)}
            </View>
          </View>

          {/* Play Demo Button */}
          {!isPlaying && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setIsPlaying(true)}
              activeOpacity={0.9}
            >
              <Ionicons name="play" size={24} color={designTokens.colors.pureWhite} />
              <Text style={styles.playText}>Play Demo</Text>
            </TouchableOpacity>
          )}

          {isPlaying && (
            <View style={styles.playingIndicator}>
              <Animated.View
                style={[
                  styles.playingDot,
                  {
                    transform: [{
                      rotate: stepAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      })
                    }]
                  }
                ]}
              />
              <Text style={styles.playingText}>Demonstrating...</Text>
            </View>
          )}
        </View>

        {/* Try It Button */}
        <TouchableOpacity
          style={styles.tryButton}
          onPress={handleTryIt}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
            style={styles.buttonGradient}
          >
            <Text style={styles.tryText}>Try It Yourself!</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 10,
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  demoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  stepIndicators: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  stepDisplay: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 4,
    lineHeight: 26,
  },
  stepDescription: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    lineHeight: 22,
  },
  mockContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mockUI: {
    alignItems: 'center',
  },
  scannerFrame: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderColor: designTokens.colors.heroGreen,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scannerCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: designTokens.colors.heroGreen,
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    left: undefined,
    right: -2,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  bottomLeft: {
    top: undefined,
    bottom: -2,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    top: undefined,
    left: undefined,
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    width: '80%',
    height: 2,
    backgroundColor: designTokens.colors.heroGreen,
    opacity: 0.7,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.alertAmber,
    width: width * 0.85,
    maxWidth: 320,
  },
  notificationContent: {
    marginLeft: 12,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
  },
  recipeCard: {
    backgroundColor: designTokens.colors.pureWhite,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    width: width * 0.75,
    maxWidth: 280,
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${designTokens.colors.heroGreen}20`,
    marginBottom: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: 'Poppins',
    marginBottom: 6,
  },
  recipeText: {
    fontSize: 14,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  mockText: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.heroGreen,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 16,
  },
  playText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginLeft: 8,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  playingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: designTokens.colors.heroGreen,
    borderTopColor: 'transparent',
    marginRight: 12,
  },
  playingText: {
    fontSize: 16,
    color: designTokens.colors.gray[600],
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  tryButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 'auto',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  tryText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginRight: 8,
  },
}); 