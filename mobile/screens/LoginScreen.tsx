import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { designTokens } from '../constants/DesignTokens';
import * as Haptics from 'expo-haptics';

interface LoginScreenProps {
  navigation?: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading('google');
    const { error } = await signInWithGoogle();
    setOauthLoading(null);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    }
  };

  const handleAppleSignIn = async () => {
    setOauthLoading('apple');
    const { error } = await signInWithApple();
    setOauthLoading(null);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to sign in with Apple');
    }
  };

  const renderOAuthButton = (
    provider: 'google' | 'apple',
    onPress: () => void,
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    backgroundColor: string,
    textColor: string
  ) => (
    <TouchableOpacity
      style={[styles.oauthButton, { backgroundColor }]}
      onPress={onPress}
      disabled={oauthLoading !== null}
    >
      <View style={styles.oauthButtonContent}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={textColor} 
          style={styles.oauthIcon} 
        />
        <Text style={[styles.oauthButtonText, { color: textColor }]}>
          {oauthLoading === provider ? 'Connecting...' : label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={[designTokens.colors.green[50], designTokens.colors.pureWhite]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[designTokens.colors.heroGreen, designTokens.colors.green[600]]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="leaf" size={32} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>FridgeHero</Text>
            <Text style={styles.tagline}>Save food. Save money. Save the planet.</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.8)']}
              style={styles.formGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>
                Ready to rescue some food?
              </Text>

              {/* OAuth Buttons */}
              <View style={styles.oauthContainer}>
                {renderOAuthButton(
                  'google',
                  handleGoogleSignIn,
                  'logo-google',
                  'Continue with Google',
                  designTokens.colors.pureWhite,
                  designTokens.colors.deepCharcoal
                )}
                
                {Platform.OS === 'ios' && renderOAuthButton(
                  'apple',
                  handleAppleSignIn,
                  'logo-apple',
                  'Continue with Apple',
                  designTokens.colors.deepCharcoal,
                  designTokens.colors.pureWhite
                )}
              </View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={designTokens.colors.gray[400]}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={designTokens.colors.gray[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={designTokens.colors.gray[400]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="password"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading 
                    ? [designTokens.colors.gray[400], designTokens.colors.gray[500]]
                    : [designTokens.colors.heroGreen, designTokens.colors.green[600]]
                  }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.buttonText}>Loading...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <Ionicons name="scan-outline" size={24} color={designTokens.colors.heroGreen} />
              <Text style={styles.featureText}>Scan barcodes</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="time-outline" size={24} color={designTokens.colors.alertAmber} />
              <Text style={styles.featureText}>Track expiry</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="restaurant-outline" size={24} color={designTokens.colors.ocean} />
              <Text style={styles.featureText}>Get recipes</Text>
            </View>
          </View>

          {/* New here? Button */}
          <TouchableOpacity
            style={styles.newHereButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (navigation) {
                navigation.navigate('Onboarding');
              } else {
                Alert.alert('Navigation Error', 'Unable to navigate to onboarding. Please restart the app.');
              }
            }}
          >
                       <Text style={styles.newHereButtonText}>New here? Get started!</Text>
           </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.lg,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: designTokens.spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  logoContainer: {
    marginBottom: designTokens.spacing.md,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  appName: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: '700',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    marginBottom: designTokens.spacing.xs,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize['2xl'] * 1.2,
  },
  tagline: {
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: designTokens.typography.fontSize.sm * 1.3,
  },
  formContainer: {
    marginBottom: designTokens.spacing.md,
  },
  formGradient: {
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  formTitle: {
    fontSize: designTokens.typography.fontSize.xl,
    fontWeight: '600',
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.display,
    textAlign: 'center',
    marginBottom: designTokens.spacing.xs,
    lineHeight: designTokens.typography.fontSize.xl * 1.2,
  },
  formSubtitle: {
    fontSize: designTokens.typography.fontSize.sm,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
    lineHeight: designTokens.typography.fontSize.sm * 1.3,
  },
  oauthContainer: {
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },
  oauthButton: {
    borderRadius: designTokens.borderRadius.md,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  oauthButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  oauthIcon: {
    marginRight: designTokens.spacing.sm,
  },
  oauthButtonText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: '500',
    fontFamily: designTokens.typography.primary,
    lineHeight: designTokens.typography.fontSize.sm * 1.2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: designTokens.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designTokens.colors.gray[200],
  },
  dividerText: {
    marginHorizontal: designTokens.spacing.sm,
    color: designTokens.colors.gray[400],
    fontSize: designTokens.typography.fontSize.xs,
    fontFamily: designTokens.typography.primary,
  },
  inputContainer: {
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    paddingHorizontal: designTokens.spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: designTokens.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: designTokens.typography.fontSize.base,
    color: designTokens.colors.deepCharcoal,
    fontFamily: designTokens.typography.primary,
    paddingVertical: designTokens.spacing.sm,
    lineHeight: designTokens.typography.fontSize.base * 1.2,
  },
  primaryButton: {
    borderRadius: designTokens.borderRadius.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: designTokens.colors.heroGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: designTokens.spacing.md,
  },
  buttonDisabled: {
    elevation: 1,
    shadowOpacity: 0.08,
  },
  buttonGradient: {
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
    fontFamily: designTokens.typography.primary,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  featureItem: {
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  featureText: {
    fontSize: designTokens.typography.fontSize.xs,
    color: designTokens.colors.gray[600],
    fontFamily: designTokens.typography.primary,
    textAlign: 'center',
    lineHeight: designTokens.typography.fontSize.xs * 1.3,
  },
  newHereButton: {
    borderRadius: designTokens.borderRadius.md,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    backgroundColor: `${designTokens.colors.heroGreen}15`,
    borderWidth: 1,
    borderColor: `${designTokens.colors.heroGreen}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: designTokens.spacing.sm,
  },
  newHereButtonText: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: '500',
    color: designTokens.colors.heroGreen,
    fontFamily: designTokens.typography.primary,
    lineHeight: designTokens.typography.fontSize.sm * 1.2,
  },
}); 