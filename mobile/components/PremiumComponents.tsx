import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../contexts/OptimizedSubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';

// Base Premium wrapper component
interface PremiumOnlyProps {
  children: ReactNode;
  feature?: string;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
  upgradeMessage?: string;
}

export const PremiumOnly: React.FC<PremiumOnlyProps> = ({
  children,
  feature,
  fallback,
  showUpgrade = true,
  onUpgrade,
  upgradeMessage,
}) => {
  const { isPremium, checkFeatureAccess, handlePremiumFeatureAccess } = useSubscription();
  
  const hasAccess = feature ? checkFeatureAccess(feature) : isPremium;
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showUpgrade) {
    return (
      <LockedFeatureNotice
        message={upgradeMessage || 'This feature requires Premium'}
        onUpgrade={onUpgrade}
        feature={feature}
      />
    );
  }
  
  return null;
};

// Locked feature notice component
interface LockedFeatureNoticeProps {
  message: string;
  onUpgrade?: () => void;
  feature?: string;
  style?: ViewStyle;
  compact?: boolean;
  showIcon?: boolean;
}

export const LockedFeatureNotice: React.FC<LockedFeatureNoticeProps> = ({
  message,
  onUpgrade,
  feature,
  style,
  compact = false,
  showIcon = true,
}) => {
  const { handlePremiumFeatureAccess } = useSubscription();
  const { theme } = useTheme();
  
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else if (feature) {
      handlePremiumFeatureAccess(feature, onUpgrade);
    } else {
      handlePremiumFeatureAccess('Premium Feature', onUpgrade);
    }
  };
  
  return (
    <View style={[compact ? styles.lockedNoticeCompact : styles.lockedNotice, style]}>
      <LinearGradient
        colors={[designTokens.colors.amber[50], designTokens.colors.amber[100]]}
        style={styles.lockedNoticeGradient}
      >
        <View style={styles.lockedNoticeContent}>
          {showIcon && (
            <View style={styles.lockedIcon}>
              <Ionicons name="lock-closed" size={20} color={designTokens.colors.amber[600]} />
            </View>
          )}
          <View style={styles.lockedTextContainer}>
            <Text style={[styles.lockedMessage, { color: designTokens.colors.amber[800] }]}>
              {message}
            </Text>
            {!compact && (
              <Text style={[styles.lockedSubtitle, { color: designTokens.colors.amber[700] }]}>
                Upgrade to unlock this feature
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
          <Text style={styles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

// Premium gate for buttons
interface PremiumButtonProps {
  children: ReactNode;
  onPress: () => void;
  feature?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  lockIcon?: boolean;
  disabled?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  onPress,
  feature,
  style,
  textStyle,
  lockIcon = true,
  disabled = false,
}) => {
  const { checkFeatureAccess, handlePremiumFeatureAccess } = useSubscription();
  const { theme } = useTheme();
  
  const hasAccess = feature ? checkFeatureAccess(feature) : true;
  const isDisabled = disabled || !hasAccess;
  
  const handlePress = () => {
    if (!hasAccess) {
      handlePremiumFeatureAccess(feature || 'Premium Feature');
    } else {
      onPress();
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        style,
        isDisabled && { opacity: 0.6 },
        !hasAccess && styles.premiumButtonLocked,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <View style={styles.premiumButtonContent}>
        {!hasAccess && lockIcon && (
          <Ionicons 
            name="lock-closed" 
            size={16} 
            color={designTokens.colors.amber[600]} 
            style={styles.lockIconInButton}
          />
        )}
        {typeof children === 'string' ? (
          <Text style={[textStyle, !hasAccess && styles.lockedButtonText]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </TouchableOpacity>
  );
};

// Feature limitation banner
interface FeatureLimitBannerProps {
  currentUsage: number;
  limit: number;
  feature: string;
  onUpgrade?: () => void;
  style?: ViewStyle;
}

export const FeatureLimitBanner: React.FC<FeatureLimitBannerProps> = ({
  currentUsage,
  limit,
  feature,
  onUpgrade,
  style,
}) => {
  const { isPremium } = useSubscription();
  const percentage = (currentUsage / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = currentUsage >= limit;
  
  if (isPremium || currentUsage === 0) return null;
  
  return (
    <View style={[styles.limitBanner, style]}>
      <View style={styles.limitBannerHeader}>
        <View style={styles.limitBannerInfo}>
          <Text style={styles.limitBannerTitle}>
            {feature} Usage
          </Text>
          <Text style={[
            styles.limitBannerUsage,
            { color: isAtLimit ? designTokens.colors.expiredRed : designTokens.colors.amber[700] }
          ]}>
            {currentUsage} / {limit}
          </Text>
        </View>
        {isNearLimit && (
          <Ionicons 
            name={isAtLimit ? "warning" : "alert-circle"} 
            size={20} 
            color={isAtLimit ? designTokens.colors.expiredRed : designTokens.colors.amber[600]}
          />
        )}
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill,
              { 
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: isAtLimit 
                  ? designTokens.colors.expiredRed 
                  : isNearLimit 
                    ? designTokens.colors.amber[500]
                    : designTokens.colors.heroGreen,
              }
            ]} 
          />
        </View>
      </View>
      
      {isNearLimit && (
        <View style={styles.limitBannerActions}>
          <Text style={styles.limitBannerMessage}>
            {isAtLimit 
              ? `You've reached your ${feature.toLowerCase()} limit` 
              : `You're near your ${feature.toLowerCase()} limit`}
          </Text>
          <TouchableOpacity style={styles.upgradeLink} onPress={onUpgrade}>
            <Text style={styles.upgradeLinkText}>Upgrade for unlimited</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Premium tooltip component
interface PremiumTooltipProps {
  feature: string;
  description: string;
  children: ReactNode;
  onUpgrade?: () => void;
}

export const PremiumTooltip: React.FC<PremiumTooltipProps> = ({
  feature,
  description,
  children,
  onUpgrade,
}) => {
  const { checkFeatureAccess, handlePremiumFeatureAccess } = useSubscription();
  
  const hasAccess = checkFeatureAccess(feature);
  
  const showTooltip = () => {
    Alert.alert(
      `🔒 ${feature}`,
      description,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade to Premium',
          onPress: () => handlePremiumFeatureAccess(feature, onUpgrade),
        },
      ]
    );
  };
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return (
    <TouchableOpacity onPress={showTooltip} style={styles.tooltipContainer}>
      <View style={styles.lockedOverlay}>
        {children}
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color={designTokens.colors.pureWhite} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Premium upgrade card
interface PremiumUpgradeCardProps {
  title: string;
  subtitle?: string;
  features: string[];
  onUpgrade: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export const PremiumUpgradeCard: React.FC<PremiumUpgradeCardProps> = ({
  title,
  subtitle,
  features,
  onUpgrade,
  style,
  compact = false,
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.upgradeCard, style]}>
      <LinearGradient
        colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
        style={styles.upgradeCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.upgradeCardHeader}>
          <Ionicons name="star" size={24} color={designTokens.colors.pureWhite} />
          <Text style={styles.upgradeCardTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.upgradeCardSubtitle}>{subtitle}</Text>
          )}
        </View>
        
        {!compact && features.length > 0 && (
          <View style={styles.upgradeCardFeatures}>
            {features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.upgradeCardFeature}>
                <Ionicons name="checkmark" size={16} color={designTokens.colors.pureWhite} />
                <Text style={styles.upgradeCardFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
        
        <TouchableOpacity style={styles.upgradeCardButton} onPress={onUpgrade}>
          <Text style={styles.upgradeCardButtonText}>
            {compact ? 'Upgrade' : 'Start Free Trial'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  // Locked Feature Notice
  lockedNotice: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  lockedNoticeCompact: {
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  lockedNoticeGradient: {
    padding: 12,
  },
  lockedNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.amber[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lockedTextContainer: {
    flex: 1,
  },
  lockedMessage: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  lockedSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: designTokens.colors.amber[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: designTokens.colors.pureWhite,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  
  // Premium Button
  premiumButtonLocked: {
    borderWidth: 1,
    borderColor: designTokens.colors.amber[300],
    backgroundColor: designTokens.colors.amber[50],
  },
  premiumButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconInButton: {
    marginRight: 6,
  },
  lockedButtonText: {
    color: designTokens.colors.amber[700],
  },
  
  // Feature Limit Banner
  limitBanner: {
    backgroundColor: designTokens.colors.amber[50],
    borderWidth: 1,
    borderColor: designTokens.colors.amber[200],
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  limitBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitBannerInfo: {
    flex: 1,
  },
  limitBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.amber[800],
    fontFamily: 'Inter',
  },
  limitBannerUsage: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: designTokens.colors.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  limitBannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitBannerMessage: {
    fontSize: 12,
    color: designTokens.colors.amber[700],
    fontFamily: 'Inter',
    flex: 1,
  },
  upgradeLink: {
    marginLeft: 8,
  },
  upgradeLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
  },
  
  // Premium Tooltip
  tooltipContainer: {
    position: 'relative',
  },
  lockedOverlay: {
    position: 'relative',
    opacity: 0.6,
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: designTokens.colors.amber[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Premium Upgrade Card
  upgradeCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  upgradeCardGradient: {
    padding: 20,
  },
  upgradeCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.pureWhite,
    fontFamily: 'Poppins',
    marginTop: 8,
  },
  upgradeCardSubtitle: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.9,
  },
  upgradeCardFeatures: {
    marginBottom: 16,
  },
  upgradeCardFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradeCardFeatureText: {
    fontSize: 14,
    color: designTokens.colors.pureWhite,
    fontFamily: 'Inter',
    marginLeft: 8,
  },
  upgradeCardButton: {
    backgroundColor: designTokens.colors.pureWhite,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeCardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.heroGreen,
    fontFamily: 'Inter',
  },
}); 