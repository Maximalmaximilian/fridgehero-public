import React, { ReactNode } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

interface SubscriptionLoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showSpinner?: boolean;
}

/**
 * LoadingBoundary component that prevents subscription-dependent UI from rendering
 * until subscription status has been loaded at least once, eliminating flicker.
 */
export const SubscriptionLoadingBoundary: React.FC<SubscriptionLoadingBoundaryProps> = ({
  children,
  fallback,
  showSpinner = true,
}) => {
  const { loading } = useSubscription();
  const { theme } = useTheme();

  // If subscription is still loading, show loading state
  if (loading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showSpinner) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.bgPrimary }]}>
          <ActivityIndicator 
            size="large" 
            color={designTokens.colors.heroGreen} 
          />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading subscription status...
          </Text>
        </View>
      );
    }

    // Return minimal placeholder without spinner
    return (
      <View style={[styles.minimumContainer, { backgroundColor: theme.bgPrimary }]} />
    );
  }

  // Subscription is ready, render children
  return <>{children}</>;
};

/**
 * Higher-order component version for wrapping screens
 */
export function withSubscriptionBoundary<P extends object>(
  Component: React.ComponentType<P>,
  loadingProps?: Partial<SubscriptionLoadingBoundaryProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <SubscriptionLoadingBoundary {...loadingProps}>
        <Component {...props} />
      </SubscriptionLoadingBoundary>
    );
  };
}

/**
 * Conditional render component that waits for subscription status
 */
interface ConditionalPremiumProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiresPremium?: boolean;
  feature?: string;
}

export const ConditionalPremium: React.FC<ConditionalPremiumProps> = ({
  children,
  fallback,
  requiresPremium = false,
  feature,
}) => {
  const { loading, isPremium, checkFeatureAccess } = useSubscription();
  
  if (loading) {
    return null; // Don't render anything until subscription status is loaded
  }

  const hasAccess = feature 
    ? checkFeatureAccess(feature)
    : requiresPremium 
      ? isPremium 
      : true;

  if (!hasAccess && fallback) {
    return <>{fallback}</>;
  }

  return hasAccess ? <>{children}</> : null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  minimumContainer: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
}); 