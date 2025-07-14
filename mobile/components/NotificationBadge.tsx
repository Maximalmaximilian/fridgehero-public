import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designTokens } from '../constants/DesignTokens';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  showZero?: boolean;
  style?: any;
}

export default function NotificationBadge({ 
  count, 
  size = 'medium', 
  showZero = false,
  style 
}: NotificationBadgeProps) {
  if (!showZero && count === 0) {
    return null;
  }

  const badgeSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size];

  const fontSize = {
    small: 10,
    medium: 12,
    large: 14,
  }[size];

  return (
    <View style={[
      styles.badge,
      {
        width: badgeSize,
        height: badgeSize,
        borderRadius: badgeSize / 2,
        minWidth: badgeSize,
      },
      style
    ]}>
      <Text style={[
        styles.badgeText,
        { fontSize }
      ]}>
        {count > 99 ? '99+' : count.toString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: designTokens.colors.expiredRed,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontWeight: '700',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 16,
  },
}); 