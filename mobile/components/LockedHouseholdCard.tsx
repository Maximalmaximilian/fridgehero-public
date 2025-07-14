import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '../constants/DesignTokens';
import { useTheme } from '../contexts/ThemeContext';

interface LockedHouseholdCardProps {
  household: {
    id: string;
    name: string;
    member_count?: number;
    role: string;
  };
  onUnlock: () => void;
  onActivate: () => void;
  animationValue?: Animated.Value;
}

export default function LockedHouseholdCard({
  household,
  onUnlock,
  onActivate,
  animationValue = new Animated.Value(0.3),
}: LockedHouseholdCardProps) {
  const { theme } = useTheme();

  return (
    <Animated.View style={[styles.container, { opacity: animationValue }]}>
      {/* Locked overlay gradient */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.1)',
          'rgba(0, 0, 0, 0.3)',
          'rgba(0, 0, 0, 0.1)',
        ]}
        style={styles.lockedOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        {/* Lock icon and status */}
        <View style={styles.lockHeader}>
          <View style={styles.lockIconContainer}>
            <Ionicons 
              name="lock-closed" 
              size={20} 
              color={designTokens.colors.amber[600]} 
            />
          </View>
          <View style={styles.lockTextContainer}>
            <Text style={[styles.lockedText, { color: theme.textSecondary }]}>
              Locked (Free Plan)
            </Text>
            <Text style={[styles.upgradeText, { color: designTokens.colors.amber[600] }]}>
              Upgrade to access
            </Text>
          </View>
        </View>

        {/* Household info */}
        <View style={styles.householdInfo}>
          <Text style={[styles.householdName, { color: theme.textPrimary }]} numberOfLines={1}>
            {household.name}
          </Text>
          <View style={styles.householdMeta}>
            <View style={styles.metaItem}>
              <Ionicons 
                name="people" 
                size={14} 
                color={theme.textSecondary} 
              />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {household.member_count || 1} member{(household.member_count || 1) !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons 
                name={household.role === 'owner' ? 'star' : 'person'} 
                size={14} 
                color={household.role === 'owner' ? designTokens.colors.amber[600] : theme.textSecondary} 
              />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {household.role === 'owner' ? 'Owner' : 'Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.activateButton, { backgroundColor: theme.bgSecondary }]}
            onPress={onActivate}
            activeOpacity={0.7}
          >
            <Text style={[styles.activateButtonText, { color: theme.textPrimary }]}>
              Make Active
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.unlockButton}
            onPress={onUnlock}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[designTokens.colors.heroGreen, designTokens.colors.primary[600]]}
              style={styles.unlockButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="star" size={14} color={designTokens.colors.pureWhite} />
              <Text style={styles.unlockButtonText}>
                Unlock
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Premium feature indicator */}
        <View style={styles.premiumIndicator}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color={designTokens.colors.amber[600]} />
            <Text style={styles.premiumBadgeText}>
              Premium Feature
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    borderRadius: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designTokens.colors.gray[200],
    ...designTokens.shadows.sm,
  },
  lockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.colors.amber[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lockTextContainer: {
    flex: 1,
  },
  lockedText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  householdInfo: {
    marginBottom: 16,
  },
  householdName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  householdMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  activateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designTokens.colors.gray[300],
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  unlockButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  unlockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  unlockButtonText: {
    color: designTokens.colors.pureWhite,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  premiumIndicator: {
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.amber[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    color: designTokens.colors.amber[700],
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
}); 