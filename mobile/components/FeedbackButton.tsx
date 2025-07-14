import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { designTokens } from '../constants/DesignTokens';
import type { FeedbackType } from './FeedbackModal';

interface FeedbackButtonProps {
  onPress: (type?: FeedbackType) => void;
  type?: FeedbackType;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: any;
}

export default function FeedbackButton({
  onPress,
  type,
  variant = 'primary',
  size = 'medium',
  title = 'Give Feedback',
  subtitle,
  icon = 'chatbubble',
  style,
}: FeedbackButtonProps) {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: designTokens.colors.heroGreen,
          borderColor: designTokens.colors.heroGreen,
        };
      case 'secondary':
        return {
          backgroundColor: theme.cardBackground,
          borderColor: theme.borderPrimary,
        };
      case 'minimal':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: designTokens.colors.heroGreen,
          borderColor: designTokens.colors.heroGreen,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 12,
        };
      case 'medium':
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 20,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'primary') {
      return designTokens.colors.pureWhite;
    }
    return theme.textPrimary;
  };

  const getIconColor = () => {
    if (variant === 'primary') {
      return designTokens.colors.pureWhite;
    }
    return designTokens.colors.heroGreen;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        style,
      ]}
      onPress={() => onPress(type)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={icon} 
        size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
        color={getIconColor()} 
        style={styles.icon} 
      />
      <Text style={[styles.title, { color: getTextColor() }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    marginTop: 2,
  },
}); 